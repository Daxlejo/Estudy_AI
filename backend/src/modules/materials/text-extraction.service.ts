import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import * as fs from 'fs';
/*
 * Document parsers are loaded lazily on first use: they are only needed when a
 * material is uploaded, so keeping them out of the import graph shortens the
 * backend cold start (mammoth alone pulls in jszip, xmldom, bluebird, ...).
 */
type PdfParse = typeof import('pdf-parse');
type Mammoth = typeof import('mammoth');
type AdmZipCtor = typeof import('adm-zip');

let pdfParseModule: PdfParse | undefined;
let mammothModule: Mammoth | undefined;
let admZipModule: AdmZipCtor | undefined;

/* eslint-disable @typescript-eslint/no-require-imports */
const loadPdfParse = (): PdfParse =>
  (pdfParseModule ??= require('pdf-parse') as PdfParse);
const loadMammoth = (): Mammoth =>
  (mammothModule ??= require('mammoth') as Mammoth);
const loadAdmZip = (): AdmZipCtor =>
  (admZipModule ??= require('adm-zip') as AdmZipCtor);
/* eslint-enable @typescript-eslint/no-require-imports */

export type SupportedMaterialType = 'txt' | 'md' | 'pdf' | 'docx' | 'pptx';

export type MaterialExtractionErrorCode =
  | 'UNSUPPORTED_TYPE'
  | 'EMPTY_CONTENT'
  | 'MALFORMED_CONTENT';

export const MIN_EXTRACTABLE_CHARACTERS = 100;
export const PDF_IMAGE_ONLY_ERROR_MESSAGE =
  'The uploaded PDF appears to contain only images or scanned content with no extractable text. Please upload a PDF with selectable text.';

export function getInsufficientContentErrorMessage(
  type: SupportedMaterialType,
): string {
  if (type === 'pdf') {
    return PDF_IMAGE_ONLY_ERROR_MESSAGE;
  }
  const typeLabel = type === 'md' ? 'Markdown' : type.toUpperCase();
  return `The uploaded ${typeLabel} file appears to contain insufficient extractable text (under ${MIN_EXTRACTABLE_CHARACTERS} characters). Please upload a file with selectable text.`;
}

export class MaterialExtractionError extends Error {
  constructor(
    public readonly code: MaterialExtractionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MaterialExtractionError';
  }
}

const EXTENSION_TO_TYPE: Record<string, SupportedMaterialType> = {
  '.txt': 'txt',
  '.md': 'md',
  '.markdown': 'md',
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.pptx': 'pptx',
};

const MIME_TO_TYPE: Record<string, SupportedMaterialType> = {
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/x-markdown': 'md',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pptx',
};

/**
 * Extrae y normaliza texto de materiales de estudio (TXT, MD, PDF, DOCX, PPTX).
 */
@Injectable()
export class TextExtractionService {
  /**
   * Resuelve el tipo soportado a partir del nombre original del archivo o MIME type.
   * Lanza UNSUPPORTED_TYPE si el formato no esta soportado.
   */
  resolveType(originalName: string, mimeType?: string): SupportedMaterialType {
    const dotIndex = originalName.lastIndexOf('.');
    const extension =
      dotIndex >= 0 ? originalName.slice(dotIndex).toLowerCase() : '';
    if (extension) {
      const type = EXTENSION_TO_TYPE[extension];
      if (type) return type;
      throw new MaterialExtractionError(
        'UNSUPPORTED_TYPE',
        `Unsupported file type "${extension}". Supported: ${Object.keys(EXTENSION_TO_TYPE).join(', ')}`,
      );
    }
    if (mimeType && MIME_TO_TYPE[mimeType.toLowerCase()]) {
      return MIME_TO_TYPE[mimeType.toLowerCase()];
    }
    throw new MaterialExtractionError(
      'UNSUPPORTED_TYPE',
      `Unsupported file type "${mimeType || '(none)'}". Supported: ${Object.keys(EXTENSION_TO_TYPE).join(', ')}`,
    );
  }

  /**
   * Valida que el texto extraído contenga al menos 100 caracteres.
   * Para PDFs con sólo imágenes o sin texto seleccionable lanza el error descriptivo requerido.
   * Aplica la misma regla de contenido mínimo para todos los formatos (TXT, DOCX, PPTX, MD).
   */
  validateMinimumContent(
    text: string | null | undefined,
    type: SupportedMaterialType,
  ): void {
    const trimmed = (text ?? '').trim();
    if (trimmed.length < MIN_EXTRACTABLE_CHARACTERS) {
      throw new MaterialExtractionError(
        'EMPTY_CONTENT',
        getInsufficientContentErrorMessage(type),
      );
    }
  }

