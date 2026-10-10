export interface Session {
  id: string;
  courseId: string;
  sequenceOrder: number;
  title: string;
  learningObjective: string;
  durationMinutes: number;
  xpReward: number;
  isUnlocked: boolean;
  introTitle: string;
  introContent: string;
  introKeyTakeaway: string;
  introCodeSnippet: string | null;
  guidedPractice: string;
  challenge: string;
  createdAt: Date;
}

export interface Concept {
  id: string;
  sessionId: string;
  name: string;
  summary: string;
  detail: string;
  example: string | null;
  createdAt: Date;
}
