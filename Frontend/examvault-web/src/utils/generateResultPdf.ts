import { jsPDF } from 'jspdf';
import { getGrade } from '../types/result';
import type { ResultSummaryResponse } from '../types/result';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function sanitizeFilename(title: string): string {
  return title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'exam';
}

export function generateResultPdf(result: ResultSummaryResponse): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Exam Result', MARGIN, y);
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(result.examTitle, MARGIN, y);
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Completed on ${new Date(result.submittedAtUtc).toLocaleString()}`, MARGIN, y);
  doc.setTextColor(0);
  y += 10;

  const percentage = result.totalMarks > 0 ? Math.round((result.totalScore / result.totalMarks) * 100) : 0;
  const grade = getGrade(result.totalScore, result.totalMarks, result.passed);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`Score: ${result.totalScore} / ${result.totalMarks} (${percentage}%)`, MARGIN, y);
  y += 7;
  doc.text(`Grade: ${grade}    Status: ${result.passed ? 'Passed' : 'Failed'}`, MARGIN, y);
  y += 10;

  const questions = result.questions;
  if (questions && questions.length > 0) {
    const correctCount = questions.filter((q) => q.isCorrect).length;
    const incorrectCount = questions.filter((q) => q.selectedOptionId !== null && !q.isCorrect).length;
    const unattemptedCount = questions.filter((q) => q.selectedOptionId === null).length;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Performance Analysis', MARGIN, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Correct: ${correctCount}    Incorrect: ${incorrectCount}    Unattempted: ${unattemptedCount}`, MARGIN, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    ensureSpace(8);
    doc.text('Answer Review', MARGIN, y);
    y += 8;

    questions.forEach((question, index) => {
      ensureSpace(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      const questionLines = doc.splitTextToSize(`${index + 1}. ${question.questionText}`, CONTENT_WIDTH - 20);
      ensureSpace(questionLines.length * 5 + 4);
      doc.text(questionLines, MARGIN, y);
      const scoreLabel = question.isCorrect ? `+${question.marksAwarded}/${question.marks}` : `0/${question.marks}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(question.isCorrect ? 30 : 180, question.isCorrect ? 130 : 40, 30);
      doc.text(scoreLabel, PAGE_WIDTH - MARGIN, y, { align: 'right' });
      doc.setTextColor(0);
      y += questionLines.length * 5 + 2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      question.options.forEach((option) => {
        const isSelected = option.optionId === question.selectedOptionId;
        const marker = option.isCorrect ? '(correct)' : isSelected ? '(your answer)' : '';
        const lines = doc.splitTextToSize(`- ${option.optionText} ${marker}`.trim(), CONTENT_WIDTH - 8);
        ensureSpace(lines.length * 4.6);
        if (option.isCorrect) {
          doc.setTextColor(30, 130, 30);
        } else if (isSelected) {
          doc.setTextColor(180, 40, 30);
        } else {
          doc.setTextColor(60);
        }
        doc.text(lines, MARGIN + 4, y);
        doc.setTextColor(0);
        y += lines.length * 4.6;
      });
      y += 4;
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text("The correct answers for this exam aren't available to view.", MARGIN, y);
    doc.setTextColor(0);
  }

  doc.save(`${sanitizeFilename(result.examTitle)}-result.pdf`);
}
