import {
  MaterialExtractionError,
  TextExtractionService,
} from './text-extraction.service';

describe('TextExtractionService', () => {
  const service = new TextExtractionService();

  const expectCode = (fn: () => unknown, code: string) => {
    try {
      fn();
      fail('Expected MaterialExtractionError');
    } catch (error) {
      expect(error).toBeInstanceOf(MaterialExtractionError);
      expect((error as MaterialExtractionError).code).toBe(code);
    }
  };

  describe('resolveType', () => {
    it('resolves txt and markdown extensions case-insensitively', () => {
      expect(service.resolveType('notes.txt')).toBe('txt');
      expect(service.resolveType('NOTES.TXT')).toBe('txt');
      expect(service.resolveType('readme.md')).toBe('md');
      expect(service.resolveType('guide.markdown')).toBe('md');
    });

    it('rejects unsupported or missing extensions', () => {
      expectCode(() => service.resolveType('slides.pdf'), 'UNSUPPORTED_TYPE');
      expectCode(() => service.resolveType('doc.docx'), 'UNSUPPORTED_TYPE');
      expectCode(() => service.resolveType('script.exe'), 'UNSUPPORTED_TYPE');
      expectCode(() => service.resolveType('noextension'), 'UNSUPPORTED_TYPE');
    });
  });

  describe('extract', () => {
    it('normalizes BOM, line endings, trailing spaces and blank lines', () => {
      const raw = '\uFEFF  Title  \r\n\r\n\r\n\r\nLine one   \rLine two\t\n\n';
      const text = service.extract(Buffer.from(raw, 'utf-8'), 'txt');
      expect(text).toBe('Title\n\nLine one\nLine two');
    });

    it('preserves non-ASCII UTF-8 content', () => {
      const text = service.extract(
        Buffer.from('# Álgebra lineal\n\nMatrices y vectores: ñ, ü', 'utf-8'),
        'md',
      );
      expect(text).toBe('# Álgebra lineal\n\nMatrices y vectores: ñ, ü');
    });

    it('rejects empty buffers', () => {
      expectCode(
        () => service.extract(Buffer.alloc(0), 'txt'),
        'EMPTY_CONTENT',
      );
    });

    it('rejects whitespace-only content', () => {
      expectCode(
        () => service.extract(Buffer.from(' \r\n\t \n  '), 'txt'),
        'EMPTY_CONTENT',
      );
    });

    it('rejects invalid UTF-8 byte sequences', () => {
      expectCode(
        () => service.extract(Buffer.from([0xff, 0xfe, 0xfa, 0x41]), 'txt'),
        'MALFORMED_CONTENT',
      );
    });

    it('rejects binary content containing NUL bytes', () => {
      expectCode(
        () => service.extract(Buffer.from('abc\u0000def', 'utf-8'), 'txt'),
        'MALFORMED_CONTENT',
      );
    });

    it('rejects unsupported types passed at runtime', () => {
      expectCode(
        () => service.extract(Buffer.from('x'), 'pdf' as unknown as 'txt'),
        'UNSUPPORTED_TYPE',
      );
    });
  });
});
