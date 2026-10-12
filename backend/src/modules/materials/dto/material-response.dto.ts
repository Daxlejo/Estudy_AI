export interface MaterialResponseDto {
  id: string;
  courseId: string;
  name: string;
  type: string;
  sizeBytes: number;
  uploadedAt: Date;
  extractedCharacters: number;
}

export interface ExtractedMaterial {
  materialId: string;
  name: string;
  type: string;
  text: string;
}
