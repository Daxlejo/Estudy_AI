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
  courseSummary: z.string().trim().optional(),
  concepts: z
    .array(aiExtractedConceptSchema)
    .min(1, 'At least one concept is required'),
});

export type AiExtractedConcept = z.infer<typeof aiExtractedConceptSchema>;
export type AiConceptsResponse = z.infer<typeof aiConceptsResponseSchema>;

// ---------------------------------------------------------------------------
// Activity schemas (Practice & Challenge catalogue)
// ---------------------------------------------------------------------------

export const aiMatchingPairSchema = z.object({
  id: z.string().trim().min(1),
  left: z.string().trim().min(1),
  right: z.string().trim().min(1),
  explanation: z.string().trim().optional(),
});

export const aiMatchingActivitySchema = z.object({
  type: z.literal('matching'),
  title: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
  pairs: z.array(aiMatchingPairSchema).min(2),
  hint: z.string().trim().optional(),
  explanation: z.string().trim().optional(),
  xpReward: z.number().optional(),
});

export const aiOrderingItemSchema = z.object({
  id: z.string().trim().min(1),
  text: z.string().trim().min(1),
  explanation: z.string().trim().optional(),
});

export const aiOrderingActivitySchema = z.object({
  type: z.literal('ordering'),
  title: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
  items: z.array(aiOrderingItemSchema).min(2),
  correctOrder: z.array(z.string().trim().min(1)).min(2),
  hint: z.string().trim().optional(),
  orderingHint: z.string().trim().optional(),
  explanation: z.string().trim().optional(),
  xpReward: z.number().optional(),
});

export const aiMultipleChoiceOptionSchema = z.object({
  id: z.string().trim().min(1),
  text: z.string().trim().min(1),
  isCorrect: z.boolean(),
  feedback: z.string().trim().optional(),
});

export const aiMultipleChoiceActivitySchema = z.object({
  type: z.union([z.literal('multiple_choice'), z.literal('MULTIPLE_CHOICE')]),
  title: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
  scenario: z.string().trim().optional(),
  options: z.array(aiMultipleChoiceOptionSchema).min(2),
  correctOptionId: z.string().trim().optional(),
  hint: z.string().trim().optional(),
  explanation: z.string().trim().optional(),
  xpReward: z.number().optional(),
});

export const aiFillInBlankBlankSchema = z.object({
  index: z.number(),
  answer: z.string().trim().min(1),
  alternatives: z.array(z.string().trim()).optional(),
});

export const aiFillInBlankActivitySchema = z.object({
  type: z.literal('fill_in_blank'),
  title: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
  sentence: z.string().trim().min(1),
  blanks: z.array(aiFillInBlankBlankSchema).min(1),
  hint: z.string().trim().optional(),
  explanation: z.string().trim().min(1),
  xpReward: z.number().optional(),
});

export const aiTrueFalseActivitySchema = z.object({
  type: z.literal('true_false'),
  title: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
  statement: z.string().trim().min(1),
  correct: z.boolean(),
  justification: z.string().trim().min(1),
  hint: z.string().trim().optional(),
  explanation: z.string().trim().optional(),
  xpReward: z.number().optional(),
});

export const aiClassifyItemSchema = z.object({
  label: z.string().trim().min(1),
  correctCategory: z.string().trim().min(1),
});

export const aiClassifyActivitySchema = z.object({
  type: z.literal('classify'),
  title: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
  categories: z.array(z.string().trim().min(1)).min(2),
  items: z.array(aiClassifyItemSchema).min(2),
  hint: z.string().trim().optional(),
  explanation: z.string().trim().min(1),
  xpReward: z.number().optional(),
});

export const aiDetectErrorActivitySchema = z.object({
  type: z.literal('detect_error'),
  title: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
  codeOrText: z.string().trim().min(1),
  errorType: z.string().trim().min(1),
  correctVersion: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  hint: z.string().trim().optional(),
  xpReward: z.number().optional(),
});

export const aiPredictResultOptionSchema = z.object({
  id: z.string().trim().min(1),
  text: z.string().trim().min(1),
});

