import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { CandidateMatchDto, JobOpeningDto } from '@smart/contracts';

export type SuggestionExportRow = {
  rank: number;
  candidate: CandidateMatchDto;
  sent: boolean;
};

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function whyText(candidate: CandidateMatchDto): string {
  return (
    candidate.explanation.recruiterSummary ||
    candidate.explanation.why ||
    `Matched based on ${candidate.headlineTier} tier status and Level ${candidate.highestLevelCleared} clearance.`
  );
}

/** RFC 4180 CSV, UTF-8 BOM for Excel — matches the reports page export convention. */
export function buildSuggestionsCsv(opening: JobOpeningDto, rows: SuggestionExportRow[]): string {
  const metaLines = [
    `Company,${csvCell(opening.companyName)}`,
    `Role,${csvCell(opening.roleTitle)}`,
    `Location,${csvCell(opening.location)}`,
    `Headcount,${opening.headcount ?? 1}`,
    `Generated,${csvCell(new Date().toLocaleString())}`,
    '',
  ];

  const headers = [
    'Rank',
    'Candidate',
    'Track',
    'Headline Tier',
    'Match %',
    'Level Cleared',
    'Status',
    'Why This Match',
  ];

  const body = rows.map(({ rank, candidate, sent }) =>
    [
      rank,
      csvCell(candidate.studentName),
      csvCell(candidate.trackCode),
      csvCell(candidate.headlineTier),
      Math.round(candidate.matchScore * 100),
      candidate.highestLevelCleared,
      csvCell(sent ? 'Opportunity sent' : 'Not sent'),
      csvCell(whyText(candidate)),
    ].join(','),
  );

  return '﻿' + [...metaLines, headers.map(csvCell).join(','), ...body].join('\r\n');
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const SMART_TEAL = '#14b8a6';
const SMART_DARK = '#101828';
const SMART_MUTED = '#475467';

/**
 * Landscape one-pager: a SMART-branded header (teal accent band + wordmark),
 * the opening/company details this shortlist is for, and a ranked table of
 * candidates. Built entirely client-side — no server PDF service exists yet.
 */
export function buildSuggestionsPdf(opening: JobOpeningDto, rows: SuggestionExportRow[]): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(SMART_TEAL);
  doc.rect(0, 0, pageWidth, 14, 'F');
  doc.setTextColor(SMART_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SMART', 10, 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Role-Specific Readiness Certification Platform', 30, 9.5);

  doc.setTextColor(SMART_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Candidate Suggestions Report', 10, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(SMART_MUTED);
  const meta = [
    `Company: ${opening.companyName}`,
    `Role: ${opening.roleTitle}`,
    `Location: ${opening.location}`,
    `Headcount: ${opening.headcount ?? 1}`,
    `Generated: ${new Date().toLocaleString()}`,
  ];
  doc.text(meta.join('   ·   '), 10, 30);

  autoTable(doc, {
    startY: 36,
    head: [['#', 'Candidate', 'Track', 'Tier', 'Match %', 'Level', 'Status', 'Why This Match']],
    body: rows.map(({ rank, candidate, sent }) => [
      rank,
      candidate.studentName,
      candidate.trackCode,
      candidate.headlineTier,
      `${Math.round(candidate.matchScore * 100)}%`,
      candidate.highestLevelCleared,
      sent ? 'Opportunity sent' : 'Not sent',
      whyText(candidate),
    ]),
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: SMART_DARK, textColor: '#ffffff' },
    alternateRowStyles: { fillColor: '#f5f7fa' },
    columnStyles: { 7: { cellWidth: 90 } },
    margin: { left: 10, right: 10 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(SMART_MUTED);
    doc.text(
      `SMART · Generated ${new Date().toLocaleDateString()} · Page ${page} of ${pageCount}`,
      10,
      doc.internal.pageSize.getHeight() - 6,
    );
  }

  return doc;
}
