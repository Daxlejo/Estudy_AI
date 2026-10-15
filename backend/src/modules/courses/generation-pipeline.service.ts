import { Inject, Injectable, Logger } from '@nestjs/common';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { QuizRepository } from '../../domain/repositories/quiz.repository';
import { FinalExamRepository } from '../../domain/repositories/final-exam.repository';
import { FinalExamQuestionPayload } from '../../domain/models/final-exam';
import { MaterialsService } from '../materials/materials.service';
import { AiService } from '../ai/ai.service';
import {
  aiConceptsResponseSchema,
  aiSessionPlanResponseSchema,
  aiSessionQuizResponseSchema,
  aiFinalExamResponseSchema,
  AiExtractedConcept,
  AiSession,
} from './dto/ai-course-plan.dto';

/**
 * Orchestrates the full AI-driven course-generation pipeline for a given
 * GenerationJob.  Must be called via setImmediate / fire-and-forget so the
 * HTTP response returns before the pipeline starts.
 *
 * Pipeline steps (matching GenerationJobStatus values):
 *   PENDING → EXTRACTING → ANALYZING_CONCEPTS → ANALYZING_DEPENDENCIES
 *           → BUILDING_PATH → COMPLETED | ERROR
 */
@Injectable()
export class GenerationPipelineService {
  private readonly logger = new Logger(GenerationPipelineService.name);