export const aiPredictResultActivitySchema = z.object({
  type: z.literal('predict_result'),
  title: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
  scenario: z.string().trim().min(1),
  codeOrText: z.string().trim().min(1),
  options: z.array(aiPredictResultOptionSchema).min(2),
  correctOptionId: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  hint: z.string().trim().optional(),
  xpReward: z.number().optional(),
});

export const aiActivitySchema = z.union([
  aiMatchingActivitySchema,
  aiOrderingActivitySchema,
  aiMultipleChoiceActivitySchema,
  aiFillInBlankActivitySchema,
  aiTrueFalseActivitySchema,
  aiClassifyActivitySchema,
  aiDetectErrorActivitySchema,
  aiPredictResultActivitySchema,
]);

export type AiMatchingActivity = z.infer<typeof aiMatchingActivitySchema>;
export type AiOrderingActivity = z.infer<typeof aiOrderingActivitySchema>;
export type AiMultipleChoiceActivity = z.infer<
  typeof aiMultipleChoiceActivitySchema
>;
export type AiFillInBlankActivity = z.infer<typeof aiFillInBlankActivitySchema>;
export type AiTrueFalseActivity = z.infer<typeof aiTrueFalseActivitySchema>;
export type AiClassifyActivity = z.infer<typeof aiClassifyActivitySchema>;
export type AiDetectErrorActivity = z.infer<typeof aiDetectErrorActivitySchema>;
export type AiPredictResultActivity = z.infer<
  typeof aiPredictResultActivitySchema
>;
export type AiActivity = z.infer<typeof aiActivitySchema>;

// ---------------------------------------------------------------------------
// Step 2: Session grouping
// ---------------------------------------------------------------------------

// Acepta cadena JSON (o texto legado) o un objeto JSON estructurado que se serializa a texto para persistencia
const serializedActivityJsonSchema = (
  requiredMsg: string,
  description: string,
) =>
  z
    .union([
      z.string().trim().min(1, requiredMsg),
      z
        .record(z.string(), z.unknown())
        .refine((obj) => Object.keys(obj).length > 0, { message: requiredMsg })
        .transform((obj) => JSON.stringify(obj)),
    ])
    .describe(description);

export function extractConceptNameStrings(items: unknown[]): string[] {
  if (!Array.isArray(items)) return [];
  const result: string[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.length > 0) result.push(trimmed);
    } else if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const candidate = obj.name ?? obj.conceptName ?? obj.title ?? obj.concept;
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed.length > 0) result.push(trimmed);
      }
    }
  }
  return result;
}

export function normalizeSessionItem(item: unknown): unknown {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return item;
  }
  const sessionObj = { ...(item as Record<string, unknown>) };

  if (Array.isArray(sessionObj.conceptNames)) {
    sessionObj.conceptNames = extractConceptNameStrings(
      sessionObj.conceptNames,
    );
  } else {
    const candidate =
      sessionObj.concepts ??
      sessionObj.concept_names ??
      sessionObj.conceptList ??
      sessionObj.concept_list;

    if (Array.isArray(candidate)) {
      sessionObj.conceptNames = extractConceptNameStrings(candidate);
    }
  }

  return sessionObj;
}

export function normalizeSessionPlan(rawPlan: unknown): unknown {
  if (!rawPlan || typeof rawPlan !== 'object') {
    return rawPlan;
  }

  let sessionsRaw: unknown = (rawPlan as Record<string, unknown>).sessions;
  if (!sessionsRaw && Array.isArray(rawPlan)) {
    sessionsRaw = rawPlan;
  }

  if (!Array.isArray(sessionsRaw)) {
    return rawPlan;
  }

  const normalizedSessions = sessionsRaw.map((s) => normalizeSessionItem(s));

  if (Array.isArray(rawPlan)) {
    return { sessions: normalizedSessions };
  }

  return {
    ...(rawPlan as Record<string, unknown>),
    sessions: normalizedSessions,
  };
}

export const aiSessionConceptNamesSchema = z.preprocess(
  (val) => {
    if (Array.isArray(val)) {
      return extractConceptNameStrings(val);
    }
    return val;
  },
  z
    .array(z.string().trim().min(1))
    .min(1, 'Session must include at least one concept'),
);

