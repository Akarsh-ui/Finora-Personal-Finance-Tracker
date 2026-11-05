import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnalyticsData, Transaction } from '../types/finance';
import { formatDate, formatINR } from './formatters';

/**
 * Clean string for CSV escaping
 */
function escapeCSV(field: any): string {
  if (field === null || field === undefined) return '';
  const stringVal = String(field);
  if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return stringVal;
}

/**
 * Export filtered transactions as CSV file
 */
export function exportTransactionsCSV(transactions: Transaction[], periodLabel: string) {
  const headers = ['Date', 'Description', 'Type', 'Category', 'Amount (INR)', 'Payment Method', 'Notes'];

  const rows = transactions.map((tx) => [
    formatDate(tx.date),
    escapeCSV(tx.description || tx.title || 'Untitled'),
    escapeCSV(tx.type ? tx.type.toUpperCase() : 'EXPENSE'),
    escapeCSV(tx.category || 'Other'),
    tx.amount || 0,
    escapeCSV(tx.paymentMethod || 'N/A'),
    escapeCSV(tx.notes || ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const sanitizedPeriod = periodLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.setAttribute('download', `finora-transactions-${sanitizedPeriod}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download a branded Finora PDF Financial Summary Report
 */
export function exportFinancialReportPDF(
  analytics: AnalyticsData,
  user: { name: string; email: string },
  periodLabel: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Emerald theme colors
  const primaryColor: [number, number, number] = [5, 150, 105]; // emerald-600 #059669
  const darkTextColor: [number, number, number] = [15, 23, 42]; // slate-900 #0f172a
  const mutedTextColor: [number, number, number] = [100, 116, 139]; // slate-500 #64748b
  const lightBgColor: [number, number, number] = [248, 250, 252]; // #f8fafc

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FINORA', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('PERSONAL FINANCE TRACKER  ·  EXECUTIVE FINANCIAL REPORT', 14, 20);

  // Metadata block
  doc.setTextColor(...darkTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Financial Statement & Performance Summary', 14, 35);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedTextColor);
  doc.text(`Account Holder: ${user.name || 'Finora User'} (${user.email || 'N/A'})`, 14, 41);
  doc.text(`Reporting Period: ${periodLabel}`, 14, 46);
  doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`, 14, 51);

  // Key Financial Metrics Table
  const { summary } = analytics;
  const netSavingsText = formatINR(summary.netSavings);
  const savingsRateText = `${summary.savingsRate}%`;

  autoTable(doc, {
    startY: 56,
    theme: 'grid',
    head: [['Metric', 'Current Period', 'Previous Equivalent Period', 'Variance / % Change']],
    body: [
      [
        'Total Income (Inflow)',
        formatINR(summary.totalIncome),
        formatINR(summary.prevTotalIncome),
        `${summary.incomeChangePct >= 0 ? '+' : ''}${summary.incomeChangePct}%`,
      ],
      [
        'Total Expenses (Outflow)',
        formatINR(summary.totalExpenses),
        formatINR(summary.prevTotalExpenses),
        `${summary.expenseChangePct >= 0 ? '+' : ''}${summary.expenseChangePct}%`,
      ],
      [
        'Net Savings',
        netSavingsText,
        formatINR(summary.prevNetSavings),
        `${summary.netSavingsChangePct >= 0 ? '+' : ''}${summary.netSavingsChangePct}%`,
      ],
      [
        'Savings Rate',
        savingsRateText,
        summary.prevTotalIncome > 0
          ? `${Number(((summary.prevNetSavings / summary.prevTotalIncome) * 100).toFixed(1))}%`
          : 'N/A',
        summary.savingsRate >= 20 ? 'Healthy (>20%)' : 'Caution (<20%)',
      ],
    ],
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: darkTextColor,
    },
    alternateRowStyles: {
      fillColor: lightBgColor,
    },
  });

  let currentY = (doc as any).lastAutoTable?.finalY || 95;

  // Top Expense Categories Table
  if (analytics.expenseBreakdown.length > 0) {
    currentY += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...darkTextColor);
    doc.text('Expense Breakdown by Category', 14, currentY);

    autoTable(doc, {
      startY: currentY + 3,
      theme: 'striped',
      head: [['Category', 'Amount (INR)', '% of Outflows', 'Significance']],
      body: analytics.expenseBreakdown.map((item, idx) => [
        item.category,
        formatINR(item.amount),
        `${item.percentage}%`,
        idx === 0 ? 'Highest Outflow Area' : item.percentage >= 20 ? 'Major Outflow' : 'Discretionary / Routine',
      ]),
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
      },
    });

    currentY = (doc as any).lastAutoTable?.finalY || currentY + 40;
  }

  // Income Sources Table
  if (analytics.incomeBreakdown.length > 0) {
    currentY += 8;
    // Check if new page needed
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...darkTextColor);
    doc.text('Income Inflow Distribution', 14, currentY);

    autoTable(doc, {
      startY: currentY + 3,
      theme: 'striped',
      head: [['Source / Category', 'Amount (INR)', '% of Inflows']],
      body: analytics.incomeBreakdown.map((item) => [
        item.category,
        formatINR(item.amount),
        `${item.percentage}%`,
      ]),
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
      },
    });

    currentY = (doc as any).lastAutoTable?.finalY || currentY + 40;
  }

  // Key Automated Insights
  if (analytics.insights.length > 0) {
    currentY += 8;
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...darkTextColor);
    doc.text('Automated Financial Insights', 14, currentY);

    autoTable(doc, {
      startY: currentY + 3,
      theme: 'plain',
      body: analytics.insights.map((ins) => [`•  [${ins.title}]  ${ins.description}`]),
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [51, 65, 85],
      },
    });

    currentY = (doc as any).lastAutoTable?.finalY || currentY + 30;
  }

  // Detailed Transaction Records in Period (Up to first 50 transactions to keep report concise)
  if (analytics.transactions.length > 0) {
    currentY += 8;
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...darkTextColor);
    doc.text(`Transaction Ledger (${analytics.transactions.length} records)`, 14, currentY);

    const txRecords = analytics.transactions.slice(0, 60);

    autoTable(doc, {
      startY: currentY + 3,
      theme: 'grid',
      head: [['Date', 'Description', 'Type', 'Category', 'Amount (INR)', 'Method']],
      body: txRecords.map((t) => [
        formatDate(t.date),
        t.description || t.title || 'Untitled',
        (t.type || 'expense').toUpperCase(),
        t.category || 'Other',
        formatINR(t.amount),
        t.paymentMethod || '—',
      ]),
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: lightBgColor,
      },
    });
  }

  // Add page numbers on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedTextColor);
    doc.text(
      `Finora Personal Finance Tracker  ·  Page ${i} of ${totalPages}  ·  Strict User Isolation Guaranteed`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  const sanitizedPeriod = periodLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`finora-financial-report-${sanitizedPeriod}.pdf`);
}
