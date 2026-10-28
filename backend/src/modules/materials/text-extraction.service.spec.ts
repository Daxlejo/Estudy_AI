import * as path from 'path';
import {
  MaterialExtractionError,
  TextExtractionService,
  PDF_IMAGE_ONLY_ERROR_MESSAGE,
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

  const expectAsyncError = async (
    fn: () => Promise<unknown>,
    expectedMessage: string,
  ) => {
    try {
      await fn();
      fail('Expected MaterialExtractionError with specific message');
    } catch (error) {
      expect(error).toBeInstanceOf(MaterialExtractionError);
      expect((error as MaterialExtractionError).message).toBe(expectedMessage);
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

  describe('extract and minimum content validation', () => {
    const validLongText =
      'This is a valid educational content text block designed to easily exceed the one hundred characters minimum threshold required by the extractor.';

    it('normalizes BOM, line endings, trailing spaces and blank lines', async () => {
      const raw =
        '\uFEFF  Title  \r\n\r\n\r\n\r\nLine one   \rLine two\t\n\n' +
        validLongText;
      const text = await service.extract(Buffer.from(raw, 'utf-8'), 'txt');
      expect(text).toContain('Title\n\nLine one\nLine two');
      expect(text.length).toBeGreaterThanOrEqual(100);
    });

    it('preserves non-ASCII UTF-8 content', async () => {
      const content =
        '# Álgebra lineal\n\nMatrices y vectores: ñ, ü. ' + validLongText;
      const text = await service.extract(
        Buffer.from(content, 'utf-8'),
        'md',
      );
      expect(text).toContain('# Álgebra lineal\n\nMatrices y vectores: ñ, ü');
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

    it('rejects text under 100 characters with descriptive error', async () => {
      await expectAsyncCode(
        () =>
          service.extract(Buffer.from('Short text under 100 chars', 'utf-8'), 'txt'),
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
        () => service.extract(Buffer.from('abc\u0000def' + validLongText, 'utf-8'), 'txt'),
        'MALFORMED_CONTENT',
      );
    });

    it('rejects unsupported types passed at runtime', async () => {
      await expectAsyncCode(
        () => service.extract(Buffer.from(validLongText), 'exe' as unknown as 'txt'),
        'UNSUPPORTED_TYPE',
      );
    });
  });

  describe('Image-only / scanned PDF robustness', () => {
    it('throws descriptive error on image-only / empty text PDF', async () => {
      // PDF structure with no text stream (simulating a scanned image-only PDF)
      const scannedPdf =
        '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 0 >>\nstream\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n254\n%%EOF\n';

      await expectAsyncError(
        () => service.extractPdf(Buffer.from(scannedPdf)),
        PDF_IMAGE_ONLY_ERROR_MESSAGE,
      );

      await expectAsyncError(
        () => service.extract(Buffer.from(scannedPdf), 'pdf'),
        PDF_IMAGE_ONLY_ERROR_MESSAGE,
      );
    });

    it('throws descriptive error when PDF text has under 100 characters', async () => {
      // PDF with short text "Hello Short" (11 characters)
      const shortStream = 'BT\n/F1 12 Tf\n100 700 Td\n(Hello Short) Tj\nET\n';
      const shortPdf =
        `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length ${shortStream.length} >>\nstream\n${shortStream}endstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000222 00000 n \n0000000300 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n360\n%%EOF\n`;

      await expectAsyncError(
        () => service.extractPdf(Buffer.from(shortPdf)),
        PDF_IMAGE_ONLY_ERROR_MESSAGE,
      );
    });
  });

  describe('Binary Extractors with Fixtures', () => {
    it('extractPdf extracts text from a PDF fixture file', async () => {
      const text = await service.extractPdf(pdfFixture);
      expect(text).toContain('Hello PDF World');
      expect(text.trim().length).toBeGreaterThanOrEqual(100);
    });

    it('extractDocx extracts text from a DOCX fixture file', async () => {
      const text = await service.extractDocx(docxFixture);
      expect(text).toContain('Hello DOCX World');
      expect(text.trim().length).toBeGreaterThanOrEqual(100);
    });

    it('extractPptx extracts text from a PPTX fixture file', async () => {
      const text = await service.extractPptx(pptxFixture);
      expect(text).toContain('Hello PPTX World');
      expect(text.trim().length).toBeGreaterThanOrEqual(100);
    });

    it('extract handles PDF type and normalizes text', async () => {
      const text = await service.extract(pdfFixture, 'pdf');
      expect(text).toContain('Hello PDF World');
      expect(text.length).toBeGreaterThanOrEqual(100);
    });

    it('extract handles DOCX type and normalizes text', async () => {
      const text = await service.extract(docxFixture, 'docx');
      expect(text).toContain('Hello DOCX World');
      expect(text.length).toBeGreaterThanOrEqual(100);
    });

    it('extract handles PPTX type and normalizes text', async () => {
      const text = await service.extract(pptxFixture, 'pptx');
      expect(text).toContain('Hello PPTX World');
      expect(text.length).toBeGreaterThanOrEqual(100);
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
