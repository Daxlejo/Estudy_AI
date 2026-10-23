import * as path from 'path';
import {
  MaterialExtractionError,
  TextExtractionService,
} from './text-extraction.service';

describe('TextExtractionService', () => {
  const service = new TextExtractionService();
  const fixturesDir = path.resolve(__dirname, '../../../test/fixtures');
  const pdfFixture = path.join(fixturesDir, 'sample.pdf');
  const docxFixture = path.join(fixturesDir, 'sample.docx');
  const pptxFixture = path.join(fixturesDir, 'sample.pptx');

  const expectCode = (fn: () => unknown, code: string) => {
    try {
      fn();
      fail('Expected MaterialExtractionError');
    } catch (error) {
      expect(error).toBeInstanceOf(MaterialExtractionError);
      expect((error as MaterialExtractionError).code).toBe(code);
    }
  };

  const expectAsyncCode = async (fn: () => Promise<unknown>, code: string) => {
    try {
      await fn();
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

    it('resolves pdf, docx, and pptx extensions case-insensitively', () => {
      expect(service.resolveType('slides.pdf')).toBe('pdf');
      expect(service.resolveType('SLIDES.PDF')).toBe('pdf');
      expect(service.resolveType('doc.docx')).toBe('docx');
      expect(service.resolveType('DOC.DOCX')).toBe('docx');
      expect(service.resolveType('presentation.pptx')).toBe('pptx');
      expect(service.resolveType('PRESENTATION.PPTX')).toBe('pptx');
    });

    it('resolves types from MIME types', () => {
      expect(service.resolveType('file', 'application/pdf')).toBe('pdf');
      expect(
        service.resolveType(
          'file',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      ).toBe('docx');
      expect(
        service.resolveType(
          'file',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ),
      ).toBe('pptx');
      expect(service.resolveType('file', 'text/plain')).toBe('txt');
      expect(service.resolveType('file', 'text/markdown')).toBe('md');
    });

    it('rejects unsupported or missing extensions', () => {
      expectCode(() => service.resolveType('script.exe'), 'UNSUPPORTED_TYPE');
      expectCode(() => service.resolveType('noextension'), 'UNSUPPORTED_TYPE');
    });
  });

  describe('extract', () => {
    it('normalizes BOM, line endings, trailing spaces and blank lines', async () => {
      const raw = '\uFEFF  Title  \r\n\r\n\r\n\r\nLine one   \rLine two\t\n\n';
      const text = await service.extract(Buffer.from(raw, 'utf-8'), 'txt');
      expect(text).toBe('Title\n\nLine one\nLine two');
    });

    it('preserves non-ASCII UTF-8 content', async () => {
      const text = await service.extract(
        Buffer.from('# Álgebra lineal\n\nMatrices y vectores: ñ, ü', 'utf-8'),
        'md',
      );
      expect(text).toBe('# Álgebra lineal\n\nMatrices y vectores: ñ, ü');
    });

    it('rejects empty buffers', async () => {
      await expectAsyncCode(
        () => service.extract(Buffer.alloc(0), 'txt'),
        'EMPTY_CONTENT',
      );
    });

    it('rejects whitespace-only content', async () => {
      await expectAsyncCode(
        () => service.extract(Buffer.from(' \r\n\t \n  '), 'txt'),
        'EMPTY_CONTENT',
      );
    });

    it('rejects invalid UTF-8 byte sequences', async () => {
      await expectAsyncCode(
        () => service.extract(Buffer.from([0xff, 0xfe, 0xfa, 0x41]), 'txt'),
        'MALFORMED_CONTENT',
      );
    });

    it('rejects binary content containing NUL bytes in txt reader', async () => {
      await expectAsyncCode(
        () => service.extract(Buffer.from('abc\u0000def', 'utf-8'), 'txt'),
        'MALFORMED_CONTENT',
      );
    });

    it('rejects unsupported types passed at runtime', async () => {
      await expectAsyncCode(
        () => service.extract(Buffer.from('x'), 'exe' as unknown as 'txt'),
        'UNSUPPORTED_TYPE',
      );
    });
  });

  describe('Binary Extractors with Fixtures', () => {
    it('extractPdf extracts text from a PDF fixture file', async () => {
      const text = await service.extractPdf(pdfFixture);
      expect(text).toContain('Hello PDF World');
    });

    it('extractDocx extracts text from a DOCX fixture file', async () => {
      const text = await service.extractDocx(docxFixture);
      expect(text).toContain('Hello DOCX World');
    });

    it('extractPptx extracts text from a PPTX fixture file', async () => {
      const text = await service.extractPptx(pptxFixture);
      expect(text).toContain('Hello PPTX World');
    });

    it('extract handles PDF type and normalizes text', async () => {
      const text = await service.extract(pdfFixture, 'pdf');
      expect(text).toBe('Hello PDF World');
    });

    it('extract handles DOCX type and normalizes text', async () => {
      const text = await service.extract(docxFixture, 'docx');
      expect(text).toBe('Hello DOCX World');
    });

    it('extract handles PPTX type and normalizes text', async () => {
      const text = await service.extract(pptxFixture, 'pptx');
      expect(text).toBe('Hello PPTX World');
    });

    it('throws MALFORMED_CONTENT on corrupted PDF', async () => {
      await expectAsyncCode(
        () => service.extract(Buffer.from('corrupted pdf data'), 'pdf'),
        'MALFORMED_CONTENT',
      );
    });

    it('throws MALFORMED_CONTENT on corrupted DOCX', async () => {
      await expectAsyncCode(
        () => service.extract(Buffer.from('corrupted docx data'), 'docx'),
        'MALFORMED_CONTENT',
      );
    });

    it('throws MALFORMED_CONTENT on corrupted PPTX', async () => {
      await expectAsyncCode(
        () => service.extract(Buffer.from('corrupted pptx data'), 'pptx'),
        'MALFORMED_CONTENT',
      );
    });
  });
});
