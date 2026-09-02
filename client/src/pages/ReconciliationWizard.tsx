/**
 * ReconciliationWizard — Main page
 * Design: Refined Enterprise — three-step wizard with persistent header and step indicator
 * Steps: 1. Upload Files → 2. Map Columns → 3. Review Results
 */
import { useState } from "react";
import { GitCompare } from "lucide-react";
import StepIndicator from "@/components/StepIndicator";
import FileUploadStep from "@/components/FileUploadStep";
import ColumnMappingStep from "@/components/ColumnMappingStep";
import ResultsStep from "@/components/ResultsStep";
import {
  type ParsedFile,
  type ReconciliationConfig,
  type ReconciliationResult,
  reconcile,
} from "@/lib/reconciliation";
import { toast } from "sonner";

const STEPS = [
  { id: 1, label: "Upload Files", description: "Load two A/R reports" },
  { id: 2, label: "Map Columns", description: "Match fields between reports" },
  { id: 3, label: "Review Results", description: "Analyze discrepancies" },
];

export default function ReconciliationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [reportA, setReportA] = useState<ParsedFile | null>(null);
  const [reportB, setReportB] = useState<ParsedFile | null>(null);
  const [result, setResult] = useState<ReconciliationResult | null>(null);

  const handleRun = (
    config: Omit<ReconciliationConfig, "reportA" | "reportB">
  ) => {
    if (!reportA || !reportB) return;
    try {
      const r = reconcile({ reportA, reportB, ...config });
      setResult(r);
      setCurrentStep(3);
      const { summary } = r;
      toast.success(
        `Reconciliation complete — ${summary.totalDiscrepancies} discrepanc${summary.totalDiscrepancies !== 1 ? "ies" : "y"} found across ${summary.totalInvoicesA + summary.totalInvoicesB - summary.totalMatched} unique invoices`
      );
    } catch (err) {
      toast.error(`Reconciliation failed: ${String(err)}`);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setReportA(null);
    setReportB(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <GitCompare className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1
              className="text-sm font-bold text-foreground leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              A/R Reconciliation Tool
            </h1>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Invoice-level discrepancy analysis
            </p>
          </div>
          <div className="ml-auto text-[10px] text-muted-foreground hidden sm:block">
            All data processed locally &middot; No uploads
          </div>
        </div>
      </header>

      {/* ── Step indicator ── */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <StepIndicator steps={STEPS} currentStep={currentStep} />
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Step header */}
          <div className="mb-6">
            <h2
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {STEPS[currentStep - 1].label}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {currentStep === 1 &&
                "Upload two A/R reports in CSV or Excel format. The tool will compare them invoice by invoice."}
              {currentStep === 2 &&
                "Tell the tool which column in each report contains the invoice ID, customer name, invoice date, and balance. All four fields are required."}
              {currentStep === 3 &&
                "Every discrepancy is categorized and quantified below. Use filters to focus on specific types, then export to CSV."}
            </p>
          </div>

          {/* Step content */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            {currentStep === 1 && (
              <FileUploadStep
                reportA={reportA}
                reportB={reportB}
                onReportAChange={setReportA}
                onReportBChange={setReportB}
                onNext={() => setCurrentStep(2)}
              />
            )}
            {currentStep === 2 && reportA && reportB && (
              <ColumnMappingStep
                reportA={reportA}
                reportB={reportB}
                onBack={() => setCurrentStep(1)}
                onRun={handleRun}
              />
            )}
            {currentStep === 3 && result && (
              <ResultsStep result={result} onReset={handleReset} />
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>A/R Reconciliation Tool &middot; Invoice-level discrepancy analysis</span>
          <span>Data never leaves your browser</span>
        </div>
      </footer>
    </div>
  );
}
