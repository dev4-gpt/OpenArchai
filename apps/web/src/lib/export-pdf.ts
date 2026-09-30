// AtelierOS PDF Export Engine
// Generates professional architectural compliance reports and BOQ cost sheets
// Uses jsPDF + jsPDF-AutoTable for production-quality output.
//
// Usage (client-side only — do NOT import in server components):
//   import { exportCompliancePDF, exportBOQPDF } from "@/lib/export-pdf";

import type { ComplianceReport } from "@/lib/compliance-engine";
import type { ProjectCostEstimate } from "@/lib/cost-calculator";

// ── Brand palette ─────────────────────────────────────────────────────────────
const BRAND = {
  accent: [74, 58, 42] as [number, number, number],      // warm brown
  foreground: [30, 27, 24] as [number, number, number],  // near-black
  muted: [120, 110, 100] as [number, number, number],    // muted text
  surface: [245, 242, 236] as [number, number, number],  // warm paper
  border: [210, 204, 196] as [number, number, number],   // border
  success: [34, 120, 80] as [number, number, number],    // green
  danger: [185, 50, 50] as [number, number, number],     // red
  warning: [180, 130, 30] as [number, number, number],   // amber
};

function formatDate(): string {
  return new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ── Header shared across reports ──────────────────────────────────────────────
function drawHeader(
  doc: InstanceType<typeof import("jspdf").jsPDF>,
  title: string,
  projectName: string,
) {
  const pw = doc.internal.pageSize.getWidth();

  // Top bar
  doc.setFillColor(...BRAND.accent);
  doc.rect(0, 0, pw, 14, "F");

  // AtelierOS wordmark
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ATELIEROS", 12, 9.5);

  // Report type on right
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(title.toUpperCase(), pw - 12, 9.5, { align: "right" });

  // Project name + date
  doc.setTextColor(...BRAND.foreground);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(projectName, 12, 26);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(`Generated: ${formatDate()}`, 12, 32);

  // Separator line
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.3);
  doc.line(12, 36, pw - 12, 36);
}

// ── Footer ────────────────────────────────────────────────────────────────────
function drawFooter(doc: InstanceType<typeof import("jspdf").jsPDF>) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.2);
  doc.line(12, ph - 14, pw - 12, ph - 14);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("AtelierOS — Intelligent Architecture OS", 12, ph - 9);
  doc.text(`Page 1 of 1  ·  ${formatDate()}`, pw - 12, ph - 9, { align: "right" });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE REPORT PDF
// ─────────────────────────────────────────────────────────────────────────────
export async function exportCompliancePDF(
  report: ComplianceReport,
  projectName = "Architectural Project",
): Promise<void> {
  // Lazy-load jsPDF and autoTable to keep initial bundle small
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();

  drawHeader(doc, "Compliance Report", projectName);

  // ── Score banner ──────────────────────────────────────────────────────────
  const scoreColor =
    report.score >= 80 ? BRAND.success : report.score >= 50 ? BRAND.warning : BRAND.danger;

  doc.setFillColor(...BRAND.surface);
  doc.roundedRect(12, 42, pw - 24, 22, 2, 2, "F");
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(12, 42, pw - 24, 22, 2, 2, "D");

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...scoreColor);
  doc.text(`${report.score}%`, 20, 59);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text("Compliance Score", 40, 53);
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.foreground);
  doc.text(report.standardName, 40, 59);
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    `${report.passedCount} of ${report.totalChecks} verified checks passed · ${report.unverifiedCount} unverified`,
    40,
    65,
  );

  // ── Issues table ──────────────────────────────────────────────────────────
  const tableRows = report.issues.map((issue) => [
    issue.code,
    issue.category,
    issue.severity.toUpperCase(),
    issue.message,
    issue.passed ? "PASS" : issue.verified ? "FAIL" : "UNVERIFIED",
  ]);

  autoTable(doc, {
    startY: 70,
    head: [["Code", "Category", "Severity", "Finding", "Result"]],
    body: tableRows,
    margin: { left: 12, right: 12 },
    headStyles: {
      fillColor: BRAND.accent,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 7.5, textColor: BRAND.foreground },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: "bold" },
      1: { cellWidth: 34 },
      2: { cellWidth: 18 },
      3: { cellWidth: "auto" },
      4: { cellWidth: 22, halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.column.index === 4 && data.section === "body") {
        const val = data.cell.raw as string;
        if (val === "PASS") data.cell.styles.textColor = BRAND.success;
        else if (val === "FAIL") data.cell.styles.textColor = BRAND.danger;
        else data.cell.styles.textColor = BRAND.warning;
      }
      if (data.column.index === 2 && data.section === "body") {
        const val = (data.cell.raw as string).toLowerCase();
        if (val === "error") data.cell.styles.textColor = BRAND.danger;
        else if (val === "warning") data.cell.styles.textColor = BRAND.warning;
      }
    },
    alternateRowStyles: { fillColor: [250, 248, 245] },
  });

  // ── Disclaimer ────────────────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable?.finalY ?? 180;
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    "This report is auto-generated from extracted floor plan geometry. Unverified checks require on-site measurement and professional review. Not a substitute for statutory approvals.",
    12,
    finalY + 8,
    { maxWidth: pw - 24 },
  );

  drawFooter(doc);

  const filename = `${projectName.replace(/[^a-z0-9]/gi, "_")}_compliance_report.pdf`;
  doc.save(filename);
}

