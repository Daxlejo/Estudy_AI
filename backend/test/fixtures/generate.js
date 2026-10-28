const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const fixturesDir = path.join(__dirname);
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// 1. PDF with exact XRef byte offsets
const longText =
  'Hello PDF World! This is a valid sample document created for unit testing text extraction. It contains well over one hundred characters of selectable text.';
const header = '%PDF-1.4\n';
const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
const obj3 =
  '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n';
const obj4 =
  '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
const streamContent = `BT\n/F1 12 Tf\n100 700 Td\n(${longText}) Tj\nET\n`;
const obj5 =
  '5 0 obj\n<< /Length ' +
  streamContent.length +
  ' >>\nstream\n' +
  streamContent +
  'endstream\nendobj\n';

const offset1 = Buffer.byteLength(header);
const offset2 = offset1 + Buffer.byteLength(obj1);
const offset3 = offset2 + Buffer.byteLength(obj2);
const offset4 = offset3 + Buffer.byteLength(obj3);
const offset5 = offset4 + Buffer.byteLength(obj4);
const xrefOffset = offset5 + Buffer.byteLength(obj5);

function pad(n) {
  return String(n).padStart(10, '0');
}

const xref =
  'xref\n0 6\n0000000000 65535 f \n' +
  pad(offset1) +
  ' 00000 n \n' +
  pad(offset2) +
  ' 00000 n \n' +
  pad(offset3) +
  ' 00000 n \n' +
  pad(offset4) +
  ' 00000 n \n' +
  pad(offset5) +
  ' 00000 n \n';

const trailer =
  'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' +
  xrefOffset +
  '\n%%EOF\n';

const fullPdf = header + obj1 + obj2 + obj3 + obj4 + obj5 + xref + trailer;
fs.writeFileSync(path.join(fixturesDir, 'sample.pdf'), fullPdf);

// 2. DOCX
const docxZip = new AdmZip();
const docXml =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:body><w:p><w:r><w:t>Hello DOCX World! This is a valid sample document created for unit testing text extraction. It contains well over one hundred characters of selectable text.</w:t></w:r></w:p></w:body></w:document>';
docxZip.addFile('word/document.xml', Buffer.from(docXml, 'utf-8'));
fs.writeFileSync(path.join(fixturesDir, 'sample.docx'), docxZip.toBuffer());

// 3. PPTX
const pptxZip = new AdmZip();
const slideXml =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
  '<p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Hello PPTX World! This is a valid sample document created for unit testing text extraction. It contains well over one hundred characters of selectable text.</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>';
pptxZip.addFile('ppt/slides/slide1.xml', Buffer.from(slideXml, 'utf-8'));
fs.writeFileSync(path.join(fixturesDir, 'sample.pptx'), pptxZip.toBuffer());

// 4. TXT
fs.writeFileSync(
  path.join(fixturesDir, 'sample.txt'),
  'Hello TXT World! This is a valid sample document created for unit testing text extraction. It contains well over one hundred characters of selectable text.\n',
);

console.log('Fixtures generated successfully');
