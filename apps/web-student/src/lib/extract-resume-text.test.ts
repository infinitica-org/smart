import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractResumeRawText } from './extract-resume-text.js';

describe('extractResumeRawText', () => {
  it('extracts text from a plain text file (.txt)', async () => {
    const plainText =
      'Vishal Bharath R\nAspiring Full Stack Developer\nEducation: Kongu Engineering College\nSkills: React, Node, TypeScript';
    const file = new File([plainText], 'resume.txt', { type: 'text/plain' });

    const result = await extractResumeRawText(file);
    expect(result).toContain('Vishal Bharath R');
    expect(result).toContain('Kongu Engineering College');
  });

  it('extracts text from real sample PDF resume (VISHAL_BHARATH_RESUME_UPF.pdf)', async () => {
    const pdfPath = path.resolve(process.cwd(), '../../VISHAL_BHARATH_RESUME_UPF.pdf');
    if (!fs.existsSync(pdfPath)) return;

    const pdfBuffer = fs.readFileSync(pdfPath);
    const file = new File([pdfBuffer], 'VISHAL_BHARATH_RESUME_UPF.pdf', {
      type: 'application/pdf',
    });

    const result = await extractResumeRawText(file);
    expect(result.length).toBeGreaterThan(100);
    expect(result).toContain('VishalBharath');
  }, 30000);

  it('extracts text from ReportLab ASCII85 PDF resume (Vishal_Bharath_Siemens_EDA_Resume_Updated.pdf)', async () => {
    const pdfPath = path.resolve(
      process.cwd(),
      '../../Vishal_Bharath_Siemens_EDA_Resume_Updated.pdf',
    );
    if (!fs.existsSync(pdfPath)) return;

    const pdfBuffer = fs.readFileSync(pdfPath);
    const file = new File([pdfBuffer], 'Vishal_Bharath_Siemens_EDA_Resume_Updated.pdf', {
      type: 'application/pdf',
    });

    const result = await extractResumeRawText(file);
    expect(result.length).toBeGreaterThan(500);
    expect(result).toContain('VISHAL BHARATH R');
    expect(result).toContain('vishalbharathonly@gmail.com');
    expect(result).toContain('Kongu Engineering College');
  }, 30000);

  it('rejects files with insufficient readable text', async () => {
    const file = new File(['short text'], 'resume.txt', { type: 'text/plain' });
    await expect(extractResumeRawText(file)).rejects.toThrow(
      'Could not read enough text from this file',
    );
  });
});
