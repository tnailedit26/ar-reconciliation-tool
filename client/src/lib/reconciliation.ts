/**
 * A/R Reconciliation Engine
 * Design: Refined Enterprise — Sora/DM Sans/DM Mono typography, deep teal primary, muted status colors
 *
 * Core logic for parsing invoice reports and computing discrepancies.
 * All comparison is done client-side; no data leaves the browser.
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawRow {
  [key: string]: string | number | null | undefined;
}

export interface ParsedFile {
  fileName: string;
  rows: RawRow[];
  headers: string[];
}

export interface ColumnMapping {
  invoiceId: string;
  balance: string;
  customerName: string;
  invoiceDate: string;
}

export interface ReconciliationConfig {
  reportA: ParsedFile;
  reportB: ParsedFile;
  mappingA: ColumnMapping;
  mappingB: ColumnMapping;
}

export type DiscrepancyType =
  | "only_in_a"
  | "only_in_b"
  | "balance_mismatch"
  | "matched";

export interface NormalizedInvoice {
  invoiceId: string;
  balance: number | null;
  customerName: string;
  invoiceDate: string;
  raw: RawRow;
}

export interface DiscrepancyRecord {
  invoiceId: string;
  type: DiscrepancyType;
  balanceA: number | null;
  balanceB: number | null;
  balanceDiff: number | null;
  customerNameA?: string;
  customerNameB?: string;
  invoiceDateA?: string;
  invoiceDateB?: string;
}

export interface ReconciliationSummary {
  totalInvoicesA: number;
  totalInvoicesB: number;
  totalMatched: number;
  totalOnlyInA: number;
  totalOnlyInB: number;
  totalBalanceMismatch: number;
  totalDiscrepancies: number;
  totalBalanceA: number;
  totalBalanceB: number;
  totalVariance: number;
  /** Variance explained by missing invoices + balance mismatches */
  explainedVariance: number;
}

export interface ReconciliationResult {
  summary: ReconciliationSummary;
  records: DiscrepancyRecord[];
  reportAName: string;
  reportBName: string;
  runAt: string;
}

// ─── File Parsing ─────────────────────────────────────────────────────────────

export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv" || ext === "txt") {
    return parseCsv(file);
  } else if (ext === "xlsx" || ext === "xls") {
    return parseExcel(file);
  } else {
    throw new Error(
      `Unsupported file type: .${ext}. Please upload a CSV or Excel file.`
    );
  }
}

async function parseCsv(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error(`CSV parse error: ${results.errors[0].message}`));
          return;
        }
        const headers = (results.meta.fields ?? []).filter((h) => h && h.trim().length > 0);
        resolve({
          fileName: file.name,
          rows: results.data,
          headers,
        });
      },
      error: (err) => reject(new Error(`CSV parse error: ${err.message}`)),
    });
  });
}

