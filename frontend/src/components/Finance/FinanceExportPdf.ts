import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FinanceKpis, ForecastPoint, CategoryBreakdown } from '../../lib/financeAnalytics';

export interface FinancePdfInput {
  businessName?: string;
  industry?: string;
  kpis: FinanceKpis;
  forecasts: ForecastPoint[] | null;
  topCategories: CategoryBreakdown[];
  narrative?: string;
}

const FOOTER = 'AI-generated estimate — not financial advice. Britsync Assistant.';

function gbp(n: number | null | undefined): string {
  if (n == null) return '—';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

export async function exportFinancePdf(data: FinancePdfInput): Promise<void> {
  const doc = new jsPDF() as any;
  const businessName = data.businessName || 'Britsync Business';
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Finance Snapshot', 15, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${businessName}${data.industry ? `  ·  ${data.industry}` : ''}`, 15, 26);
  doc.text(`Generated ${today}`, 15, 32);

  // KPI table
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Last 30 days', 15, 50);

  const kpiRows = [
    ['Revenue', gbp(data.kpis.last30Revenue)],
    ['Expenses', gbp(data.kpis.last30Expense)],
    ['Profit', gbp(data.kpis.last30Profit)],
    ['Margin', `${data.kpis.marginPct}%`],
    ['Revenue change vs prior 30 days', `${data.kpis.revenueChangePct >= 0 ? '+' : ''}${data.kpis.revenueChangePct}%`],
    ['Runway (if loss-making)', data.kpis.runwayDays == null ? 'n/a' : `${data.kpis.runwayDays} days`],
  ];

  autoTable(doc, {
    startY: 54,
    head: [['Metric', 'Value']],
    body: kpiRows,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    styles: { fontSize: 10 },
    margin: { left: 15, right: 15 },
  });

  let y = (doc as any).lastAutoTable.finalY + 10;

  // Forecast
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Projection (deterministic linear regression)', 15, y);
  y += 4;

  if (data.forecasts && data.forecasts.length) {
    const rows = data.forecasts.map(f => [
      f.point,
      gbp(f.predictedRevenue),
      gbp(f.predictedExpense),
      gbp(f.predictedRevenue - f.predictedExpense),
    ]);
    autoTable(doc, {
      startY: y + 2,
      head: [['By date', 'Projected revenue', 'Projected expense', 'Projected profit']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [107, 114, 128], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text('Not enough history (need at least 7 days of entries).', 15, y + 8);
    doc.setTextColor(31, 41, 55);
    y += 14;
  }

  // Top categories
  if (data.topCategories.length) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Top expense categories (30 days)', 15, y);
    const rows = data.topCategories.slice(0, 5).map(c => [
      c.category,
      gbp(c.amount),
      `${c.pct.toFixed(1)}%`,
    ]);
    autoTable(doc, {
      startY: y + 4,
      head: [['Category', 'Total', 'Share']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      styles: { fontSize: 9 },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Narrative
  if (data.narrative) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('AI commentary', 15, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(data.narrative, 180);
    doc.text(lines, 15, y);
  }

  // Footer on every page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(FOOTER, 105, 290, { align: 'center' });
  }

  const fileName = `BritSync_Finance_${businessName.replace(/\s+/g, '_')}_${today.replace(/\s+/g, '-')}.pdf`;
  doc.save(fileName);
}
