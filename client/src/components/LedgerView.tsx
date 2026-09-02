/**
 * LedgerView — Flat invoice list matching the desired output format
 * Design: Refined Enterprise — Sora/DM Sans/DM Mono, deep teal primary
 *
 * Every invoice is its own row. Sort order: discrepancies first (Only in A,
 * Only in B, and Balance Mismatch), then Matched at bottom.
 * Type labels use actual report file names (e.g. "QBO AR", "HCP AR").
 * Columns: Invoice ID | Type | Balance A | Balance B | Difference | Customer | Date | Notes
 */
import { useState, useMemo } from "react";
import {
  CheckCircle2, XCircle, ArrowLeftRight, Search,
  ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import NoteCell from "@/components/NoteCell";
import { cn } from "@/lib/utils";
import {
  type ReconciliationResult,
  type DiscrepancyRecord,
  type DiscrepancyType,
  discrepancyLabel,
  formatCurrency,
  DISCREPANCY_COLORS,
  DISCREPANCY_DOT,
  stripExtension,
} from "@/lib/reconciliation";

// ─── Sort helpers ─────────────────────────────────────────────────────────────

const DISCREPANCY_ORDER: Record<DiscrepancyType, number> = {
  only_in_a: 0,
  only_in_b: 1,
  balance_mismatch: 2,
  matched: 3,
};

type SortKey = "invoiceId" | "type" | "balanceA" | "balanceB" | "balanceDiff" | "customer" | "date";
type SortDir = "asc" | "desc";

function sortRecords(
  records: DiscrepancyRecord[],
  key: SortKey,
  dir: SortDir
): DiscrepancyRecord[] {
  return [...records].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "invoiceId":
        cmp = a.invoiceId.localeCompare(b.invoiceId, undefined, { numeric: true });
        break;
      case "type":
        cmp = DISCREPANCY_ORDER[a.type] - DISCREPANCY_ORDER[b.type];
        break;
      case "balanceA":
        cmp = (a.balanceA ?? -Infinity) - (b.balanceA ?? -Infinity);
        break;
      case "balanceB":
        cmp = (a.balanceB ?? -Infinity) - (b.balanceB ?? -Infinity);
        break;
      case "balanceDiff":
        cmp = Math.abs(a.balanceDiff ?? 0) - Math.abs(b.balanceDiff ?? 0);
        break;
      case "customer":
        cmp = (a.customerNameA ?? a.customerNameB ?? "").localeCompare(
          b.customerNameA ?? b.customerNameB ?? ""
        );
        break;
      case "date":
        cmp = (a.invoiceDateA ?? a.invoiceDateB ?? "").localeCompare(
          b.invoiceDateA ?? b.invoiceDateB ?? ""
        );
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── Type badge icons ─────────────────────────────────────────────────────────

const TYPE_ICONS: Record<DiscrepancyType, React.ReactNode> = {
  only_in_a: <XCircle className="w-3.5 h-3.5 shrink-0" />,
  only_in_b: <XCircle className="w-3.5 h-3.5 shrink-0" />,
  balance_mismatch: <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />,
  matched: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
};

// ─── Sortable column header ───────────────────────────────────────────────────

function SortableHeader({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
  className,
}: {
  label: React.ReactNode;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = currentKey === sortKey;
  return (
    <th
      className={cn("px-3 py-2.5 cursor-pointer select-none group", className)}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className={cn("transition-opacity", active ? "opacity-100" : "opacity-0 group-hover:opacity-40")}>
          {active ? (
            dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3" />
          )}
        </span>
      </div>
    </th>
  );
}

// ─── Individual invoice row ───────────────────────────────────────────────────

interface InvoiceRowProps {
  record: DiscrepancyRecord;
  reportAName: string;
  reportBName: string;
  noteValue: string;
  onNoteChange: (invoiceId: string, note: string) => void;
  animDelay: number;
}

function InvoiceRow({ record, reportAName, reportBName, noteValue, onNoteChange, animDelay }: InvoiceRowProps) {
  const isMatched = record.type === "matched";

  return (
    <tr
      className={cn(
        "transition-colors table-row-enter",
        isMatched
          ? "bg-card hover:bg-muted/20"
          : "bg-card hover:bg-muted/30"
      )}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Invoice ID */}
      <td className="px-3 py-2.5" data-numeric>
        <span className={cn(
          "font-mono text-xs font-medium",
          isMatched ? "text-muted-foreground" : "text-foreground"
        )}>
          {record.invoiceId}
        </span>
      </td>

      {/* Discrepancy Type */}
      <td className="px-3 py-2.5">
        {isMatched ? (
          <span className={cn(
            "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border",
            DISCREPANCY_COLORS.matched
          )}>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Matched
          </span>
        ) : (
          <span className={cn(
            "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border",
            DISCREPANCY_COLORS[record.type]
          )}>
            {TYPE_ICONS[record.type]}
            {discrepancyLabel(record.type, reportAName, reportBName)}
          </span>
        )}
      </td>

      {/* Balance A */}
      <td className="px-3 py-2.5 text-right" data-numeric>
        <span className={cn(
          "font-mono text-xs",
          record.balanceA === null ? "text-muted-foreground" : isMatched ? "text-muted-foreground" : "text-foreground"
        )}>
          {record.balanceA !== null ? formatCurrency(record.balanceA) : "—"}
        </span>
      </td>

      {/* Balance B */}
      <td className="px-3 py-2.5 text-right" data-numeric>
        <span className={cn(
          "font-mono text-xs",
          record.balanceB === null ? "text-muted-foreground" : isMatched ? "text-muted-foreground" : "text-foreground"
        )}>
          {record.balanceB !== null ? formatCurrency(record.balanceB) : "—"}
        </span>
      </td>

      {/* Difference */}
      <td className="px-3 py-2.5 text-right" data-numeric>
        {isMatched ? (
          <span className="font-mono text-xs text-emerald-600">$0.00</span>
        ) : record.balanceDiff !== null ? (
          <span className={cn(
            "font-mono text-xs font-semibold",
            Math.abs(record.balanceDiff) < 0.01 ? "text-emerald-700"
              : record.balanceDiff > 0 ? "text-rose-700"
              : "text-amber-700"
          )}>
            {record.balanceDiff > 0 ? "+" : ""}{formatCurrency(record.balanceDiff)}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>

      {/* Customer */}
      <td className="px-3 py-2.5">
        <span className={cn(
          "text-xs truncate max-w-[140px] block",
          isMatched ? "text-muted-foreground" : "text-foreground"
        )}>
          {record.customerNameA ?? record.customerNameB ?? "—"}
        </span>
      </td>

      {/* Date */}
      <td className="px-3 py-2.5">
        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
          {record.invoiceDateA ?? record.invoiceDateB ?? "—"}
        </span>
      </td>

      {/* Notes — only on discrepancy rows */}
      {isMatched ? (
        <td className="px-3 py-2.5" />
      ) : (
        <NoteCell
          invoiceId={record.invoiceId}
          value={noteValue}
          onChange={onNoteChange}
        />
      )}
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface LedgerViewProps {
  result: ReconciliationResult;
  notes: Map<string, string>;
  onNoteChange: (invoiceId: string, note: string) => void;
}

export default function LedgerView({ result, notes, onNoteChange }: LedgerViewProps) {
  const { records, reportAName, reportBName, summary } = result;
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("type");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showMatchedOnly, setShowMatchedOnly] = useState<boolean | null>(null); // null = all

  const aLabel = stripExtension(reportAName);
  const bLabel = stripExtension(reportBName);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filteredRecords = useMemo(() => {
    let filtered = records;

    // Text search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.invoiceId.toLowerCase().includes(q) ||
          (r.customerNameA ?? r.customerNameB ?? "").toLowerCase().includes(q)
      );
    }

    // Show filter
    if (showMatchedOnly === true) {
      filtered = filtered.filter(r => r.type === "matched");
    } else if (showMatchedOnly === false) {
      filtered = filtered.filter(r => r.type !== "matched");
    }

    return sortRecords(filtered, sortKey, sortDir);
  }, [records, search, sortKey, sortDir, showMatchedOnly]);

  const discrepancyCount = records.filter(r => r.type !== "matched").length;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search invoice ID or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5 bg-muted/30">
          <button
            onClick={() => setShowMatchedOnly(null)}
            className={cn(
              "text-xs px-2.5 h-7 rounded transition-colors",
              showMatchedOnly === null
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({records.length})
          </button>
          <button
            onClick={() => setShowMatchedOnly(false)}
            className={cn(
              "text-xs px-2.5 h-7 rounded transition-colors",
              showMatchedOnly === false
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Discrepancies ({discrepancyCount})
          </button>
          <button
            onClick={() => setShowMatchedOnly(true)}
            className={cn(
              "text-xs px-2.5 h-7 rounded transition-colors",
              showMatchedOnly === true
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Matched ({summary.totalMatched})
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground px-0.5">
        <div className="flex items-center gap-1.5">
          <div className={cn("w-2 h-2 rounded-sm", DISCREPANCY_DOT.matched)} />
          <span>{summary.totalMatched} matched</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-rose-500" />
          <span>{summary.totalOnlyInA} {aLabel} AR only</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-orange-500" />
          <span>{summary.totalOnlyInB} {bLabel} AR only</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-amber-500" />
          <span>{summary.totalBalanceMismatch} balance mismatch</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="font-medium text-foreground">{records.length} total invoices</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead className="bg-muted/50 border-b border-border text-left text-xs font-medium text-muted-foreground">
              <tr>
                <SortableHeader label="Invoice ID" sortKey="invoiceId" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <SortableHeader label="Type" sortKey="type" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <SortableHeader
                  label={
                    <span>
                      Balance A
                      <span className="block text-[9px] font-normal text-muted-foreground/70 normal-case tracking-normal truncate max-w-[80px]">
                        {aLabel}
                      </span>
                    </span>
                  }
                  sortKey="balanceA"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader
                  label={
                    <span>
                      Balance B
                      <span className="block text-[9px] font-normal text-muted-foreground/70 normal-case tracking-normal truncate max-w-[80px]">
                        {bLabel}
                      </span>
                    </span>
                  }
                  sortKey="balanceB"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
                <SortableHeader label="Difference" sortKey="balanceDiff" currentKey={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                <SortableHeader label="Customer" sortKey="customer" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <SortableHeader label="Date" sortKey="date" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="px-3 py-2.5 text-left">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No invoices match the current search or filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, idx) => (
                  <InvoiceRow
                    key={record.invoiceId}
                    record={record}
                    reportAName={reportAName}
                    reportBName={reportBName}
                    noteValue={notes.get(record.invoiceId) ?? ""}
                    onNoteChange={onNoteChange}
                    animDelay={Math.min(idx * 8, 200)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Click any column header to sort. Default order: discrepancies first, then matched.
      </p>
    </div>
  );
}