async function parseExcel(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: RawRow[] = XLSX.utils.sheet_to_json(sheet, {
          defval: null,
          raw: false,
        });
        const headers = (rows.length > 0 ? Object.keys(rows[0]) : []).filter((h) => h && h.trim().length > 0);
        resolve({
          fileName: file.name,
          rows,
          headers,
        });
      } catch (err) {
        reject(new Error(`Excel parse error: ${String(err)}`));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Normalization ────────────────────────────────────────────────────────────

function parseBalance(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const str = String(raw)
    .replace(/[$,\s]/g, "")
    .replace(/\(([^)]+)\)/, "-$1"); // handle (1234.56) as negative
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function normalizeInvoice(
  row: RawRow,
  mapping: ColumnMapping
): NormalizedInvoice {
  const rawId = row[mapping.invoiceId];
  const invoiceId = rawId !== null && rawId !== undefined ? String(rawId).trim() : "";
  const rawBalance = row[mapping.balance];
  const balance = parseBalance(rawBalance as string | number | null);
  return {
    invoiceId,
    balance,
    customerName: String(row[mapping.customerName] ?? ""),
    invoiceDate: String(row[mapping.invoiceDate] ?? ""),
    raw: row,
  };
}

// ─── Reconciliation Engine ────────────────────────────────────────────────────

export function reconcile(config: ReconciliationConfig): ReconciliationResult {
  const { reportA, reportB, mappingA, mappingB } = config;

  // Build maps keyed by normalized invoice ID
  const mapA = new Map<string, NormalizedInvoice>();
  const mapB = new Map<string, NormalizedInvoice>();

  for (const row of reportA.rows) {
    const inv = normalizeInvoice(row, mappingA);
    if (inv.invoiceId) mapA.set(inv.invoiceId.toUpperCase(), inv);
  }

  for (const row of reportB.rows) {
    const inv = normalizeInvoice(row, mappingB);
    if (inv.invoiceId) mapB.set(inv.invoiceId.toUpperCase(), inv);
  }

  const allIds = new Set([...Array.from(mapA.keys()), ...Array.from(mapB.keys())]);
  const records: DiscrepancyRecord[] = [];

  let totalBalanceA = 0;
  let totalBalanceB = 0;

  for (const id of Array.from(allIds)) {
    const a = mapA.get(id) ?? null;
    const b = mapB.get(id) ?? null;

    if (a) totalBalanceA += a.balance ?? 0;
    if (b) totalBalanceB += b.balance ?? 0;

    let type: DiscrepancyType;

    if (!a) {
      type = "only_in_b";
    } else if (!b) {
      type = "only_in_a";
    } else {
      const balanceMismatch = (a.balance ?? 0) !== (b.balance ?? 0);
      type = balanceMismatch ? "balance_mismatch" : "matched";
    }

    const balanceDiff =
      a !== null && b !== null
        ? (a.balance ?? 0) - (b.balance ?? 0)
        : null;

    records.push({
      invoiceId: a?.invoiceId ?? b?.invoiceId ?? id,
      type,
      balanceA: a?.balance ?? null,
      balanceB: b?.balance ?? null,
      balanceDiff,
      customerNameA: a?.customerName,
      customerNameB: b?.customerName,
      invoiceDateA: a?.invoiceDate,
      invoiceDateB: b?.invoiceDate,
    });
  }

  // Sort: discrepancies first, then matched
  const order: Record<DiscrepancyType, number> = {
    only_in_a: 0,
    only_in_b: 1,
    balance_mismatch: 2,
    matched: 3,
  };
  records.sort((a, b) => order[a.type] - order[b.type]);

  const totalMatched = records.filter((r) => r.type === "matched").length;
  const totalOnlyInA = records.filter((r) => r.type === "only_in_a").length;
  const totalOnlyInB = records.filter((r) => r.type === "only_in_b").length;
  const totalBalanceMismatch = records.filter(
    (r) => r.type === "balance_mismatch"
  ).length;
  const totalDiscrepancies =
    totalOnlyInA +
    totalOnlyInB +
    totalBalanceMismatch;

  const totalVariance = totalBalanceA - totalBalanceB;

  // Explained variance: sum of balance diffs for mismatched + missing invoices
  const explainedVariance = records
    .filter((r) => r.type !== "matched")
    .reduce((sum, r) => {
      if (r.type === "only_in_a") return sum + (r.balanceA ?? 0);
      if (r.type === "only_in_b") return sum - (r.balanceB ?? 0);
      return sum + (r.balanceDiff ?? 0);
    }, 0);

  const summary: ReconciliationSummary = {
    totalInvoicesA: mapA.size,
    totalInvoicesB: mapB.size,
    totalMatched,
    totalOnlyInA,
    totalOnlyInB,
    totalBalanceMismatch,
    totalDiscrepancies,
    totalBalanceA,
    totalBalanceB,
    totalVariance,
    explainedVariance,
  };

  return {
    summary,
    records,
    reportAName: reportA.fileName,
    reportBName: reportB.fileName,
    runAt: new Date().toISOString(),
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function exportToCsv(
  result: ReconciliationResult,
  filter?: DiscrepancyType | "all",
  notes?: Map<string, string>
): string {
  const rows =
    !filter || filter === "all"
      ? result.records
      : result.records.filter((r) => r.type === filter);

  const aLabel = stripExtension(result.reportAName);
  const bLabel = stripExtension(result.reportBName);

  const headers = [
    "Invoice ID",
    "Discrepancy Type",
    `Balance (${aLabel})`,
    `Balance (${bLabel})`,
    "Balance Difference",
    "Customer",
    "Invoice Date",
    "Notes",
  ];

  const typeLabel = makeTypeLabels(aLabel, bLabel);

  const csvRows = rows.map((r) => [
    r.invoiceId,
    typeLabel[r.type],
    r.balanceA !== null ? r.balanceA.toFixed(2) : "",
    r.balanceB !== null ? r.balanceB.toFixed(2) : "",
    r.balanceDiff !== null ? r.balanceDiff.toFixed(2) : "",
    r.customerNameA ?? r.customerNameB ?? "",
    r.invoiceDateA ?? r.invoiceDateB ?? "",
    notes?.get(r.invoiceId) ?? "",
  ]);

  return Papa.unparse({ fields: headers, data: csvRows });
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip file extension from a filename for use as a short label */
export function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

/** Build dynamic type labels using the actual report names (e.g. "QBO AR", "HCP AR") */
export function makeTypeLabels(
  aLabel: string,
  bLabel: string
): Record<DiscrepancyType, string> {
  return {
    only_in_a: `${aLabel} AR`,
    only_in_b: `${bLabel} AR`,
    balance_mismatch: "Balance Mismatch",
    matched: "Matched",
  };
}

export function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function discrepancyLabel(
  type: DiscrepancyType,
  reportAName?: string,
  reportBName?: string
): string {
  const aLabel = reportAName ? stripExtension(reportAName) : "Report A";
  const bLabel = reportBName ? stripExtension(reportBName) : "Report B";
  return makeTypeLabels(aLabel, bLabel)[type];
}

export const DISCREPANCY_COLORS: Record<DiscrepancyType, string> = {
  only_in_a: "text-rose-700 bg-rose-50 border-rose-200",
  only_in_b: "text-orange-700 bg-orange-50 border-orange-200",
  balance_mismatch: "text-amber-700 bg-amber-50 border-amber-200",
  matched: "text-emerald-700 bg-emerald-50 border-emerald-200",
};

export const DISCREPANCY_DOT: Record<DiscrepancyType, string> = {
  only_in_a: "bg-rose-500",
  only_in_b: "bg-orange-500",
  balance_mismatch: "bg-amber-500",
  matched: "bg-emerald-500",
};

// ─── Sample Data Generator ────────────────────────────────────────────────────

export function generateSampleCsv(variant: "a" | "b"): string {
  const baseInvoices = [
    { id: "INV-1001", customer: "Acme Corp", date: "2024-01-05", due: "2024-02-05", balanceA: 12500.0, balanceB: 12500.0, statusA: "Open", statusB: "Open" },
    { id: "INV-1002", customer: "Globex Inc", date: "2024-01-08", due: "2024-02-08", balanceA: 4320.5, balanceB: 4320.5, statusA: "Open", statusB: "Open" },
    { id: "INV-1003", customer: "Initech LLC", date: "2024-01-10", due: "2024-02-10", balanceA: 8750.0, balanceB: 8750.0, statusA: "Closed", statusB: "Closed" },
    { id: "INV-1004", customer: "Umbrella Co", date: "2024-01-12", due: "2024-02-12", balanceA: 3200.0, balanceB: 3200.0, statusA: "Open", statusB: "Open" },
    { id: "INV-1005", customer: "Stark Industries", date: "2024-01-15", due: "2024-02-15", balanceA: 22000.0, balanceB: 22000.0, statusA: "Open", statusB: "Open" },
    // Balance mismatch
    { id: "INV-1006", customer: "Wayne Enterprises", date: "2024-01-18", due: "2024-02-18", balanceA: 9800.0, balanceB: 9500.0, statusA: "Open", statusB: "Open" },
    // Status mismatch
    { id: "INV-1007", customer: "Oscorp", date: "2024-01-20", due: "2024-02-20", balanceA: 5600.0, balanceB: 5600.0, statusA: "Open", statusB: "Closed" },
    // Balance + status mismatch
    { id: "INV-1008", customer: "LexCorp", date: "2024-01-22", due: "2024-02-22", balanceA: 14200.0, balanceB: 11000.0, statusA: "Open", statusB: "Closed" },
    // Only in A
    { id: "INV-1009", customer: "Cyberdyne Systems", date: "2024-01-25", due: "2024-02-25", balanceA: 6700.0, balanceB: null, statusA: "Open", statusB: null },
    { id: "INV-1010", customer: "Weyland Corp", date: "2024-01-28", due: "2024-02-28", balanceA: 3100.0, balanceB: null, statusA: "Closed", statusB: null },
    // Only in B
    { id: "INV-1011", customer: "Soylent Corp", date: "2024-01-30", due: "2024-03-01", balanceA: null, balanceB: 8900.0, statusA: null, statusB: "Open" },
    // More matched
    { id: "INV-1012", customer: "Massive Dynamic", date: "2024-02-01", due: "2024-03-01", balanceA: 17500.0, balanceB: 17500.0, statusA: "Open", statusB: "Open" },
    { id: "INV-1013", customer: "Rekall Inc", date: "2024-02-03", due: "2024-03-03", balanceA: 2800.0, balanceB: 2800.0, statusA: "Closed", statusB: "Closed" },
    { id: "INV-1014", customer: "Tyrell Corp", date: "2024-02-05", due: "2024-03-05", balanceA: 45000.0, balanceB: 45000.0, statusA: "Open", statusB: "Open" },
    { id: "INV-1015", customer: "Nakatomi Corp", date: "2024-02-08", due: "2024-03-08", balanceA: 6200.0, balanceB: 6200.0, statusA: "Open", statusB: "Open" },
  ];

  if (variant === "a") {
    const rows = baseInvoices
      .filter((inv) => inv.balanceA !== null)
      .map((inv) => ({
        "Invoice Number": inv.id,
        "Customer Name": inv.customer,
        "Invoice Date": inv.date,
        "Due Date": inv.due,
        "Outstanding Balance": inv.balanceA,
        "Status": inv.statusA,
      }));
    return Papa.unparse(rows);
  } else {
    const rows = baseInvoices
      .filter((inv) => inv.balanceB !== null)
      .map((inv) => ({
        "Invoice #": inv.id,
        "Client": inv.customer,
        "Date": inv.date,
        "Due": inv.due,
        "Balance": inv.balanceB,
        "Payment Status": inv.statusB,
      }));
    return Papa.unparse(rows);
  }
}
