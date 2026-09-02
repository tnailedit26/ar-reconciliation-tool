/**
 * VarianceChart — Visual breakdown of variance by discrepancy type
 * Design: Refined Enterprise — horizontal stacked bar with type legend
 */
import { formatCurrency, type ReconciliationResult, type DiscrepancyType } from "@/lib/reconciliation";
import { cn } from "@/lib/utils";

interface VarianceChartProps {
  result: ReconciliationResult;
}

interface Segment {
  type: DiscrepancyType;
  label: string;
  amount: number;
  color: string;
}

export default function VarianceChart({ result }: VarianceChartProps) {
  const { records, reportAName, reportBName } = result;

  const segments: Segment[] = ([
    {
      type: "only_in_a" as DiscrepancyType,
      label: `Only in ${reportAName}`,
      amount: records
        .filter((r) => r.type === "only_in_a")
        .reduce((s, r) => s + (r.balanceA ?? 0), 0),
      color: "#BE123C",
    },
    {
      type: "only_in_b" as DiscrepancyType,
      label: `Only in ${reportBName}`,
      amount: -records
        .filter((r) => r.type === "only_in_b")
        .reduce((s, r) => s + (r.balanceB ?? 0), 0),
      color: "#C2410C",
    },
    {
      type: "balance_mismatch" as DiscrepancyType,
      label: "Balance Mismatch",
      amount: records
        .filter((r) => r.type === "balance_mismatch")
        .reduce((s, r) => s + (r.balanceDiff ?? 0), 0),
      color: "#B45309",
    },
  ] as Segment[]).filter((s) => Math.abs(s.amount) > 0.005);

  const total = segments.reduce((s, seg) => s + Math.abs(seg.amount), 0);

  if (segments.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
        <p className="text-sm font-semibold text-emerald-700" style={{ fontFamily: "var(--font-display)" }}>
          No balance variance
        </p>
        <p className="text-xs text-emerald-600 mt-0.5">All matched invoices have identical balances</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4 bg-card flex flex-col gap-3">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        Variance Breakdown
      </p>

      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden flex gap-0.5">
        {segments.map((seg) => (
          <div
            key={seg.type}
            className="h-full rounded-sm transition-all"
            style={{
              width: `${(Math.abs(seg.amount) / total) * 100}%`,
              backgroundColor: seg.color,
            }}
            title={`${seg.label}: ${formatCurrency(seg.amount)}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5">
        {segments.map((seg) => (
          <div key={seg.type} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-[11px] text-muted-foreground truncate">{seg.label}</span>
            </div>
            <span
              className={cn(
                "text-[11px] font-semibold font-mono flex-shrink-0",
                seg.amount > 0 ? "text-rose-700" : "text-amber-700"
              )}
            >
              {seg.amount > 0 ? "+" : ""}{formatCurrency(seg.amount)}
            </span>
          </div>
        ))}
        <div className="border-t border-border pt-1.5 flex items-center justify-between">
          <span className="text-[11px] font-medium text-foreground">Total Explained</span>
          <span className="text-[11px] font-bold font-mono text-foreground">
            {formatCurrency(segments.reduce((s, seg) => s + seg.amount, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}
