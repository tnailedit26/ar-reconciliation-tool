/**
 * ResultsStep — Step 3 of the wizard
 * Design: Refined Enterprise — left summary panel + Full Ledger view
 * The Full Ledger is the sole results view: all invoices in sequence,
 * matched rows grouped, discrepancies highlighted inline.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import VarianceChart from "@/components/VarianceChart";
import LedgerView from "@/components/LedgerView";
import {
  Download,
  RotateCcw,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ReconciliationResult,
  type DiscrepancyType,
  formatCurrency,
  exportToCsv,
  downloadCsv,
  DISCREPANCY_COLORS,
  DISCREPANCY_DOT,
} from "@/lib/reconciliation";
import { toast } from "sonner";

interface ResultsStepProps {
  result: ReconciliationResult;
  onReset: () => void;
}

const TYPE_ICONS: Record<DiscrepancyType, React.ReactNode> = {
  only_in_a: <XCircle className="w-3.5 h-3.5" />,
  only_in_b: <XCircle className="w-3.5 h-3.5" />,
  balance_mismatch: <ArrowLeftRight className="w-3.5 h-3.5" />,
  matched: <CheckCircle2 className="w-3.5 h-3.5" />,
};

export default function ResultsStep({ result, onReset }: ResultsStepProps) {
  const { summary, reportAName, reportBName, runAt } = result;
  const [notes, setNotes] = useState<Map<string, string>>(new Map());

  const handleNoteChange = (invoiceId: string, note: string) => {
    setNotes((prev) => {
      const next = new Map(prev);
      if (note) next.set(invoiceId, note);
      else next.delete(invoiceId);
      return next;
    });
  };

  const handleExport = () => {
    const csv = exportToCsv(result, "all", notes);
    downloadCsv(csv, `AR_Reconciliation_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success("CSV exported successfully");
  };

  const runDate = new Date(runAt).toLocaleString();

  const discrepancyBreakdown: { type: DiscrepancyType; label: string; count: number }[] = [
    { type: "only_in_a", label: `Only in ${reportAName}`, count: summary.totalOnlyInA },
    { type: "only_in_b", label: `Only in ${reportBName}`, count: summary.totalOnlyInB },
    { type: "balance_mismatch", label: "Balance Mismatch", count: summary.totalBalanceMismatch },
    { type: "matched", label: "Matched", count: summary.totalMatched },
  ];

  return (
    <div className="flex flex-col gap-0 animate-fade-in-up">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2
            className="text-base font-semibold text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Reconciliation Results
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {reportAName} vs {reportBName} &middot; Run {runDate}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleExport}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5"
            onClick={onReset}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Reconciliation
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* ── Left summary panel ── */}
        <div className="lg:w-60 flex-shrink-0 flex flex-col gap-3">
          {/* Total variance card */}
          <div className="rounded-lg border border-border p-4 bg-card">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Total A/R Variance
            </p>
            <p
              className={cn(
                "text-2xl font-bold leading-none",
                Math.abs(summary.totalVariance) < 0.01 ? "text-emerald-700" : "text-amber-700"
              )}
              style={{ fontFamily: "var(--font-display)", fontVariantNumeric: "tabular-nums" }}
            >
              {formatCurrency(Math.abs(summary.totalVariance))}
            </p>
            <div className="mt-3 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Report A Total</span>
                <span className="font-mono">{formatCurrency(summary.totalBalanceA)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Report B Total</span>
                <span className="font-mono">{formatCurrency(summary.totalBalanceB)}</span>
              </div>
              <div className="border-t border-border pt-1.5 flex justify-between font-medium text-foreground">
                <span>Explained</span>
                <span className="font-mono">{formatCurrency(summary.explainedVariance)}</span>
              </div>
            </div>
          </div>

          {/* Invoice counts */}
          <div className="rounded-lg border border-border p-4 bg-card">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Invoice Counts
            </p>
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Report A</span>
                <span className="font-mono font-medium">{summary.totalInvoicesA.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Report B</span>
                <span className="font-mono font-medium">{summary.totalInvoicesB.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-700 border-t border-border pt-1.5">
                <span>Matched</span>
                <span className="font-mono font-semibold">{summary.totalMatched.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Discrepancies</span>
                <span className="font-mono font-semibold">{summary.totalDiscrepancies.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Variance chart */}
          <VarianceChart result={result} />

          {/* Discrepancy breakdown legend */}
          <div className="rounded-lg border border-border p-4 bg-card">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Breakdown
            </p>
            <div className="flex flex-col gap-2">
              {discrepancyBreakdown.map(({ type, label, count }) => (
                count > 0 && (
                  <div key={type} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", DISCREPANCY_DOT[type])} />
                      <span className="text-[11px] text-muted-foreground truncate">{label}</span>
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0",
                        DISCREPANCY_COLORS[type]
                      )}
                    >
                      {count}
                    </span>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Notes indicator */}
          {notes.size > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
                <p className="text-[11px] text-primary/80 font-medium">
                  {notes.size} annotation{notes.size !== 1 ? "s" : ""} added
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Notes will be included in CSV export
              </p>
            </div>
          )}
        </div>

        {/* ── Main panel: Full Ledger only ── */}
        <div className="flex-1 min-w-0">
          <LedgerView result={result} notes={notes} onNoteChange={handleNoteChange} />
        </div>
      </div>
    </div>
  );
}