const aiSessionPlanItemBaseSchema = z.object({
  sequenceOrder: z.number().int().min(1),
  title: z.string().trim().min(1, 'Session title is required'),
  learningObjective: z.string().trim().min(1, 'Learning objective is required'),
  durationMinutes: z.number().min(1).max(300),
  xpReward: z.number().min(0),
  introTitle: z.string().trim().min(1, 'Intro title is required'),
  introContent: z.string().trim().min(1, 'Intro content is required'),
  introKeyTakeaway: z.string().trim().min(1, 'Key takeaway is required'),
  introCodeSnippet: z.string().trim().optional().nullable(),
  guidedPractice: serializedActivityJsonSchema(
    'Guided practice is required',
    'Structured JSON string describing an interactive activity (matching, ordering, fill_in_blank, true_false, classify, detect_error, or predict_result).',
  ),
  challenge: serializedActivityJsonSchema(
    'Challenge is required',
    'Structured JSON string describing an applied challenge activity (multiple_choice, predict_result, detect_error, classify, ordering, matching, fill_in_blank, or true_false).',
  ),
  conceptNames: aiSessionConceptNamesSchema,
});

export const AiSessionPlanItemSchema = Object.assign(
  z.preprocess(normalizeSessionItem, aiSessionPlanItemBaseSchema),
  { shape: aiSessionPlanItemBaseSchema.shape },
);

export const aiSessionSchema = AiSessionPlanItemSchema;

const aiSessionPlanResponseBaseSchema = z.object({
  sessions: z
    .array(AiSessionPlanItemSchema)
    .min(1, 'At least one session is required'),
});

export const aiSessionPlanResponseSchema = Object.assign(
  z.preprocess(normalizeSessionPlan, aiSessionPlanResponseBaseSchema),
  { shape: aiSessionPlanResponseBaseSchema.shape },
);

export type AiSessionPlanItem = z.infer<typeof aiSessionPlanItemBaseSchema>;
export type AiSession = AiSessionPlanItem;
export type AiSessionPlanResponse = z.infer<
  typeof aiSessionPlanResponseBaseSchema
>;

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

export const aiFinalExamMatchingPayloadSchema = z.object({
  type: z.literal('MATCHING'),
  leftItems: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        text: z.string().trim().min(1),
      }),
    )
    .min(2, 'Matching question must have at least 2 left items'),
  rightItems: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        text: z.string().trim().min(1),
      }),
    )
    .min(2, 'Matching question must have at least 2 right items'),
  correctPairs: z
    .record(z.string().trim().min(1), z.string().trim().min(1))
    .optional(),
});

export const aiFinalExamOrderingPayloadSchema = z.object({
  type: z.literal('ORDERING'),
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        text: z.string().trim().min(1),
      }),
    )
    .min(2, 'Ordering question must have at least 2 items'),
  orderingHint: z.string().trim().optional(),
  correctOrder: z
    .array(z.string().trim().min(1))
    .min(2, 'Ordering question must have a correctOrder array'),
});

export const aiFinalExamQuestionSchema = z.discriminatedUnion('type', [
  z.object({
    conceptName: z.string().trim().min(1),
    type: z.literal('MULTIPLE_CHOICE'),
    prompt: z.string().trim().min(1),
    context: z.string().trim().optional().nullable(),
    payload: aiFinalExamMultipleChoicePayloadSchema,
    explanation: z.string().trim().min(1),
  }),
  z.object({
    conceptName: z.string().trim().min(1),
    type: z.literal('MATCHING'),
    prompt: z.string().trim().min(1),
    context: z.string().trim().optional().nullable(),
    payload: aiFinalExamMatchingPayloadSchema,
    explanation: z.string().trim().min(1),
  }),
  z.object({
    conceptName: z.string().trim().min(1),
    type: z.literal('ORDERING'),
    prompt: z.string().trim().min(1),
    context: z.string().trim().optional().nullable(),
    payload: aiFinalExamOrderingPayloadSchema,
    explanation: z.string().trim().min(1),
  }),
]);

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
export type AiFinalExamMatchingPayload = z.infer<
  typeof aiFinalExamMatchingPayloadSchema
>;
export type AiFinalExamOrderingPayload = z.infer<
  typeof aiFinalExamOrderingPayloadSchema
>;
export type AiFinalExamQuestion = z.infer<typeof aiFinalExamQuestionSchema>;
export type AiFinalExamResponse = z.infer<typeof aiFinalExamResponseSchema>;
