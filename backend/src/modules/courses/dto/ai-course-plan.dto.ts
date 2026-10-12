import { z } from 'zod';

/**
 * Zod schemas and inferred types for data returned by the AI provider
 * during course generation. Validates structured responses across all
 * generation pipeline stages before database persistence.
 */

// ---------------------------------------------------------------------------
// Step 1: Concept extraction
// ---------------------------------------------------------------------------

export const aiExtractedConceptSchema = z.object({
  name: z.string().trim().min(1, 'Concept name is required').max(120),
  summary: z.string().trim().min(1, 'Concept summary is required'),
  detail: z.string().trim().min(1, 'Concept detail is required'),
  example: z.string().trim().optional().nullable(),
});

export const aiConceptsResponseSchema = z.object({
  concepts: z
    .array(aiExtractedConceptSchema)
    .min(1, 'At least one concept is required'),
});

export type AiExtractedConcept = z.infer<typeof aiExtractedConceptSchema>;
export type AiConceptsResponse = z.infer<typeof aiConceptsResponseSchema>;

// ---------------------------------------------------------------------------
// Step 2: Session grouping
// ---------------------------------------------------------------------------

export const aiSessionSchema = z.object({
  sequenceOrder: z.number().int().min(1),
  title: z.string().trim().min(1, 'Session title is required'),
  learningObjective: z.string().trim().min(1, 'Learning objective is required'),
  durationMinutes: z.number().min(1).max(300),
  xpReward: z.number().min(0),
  introTitle: z.string().trim().min(1, 'Intro title is required'),
  introContent: z.string().trim().min(1, 'Intro content is required'),
  introKeyTakeaway: z.string().trim().min(1, 'Key takeaway is required'),
  introCodeSnippet: z.string().trim().optional().nullable(),
  guidedPractice: z.string().trim().min(1, 'Guided practice is required'),
  challenge: z.string().trim().min(1, 'Challenge is required'),
  conceptNames: z
    .array(z.string().trim().min(1))
    .min(1, 'Session must include at least one concept'),
});

export const aiSessionPlanResponseSchema = z.object({
  sessions: z.array(aiSessionSchema).min(1, 'At least one session is required'),
});

export type AiSession = z.infer<typeof aiSessionSchema>;
export type AiSessionPlanResponse = z.infer<typeof aiSessionPlanResponseSchema>;

// ---------------------------------------------------------------------------
// Step 3: Quiz generation (per session)
// ---------------------------------------------------------------------------

export const aiQuizOptionSchema = z.object({
  id: z.string().trim().min(1),
  text: z.string().trim().min(1),
  isCorrect: z.boolean(),
});

export const aiQuizQuestionSchema = z
  .object({
    conceptName: z.string().trim().min(1),
    prompt: z.string().trim().min(1),
    context: z.string().trim().optional().nullable(),
    options: z
      .array(aiQuizOptionSchema)
      .min(2, 'Each question must have at least 2 options'),
    explanation: z.string().trim().min(1),
  })
  .refine((q) => q.options.filter((o) => o.isCorrect === true).length === 1, {
    message:
      'Each quiz question must have exactly one correct option (isCorrect: true)',
  });

export const aiSessionQuizResponseSchema = z.object({
  passingThreshold: z.number().min(0).max(100).default(70),
  questions: z
    .array(aiQuizQuestionSchema)
    .min(1, 'Quiz must have at least one question'),
});

export type AiQuizOption = z.infer<typeof aiQuizOptionSchema>;
export type AiQuizQuestion = z.infer<typeof aiQuizQuestionSchema>;
export type AiSessionQuizResponse = z.infer<typeof aiSessionQuizResponseSchema>;

// ---------------------------------------------------------------------------
// Step 4: Final exam generation
// ---------------------------------------------------------------------------

export const aiFinalExamMultipleChoicePayloadSchema = z
  .object({
    type: z.literal('MULTIPLE_CHOICE'),
    options: z
      .array(aiQuizOptionSchema)
      .min(2, 'Multiple choice question must have at least 2 options'),
    correctOptionId: z.string().trim().min(1),
  })
  .refine(
    (payload) => {
      const correctOption = payload.options.find(
        (o) => o.id === payload.correctOptionId,
      );
      const markedCorrect = payload.options.filter((o) => o.isCorrect === true);
      return correctOption !== undefined && markedCorrect.length === 1;
    },
    {
      message:
        'Final exam payload correctOptionId must match the unique option marked isCorrect: true',
    },
  );

export const aiFinalExamQuestionSchema = z.object({
  conceptName: z.string().trim().min(1),
  type: z.literal('MULTIPLE_CHOICE'),
  prompt: z.string().trim().min(1),
  context: z.string().trim().optional().nullable(),
  payload: aiFinalExamMultipleChoicePayloadSchema,
  explanation: z.string().trim().min(1),
});

export const aiFinalExamResponseSchema = z.object({
  estimatedMinutes: z.number().min(1).max(300).default(30),
  passingScorePct: z.number().min(0).max(100).default(70),
  questions: z
    .array(aiFinalExamQuestionSchema)
    .min(1, 'Final exam must have at least one question'),
});

export type AiFinalExamMultipleChoicePayload = z.infer<
  typeof aiFinalExamMultipleChoicePayloadSchema
>;
export type AiFinalExamQuestion = z.infer<typeof aiFinalExamQuestionSchema>;
export type AiFinalExamResponse = z.infer<typeof aiFinalExamResponseSchema>;