  constructor(
    @Inject('CourseRepository')
    private readonly courseRepository: CourseRepository,
    @Inject('SessionRepository')
    private readonly sessionRepository: SessionRepository,
    @Inject('QuizRepository')
    private readonly quizRepository: QuizRepository,
    @Inject('FinalExamRepository')
    private readonly finalExamRepository: FinalExamRepository,
    private readonly materialsService: MaterialsService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Entry point.  Updates job status/progress at each step and persists all
   * generated artefacts.  On any error the job is marked ERROR, the course
   * status reverted to ERROR, and partially persisted entities rolled back.
   */
  async run(
    courseId: string,
    jobId: string,
    materialIds?: string[],
  ): Promise<void> {
    this.logger.log(`Pipeline started (course=${courseId}, job=${jobId})`);
    const createdSessionIds: string[] = [];
    let createdExamId: string | null = null;

    try {
      const course = await this.courseRepository.findById(courseId);
      if (!course) {
        throw new Error(`Course with id ${courseId} not found`);
      }

      // ── Step 0: EXTRACTING ───────────────────────────────────────────────
      await this.updateJob(jobId, 'EXTRACTING', 0, 0);

      const extracted = await this.materialsService.getExtractedMaterials(
        courseId,
        materialIds,
      );

      if (extracted.length === 0) {
        throw new Error(
          'No study materials found for this course. ' +
            'Please upload at least one .txt or .md file before generating.',
        );
      }

      const combinedText = extracted
        .map((m) => `=== ${m.name} ===\n${m.text}`)
        .join('\n\n');

      await this.updateJob(jobId, 'EXTRACTING', 10, 0);

      // ── Step 1: ANALYZING_CONCEPTS ───────────────────────────────────────
      await this.updateJob(jobId, 'ANALYZING_CONCEPTS', 20, 1);

      const rawConceptsData = await this.aiService.completeJson<unknown>(
        this.systemPromptConcepts(),
        this.userMessageConcepts(combinedText),
      );

      const conceptsValidation =
        aiConceptsResponseSchema.safeParse(rawConceptsData);
      if (!conceptsValidation.success) {
        const issues = conceptsValidation.error.issues
          .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
          .join('; ');
        throw new Error(`AI generated invalid concepts response: ${issues}`);
      }
      const rawConcepts = conceptsValidation.data.concepts;
      const generatedSummary = conceptsValidation.data.courseSummary;

      if (generatedSummary) {
        const currentCourse = await this.courseRepository.findById(courseId);
        const isGeneric =
          !currentCourse?.description ||
          currentCourse.description.trim() === '' ||
          currentCourse.description ===
            'Curso estructurado por EstudyAI a partir de materiales de estudio.';
        if (isGeneric) {
          await this.courseRepository.update(courseId, {
            description: generatedSummary,
          });
        }
      }

      await this.updateJob(jobId, 'ANALYZING_CONCEPTS', 40, 1);

      // ── Step 2: ANALYZING_DEPENDENCIES → session grouping ────────────────
      await this.updateJob(jobId, 'ANALYZING_DEPENDENCIES', 50, 2);

      const rawSessionsData = await this.aiService.completeJson<unknown>(
        this.systemPromptSessions(),
        this.userMessageSessions(rawConcepts, combinedText),
      );

      const sessionsValidation =
        aiSessionPlanResponseSchema.safeParse(rawSessionsData);
      if (!sessionsValidation.success) {
        const issues = sessionsValidation.error.issues
          .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
          .join('; ');
        throw new Error(`AI generated invalid session plan: ${issues}`);
      }
      const rawSessions = sessionsValidation.data.sessions;
      this.validateSessions(rawSessions, rawConcepts);

      await this.updateJob(jobId, 'ANALYZING_DEPENDENCIES', 60, 2);

      // ── Step 3: BUILDING_PATH → persist sessions + concepts + quizzes ────
      await this.updateJob(jobId, 'BUILDING_PATH', 65, 3);

      // Map concept name → persisted Concept id
      const conceptIdByName = new Map<string, string>();

      for (const rawSession of rawSessions) {
        // Persist session
        const session = await this.sessionRepository.create({
          courseId,
          sequenceOrder: rawSession.sequenceOrder,
          title: rawSession.title,
          learningObjective: rawSession.learningObjective,
          durationMinutes: rawSession.durationMinutes,
          xpReward: rawSession.xpReward,
          isUnlocked: rawSession.sequenceOrder === 1, // first session unlocked
          introTitle: rawSession.introTitle,
          introContent: rawSession.introContent,
          introKeyTakeaway: rawSession.introKeyTakeaway,
          introCodeSnippet: rawSession.introCodeSnippet ?? null,
          guidedPractice: rawSession.guidedPractice,
          challenge: rawSession.challenge,
        });
        createdSessionIds.push(session.id);

        // Persist concepts for this session
        const sessionConcepts: AiExtractedConcept[] = (
          rawSession.conceptNames ?? []
        )
          .map((name) => rawConcepts.find((c) => c.name === name))
          .filter((c): c is AiExtractedConcept => c !== undefined);

        for (const rawConcept of sessionConcepts) {
          const concept = await this.sessionRepository.addConcept({
            sessionId: session.id,
            name: rawConcept.name,
            summary: rawConcept.summary,
            detail: rawConcept.detail,
            example: rawConcept.example ?? null,
          });
          conceptIdByName.set(rawConcept.name, concept.id);
        }

        // Generate quiz for this session
        if (sessionConcepts.length > 0) {
          const rawQuizData = await this.aiService.completeJson<unknown>(
            this.systemPromptQuiz(),
            this.userMessageQuiz(rawSession, sessionConcepts),
          );

          const quizValidation =
            aiSessionQuizResponseSchema.safeParse(rawQuizData);
          if (!quizValidation.success) {
            const issues = quizValidation.error.issues
              .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
              .join('; ');
            throw new Error(
              `AI generated invalid quiz for session "${rawSession.title}": ${issues}`,
            );
          }
          const rawQuiz = quizValidation.data;

          const quiz = await this.quizRepository.create({
            sessionId: session.id,
            passingThreshold: rawQuiz.passingThreshold ?? 70,
            xpReward: 100,
          });

          for (const rawQ of rawQuiz.questions ?? []) {
            const conceptId = conceptIdByName.get(rawQ.conceptName);
            if (!conceptId) continue; // skip questions for unknown concepts
            await this.quizRepository.addQuestion({
              quizId: quiz.id,
              conceptId,
              prompt: rawQ.prompt,
              context: rawQ.context ?? null,
              options: rawQ.options,
              explanation: rawQ.explanation,
            });
          }
        }
      }

      await this.updateJob(jobId, 'BUILDING_PATH', 85, 3);

      // ── Step 4: Generate final exam ───────────────────────────────────────
      const allConcepts = rawConcepts.filter((c) =>
        conceptIdByName.has(c.name),
      );

      if (allConcepts.length > 0) {
        const rawExamData = await this.aiService.completeJson<unknown>(
          this.systemPromptFinalExam(),
          this.userMessageFinalExam(allConcepts),
        );

        const examValidation = aiFinalExamResponseSchema.safeParse(rawExamData);
        if (!examValidation.success) {
          const issues = examValidation.error.issues
            .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
            .join('; ');
          throw new Error(`AI generated invalid final exam: ${issues}`);
        }
        const rawExam = examValidation.data;

        const exam = await this.finalExamRepository.create({
          courseId,
          passingScorePct: rawExam.passingScorePct ?? 70,
          estimatedMinutes: rawExam.estimatedMinutes ?? 30,
          cooldownUntil: null,
        });
        createdExamId = exam.id;

        for (const rawQ of rawExam.questions ?? []) {
          const conceptId = conceptIdByName.get(rawQ.conceptName);
          if (!conceptId) continue;
          await this.finalExamRepository.addQuestion({
            examId: exam.id,
            conceptId,
            type: rawQ.type,
            prompt: rawQ.prompt,
            context: rawQ.context ?? null,
            payload: rawQ.payload as FinalExamQuestionPayload,
            explanation: rawQ.explanation,
          });
        }
      }

      // ── Finish ────────────────────────────────────────────────────────────
      await this.updateJob(jobId, 'COMPLETED', 100, 4);
      await this.courseRepository.update(courseId, { status: 'READY' });
      this.logger.log(`Pipeline completed (course=${courseId}, job=${jobId})`);
    } catch (error) {
      // Rollback partially created entities on failure
      if (createdExamId) {
        await this.finalExamRepository.delete(createdExamId).catch(() => {});
      }
      for (const sId of createdSessionIds) {
        await this.sessionRepository.delete(sId).catch(() => {});
      }

      const rawMessage = error instanceof Error ? error.message : String(error);
      const sanitized = this.sanitizeErrorMessage(rawMessage);
      this.logger.error(
        `Pipeline failed (course=${courseId}, job=${jobId}): ${sanitized}`,
      );
      await this.courseRepository
        .updateGenerationJob(jobId, {
          status: 'ERROR',
          errorMessage: sanitized,
        })
        .catch(() => {});
      await this.courseRepository
        .update(courseId, { status: 'ERROR' })
        .catch(() => {});
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async updateJob(
    jobId: string,
    status: string,
    progress: number,
    currentStepIndex: number,
  ): Promise<void> {
    await this.courseRepository.updateGenerationJob(jobId, {
      status: status as any,
      progress,
      currentStepIndex,
    });
  }

  private sanitizeErrorMessage(msg: string): string {
    return msg
      .replace(/sk-[a-zA-Z0-9_\-]{20,}/g, '[REDACTED_API_KEY]')
      .replace(/Bearer\s+[a-zA-Z0-9_\.\-]+/gi, 'Bearer [REDACTED]')
      .replace(/AI_KEY=[^\s&]+/gi, 'AI_KEY=[REDACTED]');
  }

  private validateSessions(
    sessions: AiSession[],
    concepts: AiExtractedConcept[],
  ): void {
    if (sessions.length === 0) {
      throw new Error('AI returned no sessions from the session plan.');
    }
    const conceptNames = new Set(concepts.map((c) => c.name));
    for (const s of sessions) {
      for (const name of s.conceptNames ?? []) {
        if (!conceptNames.has(name)) {
          this.logger.warn(
            `Session "${s.title}" references unknown concept "${name}" — skipped`,
          );
        }
      }
    }
  }

  // ── Prompt builders ───────────────────────────────────────────────────────

  private systemPromptConcepts(): string {
    return `You are an expert academic curriculum designer.
Your task is to analyze the provided study material and extract:
1. A concise (1-2 sentences) course summary capturing the essence and key topics of the material (e.g., "Curso estructurado de Programación Orientada a Objetos enfocado en clases, objetos, encapsulamiento, herencia y polimorfismo.").
2. The key concepts from the material.
Return ONLY a JSON object with two keys:
  "courseSummary": a string with the 1-2 sentence overview of the course based on the material,
  "concepts": an array of concept objects.
Each concept must have: name (string ≤80 chars), summary (one sentence), detail (1-2 paragraphs), example (optional string).
Extract between 5 and 30 concepts. Focus on the most important ideas.`;
  }

  private userMessageConcepts(text: string): string {
    const maxChars = 20000;
    const truncated =
      text.length > maxChars
        ? text.slice(0, maxChars) + '\n\n[...text truncated...]'
        : text;
    return `Study material:\n\n${truncated}`;
  }

  private systemPromptSessions(): string {
    return `You are an expert academic curriculum designer.
Given a list of concepts extracted from study material, organize them into logical learning sessions.
Return ONLY a JSON object with key "sessions" containing an array of session objects.
Each session must have:
  sequenceOrder (integer starting at 1), title, learningObjective, durationMinutes (10-60),
  xpReward (50 or 100), introTitle, introContent (2-3 paragraphs), introKeyTakeaway (1 sentence),
  introCodeSnippet (optional markdown code block),
  guidedPractice (1-2 paragraphs with a concrete, step-by-step practical exercise directly applying the session concepts from the material),
  challenge (1 paragraph posing a specific conceptual or coding challenge that requires synthesizing the session concepts),
  conceptNames (array of concept names from the provided list).
Create between 3 and 8 sessions. Every concept must appear in exactly one session. Do not use placeholder or generic text.`;
  }

  private userMessageSessions(
    concepts: AiExtractedConcept[],
    studyText: string,
  ): string {
    const conceptList = concepts
      .map((c) => `- ${c.name}: ${c.summary}`)
      .join('\n');
    const maxChars = 8000;
    const truncated =
      studyText.length > maxChars
        ? studyText.slice(0, maxChars) + '\n\n[...truncated...]'
        : studyText;
    return `Concepts to organize:\n${conceptList}\n\nOriginal material context:\n${truncated}`;
  }

  private systemPromptQuiz(): string {
    return `You are an academic quiz designer.
Create a high-quality multiple-choice quiz for the provided learning session.
Return ONLY a JSON object with:
  passingThreshold (integer 60-80, percentage needed to pass),
  questions (array of question objects).
Each question must have:
  conceptName (must match one of the provided concept names),
  prompt (the question text),
  context (optional short excerpt or code snippet),
  options (array of 4 options with {id: string, text: string, isCorrect: boolean} — exactly one isCorrect=true),
  explanation (why the correct answer is right).
Quality requirements for options:
  - Exactly one option must be clearly correct based on the provided material.
  - Exactly three options must be plausible but incorrect distractors related to the topic.
  - Do NOT include generic filler options, random noise, or answers unrelated to the concept being tested.
Create 3-5 questions, one per concept if possible.`;
  }

  private userMessageQuiz(
    session: AiSession,
    concepts: AiExtractedConcept[],
  ): string {
    const conceptDetails = concepts
      .map(
        (c) => `Concept: ${c.name}\nSummary: ${c.summary}\nDetail: ${c.detail}`,
      )
      .join('\n\n');
    return `Session: "${session.title}"\nLearning objective: ${session.learningObjective}\n\nConcepts to test:\n${conceptDetails}`;
  }

  private systemPromptFinalExam(): string {
    return `You are an academic exam designer.
Create a final exam covering all the provided concepts.
Return ONLY a JSON object with:
  estimatedMinutes (integer, 20-60),
  passingScorePct (integer, 60-80),
  questions (array of MULTIPLE_CHOICE question objects).
Each question must have:
  conceptName (must match one of the provided concept names),
  type: "MULTIPLE_CHOICE",
  prompt (the question text),
  context (optional),
  payload: { type: "MULTIPLE_CHOICE", options: [{id, text, isCorrect}], correctOptionId: string },
  explanation (why the correct answer is right).
Create one question per concept (min 5, max 20 total).`;
  }

  private userMessageFinalExam(concepts: AiExtractedConcept[]): string {
    const conceptDetails = concepts
      .map((c) => `Concept: ${c.name}\nSummary: ${c.summary}`)
      .join('\n\n');
    return `All course concepts:\n${conceptDetails}`;
  }
}