// ─────────────────────────────────────────────────────────────────────────────
// BOQ COST ESTIMATE PDF
// ─────────────────────────────────────────────────────────────────────────────
export async function exportBOQPDF(
  estimate: ProjectCostEstimate,
  projectName = "Architectural Project",
  tier: "budget" | "mid" | "premium" = "mid",
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const isIndia = estimate.currency === "INR";
  const sym = estimate.symbol;

  drawHeader(doc, "Bill of Quantities", projectName);

  // ── Project summary ───────────────────────────────────────────────────────
  doc.setFillColor(...BRAND.surface);
  doc.roundedRect(12, 42, pw - 24, 28, 2, 2, "F");
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(12, 42, pw - 24, 28, 2, 2, "D");

  const summaryData = [
    [`Floor Area`, `${estimate.floorAreaSqFt} sqft  (${estimate.floorAreaSqM} m²)`],
    [`Wall Perimeter`, `${estimate.wallPerimeterM} m linear`],
    [`Doors / Windows`, `${estimate.doorCount} doors · ${estimate.windowCount} windows`],
    [`Bathrooms`, `${estimate.bathroomsCount} wet zones`],
    [`Tier`, tier.toUpperCase()],
    [`Region`, isIndia ? "India (INR)" : "United States (USD)"],
  ];

  const col1X = 20;
  const col2X = 80;
  let sy = 50;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.muted);

  summaryData.forEach(([label, value], i) => {
    if (i === 3) { sy = 50; col2X; } // second column
    const x = i < 3 ? col1X : col1X + 90;
    const y = i < 3 ? 50 + i * 7 : 50 + (i - 3) * 7;
    doc.setTextColor(...BRAND.muted);
    doc.text(label + ":", x, y);
    doc.setTextColor(...BRAND.foreground);
    doc.text(value, x + 40, y);
  });

  // ── BOQ line items table ──────────────────────────────────────────────────
  const tableRows = estimate.items.map((item) => {
    const rate = tier === "budget" ? item.rateBudget : tier === "mid" ? item.rateMid : item.ratePremium;
    const total = Math.round(item.quantity * rate);
    return [
      item.category,
      item.description,
      String(item.quantity),
      item.unit,
      `${sym}${rate.toLocaleString("en-IN")}`,
      `${sym}${total.toLocaleString("en-IN")}`,
    ];
  });

  // Totals rows
  const grandTotal = estimate.grandTotal[tier];
  const subtotal = estimate.totals[tier];
  const contingency = estimate.contingency[tier];

  autoTable(doc, {
    startY: 76,
    head: [["Trade Package", "Description", "Qty", "Unit", "Rate", "Amount"]],
    body: tableRows,
    foot: [
      ["", "", "", "", "Subtotal", `${sym}${subtotal.toLocaleString("en-IN")}`],
      ["", "", "", "", "Contingency (10%)", `${sym}${contingency.toLocaleString("en-IN")}`],
      ["", "", "", "", "GRAND TOTAL", `${sym}${grandTotal.toLocaleString("en-IN")}`],
    ],
    margin: { left: 12, right: 12 },
    headStyles: {
      fillColor: BRAND.accent,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 7.5, textColor: BRAND.foreground },
    footStyles: { fillColor: BRAND.surface, textColor: BRAND.foreground, fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 34, fontStyle: "bold" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 12, halign: "right" },
      3: { cellWidth: 14 },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 26, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "foot" && data.row.index === 2) {
        data.cell.styles.fillColor = BRAND.accent;
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = "bold";
      }
    },
    alternateRowStyles: { fillColor: [250, 248, 245] },
  });

  // ── Rate/sqft summary ────────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable?.finalY ?? 220;
  const ratePerSqFt = Math.round(grandTotal / Math.max(1, estimate.floorAreaSqFt));
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.foreground);
  doc.text(`All-in Rate: ${sym}${ratePerSqFt.toLocaleString("en-IN")} / sqft`, pw - 12, finalY + 8, {
    align: "right",
  });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(
    "Rates are indicative and subject to market conditions, site location, and material specifications. All amounts exclude GST/taxes.",
    12,
    finalY + 15,
    { maxWidth: pw - 24 },
  );

  drawFooter(doc);

  const filename = `${projectName.replace(/[^a-z0-9]/gi, "_")}_BOQ_${tier}.pdf`;
  doc.save(filename);
}
