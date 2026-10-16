import { Injectable } from '@nestjs/common';

export type SupportedMaterialType = 'txt' | 'md';

export type MaterialExtractionErrorCode =
  'UNSUPPORTED_TYPE' | 'EMPTY_CONTENT' | 'MALFORMED_CONTENT';

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
};

/**
 * Extrae y normaliza texto de materiales de estudio.
 * No depende de ningun proveedor de IA ni del sistema de archivos.
 */
@Injectable()
export class TextExtractionService {
  /**
   * Resuelve el tipo soportado a partir del nombre original del archivo.
   * Lanza UNSUPPORTED_TYPE si la extension no esta soportada.
   */
  resolveType(originalName: string): SupportedMaterialType {
    const dotIndex = originalName.lastIndexOf('.');
    const extension =
      dotIndex >= 0 ? originalName.slice(dotIndex).toLowerCase() : '';
    const type = EXTENSION_TO_TYPE[extension];
    if (!type) {
      throw new MaterialExtractionError(
        'UNSUPPORTED_TYPE',
        `Unsupported file type "${extension || '(none)'}". Supported: ${Object.keys(EXTENSION_TO_TYPE).join(', ')}`,
      );
    }
    return type;
  }

  /**
   * Decodifica el buffer como UTF-8 estricto y devuelve texto normalizado.
   */
  extract(buffer: Buffer, type: SupportedMaterialType): string {
    if (type !== 'txt' && type !== 'md') {
      throw new MaterialExtractionError(
        'UNSUPPORTED_TYPE',
        `Unsupported material type "${String(type)}"`,
      );
    }

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

    const normalized = this.normalize(decoded);
    if (normalized.length === 0) {
      throw new MaterialExtractionError(
        'EMPTY_CONTENT',
        'File contains no extractable text',
      );
    }
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
