import { Inject, Injectable, Logger } from '@nestjs/common';
import { CourseRepository } from '../../domain/repositories/course.repository';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { QuizRepository } from '../../domain/repositories/quiz.repository';
import { FinalExamRepository } from '../../domain/repositories/final-exam.repository';
import { FinalExamQuestionPayload } from '../../domain/models/final-exam';
import { GenerationJobStatus } from '../../domain/models/course';
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

export type CourseGenerationLanguage = 'es' | 'en';

export const CHUNK_SIZE = 6_000; // chars per chunk
export const MAX_CHUNKS = 10; // max chunks to process (60k chars total)
export const OVERLAP = 200; // overlap between chunks

export function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length && chunks.length < MAX_CHUNKS) {
    chunks.push(text.slice(start, start + CHUNK_SIZE));
    start += CHUNK_SIZE - OVERLAP;
  }
  return chunks;
}

/**
 * Fisher-Yates (Knuth) shuffle algorithm.
 * Guarantees uniform random distribution for array elements.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Shuffles quiz options using Fisher-Yates and calculates the updated correctOptionIndex.
 */
export function shuffleQuizOptions<
  T extends { id?: string; text?: string; isCorrect?: boolean },
>(
  options: T[],
  initialCorrectOptionIndex?: number,
): { shuffledOptions: T[]; correctOptionIndex: number } {
  const prepared = options.map((opt, idx) => {
    if (
      typeof initialCorrectOptionIndex === 'number' &&
      opt.isCorrect === undefined
    ) {
      return { ...opt, isCorrect: idx === initialCorrectOptionIndex };
    }
    return { ...opt };
  });

  const shuffledOptions = shuffleArray(prepared);
  let correctOptionIndex = shuffledOptions.findIndex(
    (opt) => opt.isCorrect === true,
  );

  if (
    correctOptionIndex === -1 &&
    typeof initialCorrectOptionIndex === 'number' &&
    options[initialCorrectOptionIndex]
  ) {
    const target = options[initialCorrectOptionIndex];
    correctOptionIndex = shuffledOptions.findIndex(
      (opt) => opt === target || (opt.id && opt.id === target.id),
    );
  }

  if (correctOptionIndex === -1) {
    correctOptionIndex = 0;
  }

  return { shuffledOptions, correctOptionIndex };
}