  // PDF — streams, does not load entire file into RAM
  async extractPdf(filePathOrBuffer: string | Buffer): Promise<string> {
    try {
      const dataBuffer =
        typeof filePathOrBuffer === 'string'
          ? await fs.promises.readFile(filePathOrBuffer)
          : filePathOrBuffer;
      const uint8 = new Uint8Array(
        dataBuffer.buffer.slice(
          dataBuffer.byteOffset,
          dataBuffer.byteOffset + dataBuffer.byteLength,
        ),
      );
      const pdfParse = loadPdfParse();
      const data = await pdfParse(uint8 as unknown as Buffer);
      const rawText = data?.text ?? '';
      this.validateMinimumContent(rawText, 'pdf');
      return rawText;
    } catch (error) {
      if (error instanceof MaterialExtractionError) throw error;
      throw new MaterialExtractionError(
        'MALFORMED_CONTENT',
        `Failed to extract PDF: ${(error as Error).message}`,
      );
    }
  }

  // DOCX
  async extractDocx(filePathOrBuffer: string | Buffer): Promise<string> {
    try {
      const mammoth = loadMammoth();
      const result =
        typeof filePathOrBuffer === 'string'
          ? await mammoth.extractRawText({ path: filePathOrBuffer })
          : await mammoth.extractRawText({ buffer: filePathOrBuffer });
      const rawText = result?.value ?? '';
      this.validateMinimumContent(rawText, 'docx');
      return rawText;
    } catch (error) {
      if (error instanceof MaterialExtractionError) throw error;
      throw new MaterialExtractionError(
        'MALFORMED_CONTENT',
        `Failed to extract DOCX: ${(error as Error).message}`,
      );
    }
  }

  // PPTX — extract text from slide XML nodes
  async extractPptx(filePathOrBuffer: string | Buffer): Promise<string> {
    try {
      const AdmZip = loadAdmZip();
      const zip = new AdmZip(filePathOrBuffer);
      const slideEntries = zip
        .getEntries()
        .filter((e) => e.entryName.match(/^ppt\/slides\/slide\d+\.xml$/))
        .sort((a, b) => a.entryName.localeCompare(b.entryName));
      const text = slideEntries
        .map((entry) => {
          const xml = entry.getData().toString('utf8');
          return xml
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        })
        .join('\n\n');
      this.validateMinimumContent(text, 'pptx');
      return text;
    } catch (error) {
      if (error instanceof MaterialExtractionError) throw error;
      throw new MaterialExtractionError(
        'MALFORMED_CONTENT',
        `Failed to extract PPTX: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Decodifica texto plano (TXT o MD) como UTF-8 estricto.
   */
  extractPlainText(input: Buffer | string): string {
    const buffer = typeof input === 'string' ? fs.readFileSync(input) : input;

    if (buffer.length === 0) {
      throw new MaterialExtractionError('EMPTY_CONTENT', 'File is empty');
    }

    let decoded: string;
    try {
      decoded = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      throw new MaterialExtractionError(
        'MALFORMED_CONTENT',
        'File is not valid UTF-8 text',
      );
    }

    if (decoded.includes('\u0000')) {
      throw new MaterialExtractionError(
        'MALFORMED_CONTENT',
        'File contains binary content',
      );
    }

    this.validateMinimumContent(decoded, 'txt');

    return decoded;
  }

  /**
   * Extrae y normaliza texto segun el tipo de material soportado.
   */
  async extract(
    input: Buffer | string,
    type: SupportedMaterialType,
  ): Promise<string> {
    if (!['txt', 'md', 'pdf', 'docx', 'pptx'].includes(type)) {
      throw new MaterialExtractionError(
        'UNSUPPORTED_TYPE',
        `Unsupported material type "${String(type)}"`,
      );
    }

    if (Buffer.isBuffer(input) && input.length === 0) {
      throw new MaterialExtractionError('EMPTY_CONTENT', 'File is empty');
    }

    let raw: string;
    switch (type) {
      case 'pdf':
        raw = await this.extractPdf(input);
        break;
      case 'docx':
        raw = await this.extractDocx(input);
        break;
      case 'pptx':
        raw = await this.extractPptx(input);
        break;
      case 'txt':
      case 'md':
        raw = this.extractPlainText(input);
        break;
      default:
        throw new UnsupportedMediaTypeException(
          `Unsupported material type "${String(type)}"`,
        );
    }

    const normalized = this.normalize(raw);
    this.validateMinimumContent(normalized, type);
    return normalized;
  }

  normalize(text: string): string {
    return text
      .replace(/^\uFEFF/, '')
      .normalize('NFC')
      .replace(/\r\n?/g, '\n')
      .replace(/[^\S\n]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
