/**
 * ColumnMappingStep — Step 2 of the wizard
 * Maps the four required source columns for each report.
 */
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import type { ParsedFile, ColumnMapping, ReconciliationConfig } from "@/lib/reconciliation";

interface ColumnMappingStepProps {
  reportA: ParsedFile;
  reportB: ParsedFile;
  onBack: () => void;
  onRun: (config: Omit<ReconciliationConfig, "reportA" | "reportB">) => void;
}

function guessColumn(headers: string[], candidates: string[]): string {
  const lower = headers.map((h) => h.toLowerCase());
  for (const c of candidates) {
    const idx = lower.findIndex((h) => h.includes(c));
    if (idx !== -1) return headers[idx];
  }
  return "";
}

function autoMap(headers: string[]): Partial<ColumnMapping> {
  return {
    invoiceId: guessColumn(headers, ["invoice", "inv #", "inv#", "num", "number", "id"]),
    customerName: guessColumn(headers, ["customer", "client", "company", "name"]),
    invoiceDate: guessColumn(headers, ["invoice date", "date", "created"]),
    balance: guessColumn(headers, ["balance", "outstanding", "remaining", "amount"]),
  };
}

interface MappingPanelProps {
  label: string;
  accentColor: string;
  headers: string[];
  mapping: Partial<ColumnMapping>;
  onChange: (mapping: Partial<ColumnMapping>) => void;
}

function MappingPanel({ label, accentColor, headers, mapping, onChange }: MappingPanelProps) {
  const set = (key: keyof ColumnMapping, value: string) =>
    onChange({ ...mapping, [key]: value || undefined });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <div className="w-2 h-5 rounded-sm" style={{ backgroundColor: accentColor }} />
        <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          {label}
        </h3>
        <Badge variant="secondary" className="text-[10px] font-mono ml-auto">
          {headers.length} columns
        </Badge>
      </div>

      <div className="flex flex-col gap-3">
        <FieldRow label="Invoice ID" hint="Unique identifier used to match invoices across both reports" value={mapping.invoiceId ?? ""} headers={headers} accentColor={accentColor} onChange={(v) => set("invoiceId", v)} />
        <FieldRow label="Customer Name" value={mapping.customerName ?? ""} headers={headers} accentColor={accentColor} onChange={(v) => set("customerName", v)} />
        <FieldRow label="Invoice Date" value={mapping.invoiceDate ?? ""} headers={headers} accentColor={accentColor} onChange={(v) => set("invoiceDate", v)} />
        <FieldRow label="Balance" hint="Outstanding balance; $ symbols, commas, and parentheses are handled" value={mapping.balance ?? ""} headers={headers} accentColor={accentColor} onChange={(v) => set("balance", v)} />
      </div>
    </div>
  );
}

interface FieldRowProps {
  label: string;
  hint?: string;
  value: string;
  headers: string[];
  accentColor: string;
  onChange: (v: string) => void;
}

function FieldRow({ label, hint, value, headers, accentColor, onChange }: FieldRowProps) {
  const NONE = "__none__";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Label className="text-xs font-medium text-foreground">
          {label}<span className="text-destructive ml-0.5">*</span>
        </Label>
        {hint && (
          <div className="group relative">
            <Info className="w-3 h-3 text-muted-foreground" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 p-2 rounded-md bg-popover border border-border text-[11px] text-muted-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {hint}
            </div>
          </div>
        )}
      </div>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger className="h-8 text-xs font-mono" style={{ borderColor: value ? accentColor + "60" : undefined }}>
          <SelectValue placeholder="Select column…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE} className="text-xs text-muted-foreground font-mono">— Select column… —</SelectItem>
          {headers.filter((h) => h && h.trim()).map((h) => (
            <SelectItem key={h} value={h} className="text-xs font-mono">{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function ColumnMappingStep({ reportA, reportB, onBack, onRun }: ColumnMappingStepProps) {
  const [mappingA, setMappingA] = useState<Partial<ColumnMapping>>({});
  const [mappingB, setMappingB] = useState<Partial<ColumnMapping>>({});

  useEffect(() => {
    setMappingA(autoMap(reportA.headers));
    setMappingB(autoMap(reportB.headers));
  }, [reportA, reportB]);

  const complete = (m: Partial<ColumnMapping>): m is ColumnMapping =>
    Boolean(m.invoiceId && m.customerName && m.invoiceDate && m.balance);

  const canRun = complete(mappingA) && complete(mappingB);

  const handleRun = () => {
    if (!complete(mappingA) || !complete(mappingB)) return;
    onRun({ mappingA, mappingB });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MappingPanel label={reportA.fileName} accentColor="#0f766e" headers={reportA.headers} mapping={mappingA} onChange={setMappingA} />
        <MappingPanel label={reportB.fileName} accentColor="#c2410c" headers={reportB.headers} mapping={mappingB} onChange={setMappingB} />
      </div>

      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Invoices are matched by Invoice ID. Balances must match exactly. Customer name and invoice date are included in the results for reference.
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={handleRun} disabled={!canRun}>Run Reconciliation</Button>
      </div>
    </div>
  );
}