// Orchestrates the full AI-driven course-generation pipeline for a given GenerationJob.
// Pipeline steps (matching GenerationJobStatus values):
//   PENDING -> EXTRACTING -> ANALYZING_CONCEPTS -> ANALYZING_DEPENDENCIES -> BUILDING_PATH -> COMPLETED | ERROR
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

  splitIntoChunks(text: string): string[] {
    return splitIntoChunks(text);
  }

  shuffleArray<T>(array: T[]): T[] {
    return shuffleArray(array);
  }

  shuffleQuizOptions<
    T extends { id?: string; text?: string; isCorrect?: boolean },
  >(
    options: T[],
    initialCorrectOptionIndex?: number,
  ): { shuffledOptions: T[]; correctOptionIndex: number } {
    return shuffleQuizOptions(options, initialCorrectOptionIndex);
  }

  // Entry point. Updates job status/progress at each step and persists all generated artefacts.
  // On any error the job is marked ERROR, the course status reverted to ERROR, and partially persisted entities rolled back.
  async run(
    courseId: string,
    jobId: string,
    materialIds?: string[],
    language: CourseGenerationLanguage = 'es',
  ): Promise<void> {
    const resolvedLang: CourseGenerationLanguage =
      language === 'en' ? 'en' : 'es';
    this.logger.log(
      `Pipeline started (course=${courseId}, job=${jobId}, lang=${resolvedLang})`,
    );
    const createdSessionIds: string[] = [];
    let createdExamId: string | null = null;

    try {
      const course = await this.courseRepository.findById(courseId);
      if (!course) {
        throw new Error(`Course with id ${courseId} not found`);
      }

      // Step 0: EXTRACTING
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

      // Step 1: ANALYZING_CONCEPTS (Map-Reduce chunked extraction)
      await this.updateJob(jobId, 'ANALYZING_CONCEPTS', 20, 1);

      const chunks = this.splitIntoChunks(combinedText);
      const chunkResults = await Promise.all(
        chunks.map((chunk) =>
          this.aiService.completeJson<unknown>(
            this.systemPromptConcepts(resolvedLang),
            this.userMessageConcepts(chunk),
          ),
        ),
      );

      const extractedChunkConcepts: AiExtractedConcept[] = [];
      let generatedSummary: string | undefined;

      for (let i = 0; i < chunkResults.length; i++) {
        const rawConceptsData = chunkResults[i];
        const conceptsValidation =
          aiConceptsResponseSchema.safeParse(rawConceptsData);
        if (!conceptsValidation.success) {
          const issues = conceptsValidation.error.issues
            .map(
              (issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`,
            )
            .join('; ');
          throw new Error(`AI generated invalid concepts response: ${issues}`);
        }
        if (!generatedSummary && conceptsValidation.data.courseSummary) {
          generatedSummary = conceptsValidation.data.courseSummary;
        }
        extractedChunkConcepts.push(...conceptsValidation.data.concepts);
      }

      // Deduplicate and merge concept lists
      const seenNames = new Set<string>();
      const deduplicatedConcepts: AiExtractedConcept[] = [];
      for (const concept of extractedChunkConcepts) {
        const key = concept.name.trim().toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          deduplicatedConcepts.push(concept);
        }
      }

      if (deduplicatedConcepts.length === 0) {
        throw new Error(
          'AI generated invalid concepts response: concepts: At least one concept is required',
        );
      }

      // Synthesize final concept map from merged list (limit to 30)
      const rawConcepts = deduplicatedConcepts.slice(0, 30);

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

      // Step 2: ANALYZING_DEPENDENCIES -> session grouping
      await this.updateJob(jobId, 'ANALYZING_DEPENDENCIES', 50, 2);

      const rawSessionsData = await this.aiService.completeJson<unknown>(
        this.systemPromptSessions(resolvedLang),
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

      // Step 3: BUILDING_PATH -> persist sessions + concepts + quizzes
      await this.updateJob(jobId, 'BUILDING_PATH', 65, 3);

      // Map concept name -> persisted Concept id
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
          // Serializar el JSON estructurado en las columnas de texto existentes
          guidedPractice:
            typeof rawSession.guidedPractice === 'string'
              ? rawSession.guidedPractice
              : JSON.stringify(rawSession.guidedPractice),
          challenge:
            typeof rawSession.challenge === 'string'
              ? rawSession.challenge
              : JSON.stringify(rawSession.challenge),
        });
        createdSessionIds.push(session.id);

        // Persist concepts for this session
        const sessionConcepts: AiExtractedConcept[] = (
          rawSession.conceptNames ?? []
        )
          .map((name) =>
            rawConcepts.find(
              (c) =>
                c.name === name ||
                c.name.trim().toLowerCase() === name.trim().toLowerCase(),
            ),
          )
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
            this.systemPromptQuiz(resolvedLang),
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
            xpReward: session.xpReward ?? 100,
          });

          for (const rawQ of rawQuiz.questions ?? []) {
            const conceptId = conceptIdByName.get(rawQ.conceptName);
            if (!conceptId) continue; // skip questions for unknown concepts
            const { shuffledOptions, correctOptionIndex } =
              this.shuffleQuizOptions(
                rawQ.options,
                (rawQ as any).correctOptionIndex,
              );
            (rawQ as any).options = shuffledOptions;
            (rawQ as any).correctOptionIndex = correctOptionIndex;
            await this.quizRepository.addQuestion({
              quizId: quiz.id,
              conceptId,
              prompt: rawQ.prompt,
              context: rawQ.context ?? null,
              options: shuffledOptions,
              correctOptionIndex,
              explanation: rawQ.explanation,
            });
          }
        }
      }

      await this.updateJob(jobId, 'BUILDING_PATH', 85, 3);

      // Step 4: Generate final exam
      const allConcepts = rawConcepts.filter((c) =>
        conceptIdByName.has(c.name),
      );

      if (allConcepts.length === 0) {
        throw new Error(
          'Cannot generate final exam: no concepts were persisted for this course.',
        );
      }

      const rawExamData = await this.aiService.completeJson<unknown>(
        this.systemPromptFinalExam(resolvedLang),
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

      const fallbackConceptId = Array.from(conceptIdByName.values())[0];
      let questionsAdded = 0;

      for (const rawQ of rawExam.questions ?? []) {
        const conceptId =
          conceptIdByName.get(rawQ.conceptName) || fallbackConceptId;
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
        questionsAdded++;
      }

      if (questionsAdded === 0 && fallbackConceptId) {
        const isEn = resolvedLang === 'en';
        await this.finalExamRepository.addQuestion({
          examId: exam.id,
          conceptId: fallbackConceptId,
          type: 'MULTIPLE_CHOICE',
          prompt: isEn
            ? `What is the fundamental purpose of ${allConcepts[0]?.name || 'the concepts covered in the course'}?`
            : `¿Cuál es el propósito fundamental de ${allConcepts[0]?.name || 'los conceptos vistos en el curso'}?`,
          context: null,
          payload: {
            type: 'MULTIPLE_CHOICE',
            options: [
              {
                id: 'opt-1',
                text:
                  allConcepts[0]?.summary ||
                  (isEn
                    ? 'Apply the modular design principle.'
                    : 'Aplicar el principio de diseño modular.'),
                isCorrect: true,
              },
              {
                id: 'opt-2',
                text: isEn
                  ? 'Generate redundancy in the code.'
                  : 'Generar redundancia en el código.',
                isCorrect: false,
              },
            ],
            correctOptionId: 'opt-1',
          },
          explanation: isEn
            ? 'Evaluates comprehension of the core concept of the course.'
            : 'Evalúa la comprensión del concepto central del curso.',
        });
      }

      // Finish
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

  // Private helpers

  private async updateJob(
    jobId: string,
    status: GenerationJobStatus,
    progress: number,
    currentStepIndex: number,
  ): Promise<void> {
    await this.courseRepository.updateGenerationJob(jobId, {
      status,
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

  extractActivityType(raw: unknown): string | null {
    if (!raw) return null;
    let obj: unknown = raw;
    if (typeof raw === 'string') {
      try {
        const cleaned = raw
          .replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1')
          .trim();
        obj = JSON.parse(cleaned);
      } catch {
        return null;
      }
    }
    if (obj && typeof obj === 'object' && 'type' in obj) {
      return String((obj as { type: unknown }).type).toLowerCase();
    }
    return null;
  }

  validateAdaptiveActivityTypes(sessions: AiSession[]): void {
    const activitySequence: string[] = [];
    const typeCounts = new Map<string, number>();

    for (const session of sessions) {
      const practiceType = this.extractActivityType(session.guidedPractice);
      if (practiceType) {
        activitySequence.push(practiceType);
        typeCounts.set(practiceType, (typeCounts.get(practiceType) ?? 0) + 1);
      }

      const challengeType = this.extractActivityType(session.challenge);
      if (challengeType) {
        activitySequence.push(challengeType);
        typeCounts.set(challengeType, (typeCounts.get(challengeType) ?? 0) + 1);
      }
    }

    // 1. Rejects plans with > 2 consecutive identical types
    let consecutiveCount = 1;
    for (let i = 1; i < activitySequence.length; i++) {
      if (activitySequence[i] === activitySequence[i - 1]) {
        consecutiveCount++;
        if (consecutiveCount > 2) {
          throw new Error(
            `Session plan rejected: more than 2 consecutive identical activity types detected ("${activitySequence[i]}")`,
          );
        }
      } else {
        consecutiveCount = 1;
      }
    }

    // 2. Logs a warning (not an error) if a type appears > 2 times total
    for (const [type, count] of typeCounts.entries()) {
      if (count > 2) {
        this.logger.warn(
          `Activity type "${type}" appears ${count} times in course plan (> 2 total). Consider variety.`,
        );
      }
    }
  }

  checkSubstantiveDuplication(
    practiceRaw: unknown,
    challengeRaw: unknown,
  ): boolean {
    const practiceStr =
      typeof practiceRaw === 'string'
        ? practiceRaw.trim()
        : JSON.stringify(practiceRaw ?? '');
    const challengeStr =
      typeof challengeRaw === 'string'
        ? challengeRaw.trim()
        : JSON.stringify(challengeRaw ?? '');

    if (!practiceStr || !challengeStr) return false;
    if (practiceStr === challengeStr) return true;

    // Parse JSON if possible to inspect internal structures
    let pObj: Record<string, unknown> | null = null;
    let cObj: Record<string, unknown> | null = null;
    try {
      pObj = JSON.parse(
        practiceStr.replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1').trim(),
      );
    } catch {
      pObj = null;
    }
    try {
      cObj = JSON.parse(
        challengeStr.replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1').trim(),
      );
    } catch {
      cObj = null;
    }

    if (pObj && cObj) {
      const pType = String(pObj.type || '').toLowerCase();
      const cType = String(cObj.type || '').toLowerCase();

      // If both are matching, check if pairs overlap >= 50%
      if (pType === 'matching' && cType === 'matching') {
        const pPairs = Array.isArray(pObj.pairs)
          ? (pObj.pairs as Array<{
              left?: string;
              right?: string;
              item?: string;
              match?: string;
            }>)
          : Array.isArray(pObj.items)
            ? (pObj.items as Array<{
                left?: string;
                right?: string;
                item?: string;
                match?: string;
              }>)
            : [];
        const cPairs = Array.isArray(cObj.pairs)
          ? (cObj.pairs as Array<{
              left?: string;
              right?: string;
              item?: string;
              match?: string;
            }>)
          : Array.isArray(cObj.items)
            ? (cObj.items as Array<{
                left?: string;
                right?: string;
                item?: string;
                match?: string;
              }>)
            : [];

        if (pPairs.length > 0 && cPairs.length > 0) {
          const pSet = new Set(
            pPairs.map(
              (p) =>
                `${String(p.left || p.item || '')
                  .trim()
                  .toLowerCase()}:::${String(p.right || p.match || '')
                  .trim()
                  .toLowerCase()}`,
            ),
          );
          let matchCount = 0;
          for (const cp of cPairs) {
            const key = `${String(cp.left || cp.item || '')
              .trim()
              .toLowerCase()}:::${String(cp.right || cp.match || '')
              .trim()
              .toLowerCase()}`;
            if (pSet.has(key)) matchCount++;
          }
          if (matchCount / Math.max(pPairs.length, cPairs.length) >= 0.5) {
            return true;
          }
        }
      }

      // Check stripped equality (ignoring id, title, and formatting)
      const pCopy = { ...pObj };
      const cCopy = { ...cObj };
      delete pCopy.id;
      delete pCopy.title;
      delete cCopy.id;
      delete cCopy.title;
      if (JSON.stringify(pCopy) === JSON.stringify(cCopy)) {
        return true;
      }
    }

    return false;
  }

  private validateSessions(
    sessions: AiSession[],
    concepts: AiExtractedConcept[],
  ): void {
    if (sessions.length === 0) {
      throw new Error('AI returned no sessions from the session plan.');
    }
    const conceptNameMap = new Map<string, string>();
    for (const c of concepts) {
      conceptNameMap.set(c.name.trim().toLowerCase(), c.name);
    }

    for (const s of sessions) {
      if (Array.isArray(s.conceptNames)) {
        s.conceptNames = s.conceptNames.map((name) => {
          const canonical = conceptNameMap.get(name.trim().toLowerCase());
          return canonical ?? name;
        });
      }

      for (const name of s.conceptNames ?? []) {
        if (!conceptNameMap.has(name.trim().toLowerCase())) {
          this.logger.warn(
            `Session "${s.title}" references unknown concept "${name}" — skipped`,
          );
        }
      }

      // Validate that guidedPractice and challenge are not substantively duplicated exercises
      if (this.checkSubstantiveDuplication(s.guidedPractice, s.challenge)) {
        throw new Error(
          `Session plan rejected: session "${s.title}" has identical guidedPractice and challenge payloads. Guided practice and applied challenge must be distinct exercises.`,
        );
      }
    }
    this.validateAdaptiveActivityTypes(sessions);
  }

  // Prompt builders

  private languageInstruction(language: CourseGenerationLanguage): string {
    return language === 'en'
      ? 'IMPORTANT: Generate ALL content (summaries, titles, explanations, exercises, questions, options, and feedback) in English.'
      : 'IMPORTANTE: Genera TODO el contenido (resúmenes, títulos, explicaciones, ejercicios, preguntas, opciones y retroalimentación) en Español.';
  }

  private systemPromptConcepts(
    language: CourseGenerationLanguage = 'es',
  ): string {
    return `You are an expert academic curriculum designer.
${this.languageInstruction(language)}
Your task is to analyze the provided study material and extract:
1. A concise (1-2 sentences) course summary capturing the essence and key topics of the material (e.g., "Curso estructurado de Programación Orientada a Objetos enfocado en clases, objetos, encapsulamiento, herencia y polimorfismo.").
2. The key concepts from the material.
Return ONLY a JSON object with two keys:
  "courseSummary": a string with the 1-2 sentence overview of the course based on the material,
  "concepts": an array of concept objects.
Each concept must have: name (string <=80 chars), summary (one sentence), detail (1-2 paragraphs), example (optional string).
Extract between 5 and 30 concepts. Focus on the most important ideas.`;
  }

  private userMessageConcepts(text: string): string {
    return `Study material:\n\n${text}`;
  }

  private systemPromptSessions(
    language: CourseGenerationLanguage = 'es',
  ): string {
    return `You are an expert academic curriculum designer.
${this.languageInstruction(language)}
Given a list of concepts extracted from study material, organize them into logical learning sessions.
Return ONLY a JSON object with this exact top-level structure:
{
  "sessions": [
    {
      "sequenceOrder": 1,
      "title": "Title of session",
      "learningObjective": "Clear learning objective",
      "durationMinutes": 30,
      "xpReward": 100,
      "introTitle": "Introduction title",
      "introContent": "2-3 paragraphs introducing the topic",
      "introKeyTakeaway": "1 sentence key takeaway",
      "introCodeSnippet": null,
      "guidedPractice": "{\"type\": \"matching\", ...}",
      "challenge": "{\"type\": \"multiple_choice\", ...}",
      "conceptNames": ["Exact Concept Name 1", "Exact Concept Name 2"]
    }
  ]
}

CRITICAL RULES FOR "conceptNames":
- Every session MUST include "conceptNames" as an array of strings.
- Each string in "conceptNames" MUST match the exact name of a concept from the provided list.
- Do NOT omit "conceptNames". Do NOT rename this field to "concepts", "concept_names", or anything else.
- Every concept from the provided list must appear in exactly one session's "conceptNames" array.
- Sessions MUST have at least one concept in "conceptNames".

Supported activity types and their required JSON schemas (serialize as JSON string in guidedPractice and challenge):
- "matching": {"type": "matching", "title": string, "instructions": string, "pairs": [{"id": string, "left": string, "right": string, "explanation": string}], "hint": string}
- "ordering": {"type": "ordering", "title": string, "instructions": string, "items": [{"id": string, "text": string}], "correctOrder": string[], "hint": string}
- "multiple_choice": {"type": "multiple_choice", "title": string, "instructions": string, "scenario": string, "options": [{"id": string, "text": string, "isCorrect": boolean, "feedback": string}], "hint": string, "explanation": string}
- "fill_in_blank": {"type": "fill_in_blank", "title": string, "instructions": string, "sentence": string, "blanks": [{"index": number, "answer": string}], "hint": string, "explanation": string}
- "true_false": {"type": "true_false", "title": string, "instructions": string, "statement": string, "correct": boolean, "justification": string}
- "classify": {"type": "classify", "title": string, "instructions": string, "categories": string[], "items": [{"label": string, "correctCategory": string}], "hint": string}
- "detect_error": {"type": "detect_error", "title": string, "instructions": string, "codeOrText": string, "errorType": string, "correctVersion": string, "hint": string, "explanation": string}
- "predict_result": {"type": "predict_result", "title": string, "instructions": string, "codeOrText": string, "options": [{"id": string, "text": string}], "correctOptionId": string, "hint": string, "explanation": string}

When choosing activity types for a session, follow these rules:
- 'guidedPractice' and 'challenge' MUST be two completely distinct learning tasks within each session. They must NEVER repeat or duplicate the same exercise, task, question, or problem.
- 'guidedPractice' is an interactive learning activity for foundational concepts, providing pedagogical hints and guided feedback (e.g. matching, ordering, fill_in_blank, classify).
- 'challenge' is an independent, autonomous applied challenge testing the learner's ability to apply concepts to a different problem, scenario, code snippet, or diagnostic task without revealing hints during the attempt (e.g. multiple_choice, predict_result, detect_error, true_false).
- 'guidedPractice' and 'challenge' within the same session MUST use different activity types.
- Maintain variety across the entire course: distribute activity types across the available catalogue instead of repeatedly falling back to matching.
- Use 'ordering' only if the content describes a sequential process with clear steps.
- Use 'detect_error' only if the content involves code, formulas, or procedures.
- Use 'predict_result' only if the content includes executable code or mathematical expressions.
- Use 'classify' only if the content has at least 2 distinct categories with >= 2 items each.
- NEVER generate a 'multiple_choice' activity with compound numbered scenarios or questions (e.g., "1. ... 2. ... 3. ...") that combine multiple cases into a single prompt while only allowing a single option selection. 'multiple_choice' MUST evaluate a single concrete scenario or question with exactly one correct answer. When there are multiple scenarios or cases to map to concepts/architectures, use 'classify' (or 'matching') instead.
- Use 'fill_in_blank' and 'true_false' for any factual or conceptual content.
- Never force a type if the content does not support it.
Create between 3 and 8 sessions. Every concept must appear in exactly one session. Do not use placeholder or generic text. Every practice activity and challenge MUST be substantial, concrete, and directly tied to the specific topic, and serialized as a JSON string.`;
  }

  private userMessageSessions(
    concepts: AiExtractedConcept[],
    studyText: string,
  ): string {
    const conceptList = concepts
      .map((c) => `- ${c.name}: ${c.summary}`)
      .join('\n');
    const maxChars = CHUNK_SIZE * MAX_CHUNKS;
    const truncated =
      studyText.length > maxChars
        ? studyText.slice(0, maxChars) + '\n\n[...truncated...]'
        : studyText;
    return `Concepts to organize:\n${conceptList}\n\nOriginal material context:\n${truncated}`;
  }

  private systemPromptQuiz(language: CourseGenerationLanguage = 'es'): string {
    return `You are an academic quiz designer.
${this.languageInstruction(language)}
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

  private systemPromptFinalExam(
    language: CourseGenerationLanguage = 'es',
  ): string {
    return `You are an academic exam designer.
${this.languageInstruction(language)}
Create a final exam covering all the provided concepts.
Return ONLY a JSON object with:
  estimatedMinutes (integer, 20-60),
  passingScorePct (integer, 60-80),
  questions (array of question objects: MULTIPLE_CHOICE, MATCHING, or ORDERING).
Each question must have:
  conceptName (must match one of the provided concept names),
  type ("MULTIPLE_CHOICE" | "MATCHING" | "ORDERING"),
  prompt (the question text),
  context (optional),
  payload:
    - If type is "MULTIPLE_CHOICE": { type: "MULTIPLE_CHOICE", options: [{id, text, isCorrect}], correctOptionId: string }
    - If type is "MATCHING": { type: "MATCHING", leftItems: [{id, text}], rightItems: [{id, text}], correctPairs: Record<string, string> }
    - If type is "ORDERING": { type: "ORDERING", items: [{id, text}], correctOrder: string[] }
  explanation (why the correct answer is right).
Create one question per concept (min 5, max 20 total), varying question types across MULTIPLE_CHOICE, MATCHING, and ORDERING to ensure high engagement.`;
  }

  private userMessageFinalExam(concepts: AiExtractedConcept[]): string {
    const conceptDetails = concepts
      .map((c) => `Concept: ${c.name}\nSummary: ${c.summary}`)
      .join('\n\n');
    return `All course concepts:\n${conceptDetails}`;
  }
}
