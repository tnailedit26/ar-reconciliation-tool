/**
 * FileUploadStep — Step 1 of the wizard
 * Design: Refined Enterprise — split-panel upload for Report A and B
 * Supports CSV, XLS, XLSX. Drag-and-drop or click to browse.
 */
import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseFile, type ParsedFile, generateSampleCsv, downloadCsv } from "@/lib/reconciliation";
import { toast } from "sonner";

interface FileUploadStepProps {
  reportA: ParsedFile | null;
  reportB: ParsedFile | null;
  onReportAChange: (file: ParsedFile | null) => void;
  onReportBChange: (file: ParsedFile | null) => void;
  onNext: () => void;
}

interface DropZoneProps {
  label: string;
  sublabel: string;
  accentColor: string;
  file: ParsedFile | null;
  onFile: (file: ParsedFile | null) => void;
}

function DropZone({ label, sublabel, accentColor, file, onFile }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setIsLoading(true);
    try {
      const parsed = await parseFile(f);
      if (parsed.rows.length === 0) {
        toast.error("The file appears to be empty. Please check the file and try again.");
        return;
      }
      onFile(parsed);
      toast.success(`${f.name} loaded — ${parsed.rows.length.toLocaleString()} rows, ${parsed.headers.length} columns`);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [onFile]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-6 rounded-sm"
          style={{ backgroundColor: accentColor }}
        />
        <div>
          <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            {label}
          </h3>
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        </div>
      </div>

      {/* Drop zone */}
      {!file ? (
        <div
          className={cn(
            "drop-zone rounded-lg p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
            isDragging && "drag-over",
            isLoading && "opacity-60 pointer-events-none"
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            className="hidden"
            onChange={onInputChange}
          />
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: accentColor + "18" }}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: accentColor }} />
            ) : (
              <Upload className="w-5 h-5" style={{ color: accentColor }} />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isLoading ? "Parsing file..." : "Drop file here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports CSV, Excel (.xlsx, .xls)
            </p>
          </div>
        </div>
      ) : (
        /* File loaded state */
        <div
          className="rounded-lg border p-4 flex items-start gap-3"
          style={{ borderColor: accentColor + "40", backgroundColor: accentColor + "08" }}
        >
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: accentColor + "20" }}
          >
            <FileText className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{file.fileName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {file.rows.length.toLocaleString()} rows &middot; {file.headers.length} columns
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {file.headers.slice(0, 4).map((h) => (
                <span
                  key={h}
                  className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-background border border-border text-muted-foreground"
                >
                  {h}
                </span>
              ))}
              {file.headers.length > 4 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground">
                  +{file.headers.length - 4} more
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => onFile(null)}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function FileUploadStep({
  reportA,
  reportB,
  onReportAChange,
  onReportBChange,
  onNext,
}: FileUploadStepProps) {
  const canProceed = reportA !== null && reportB !== null;

  const loadSampleData = () => {
    const csvA = generateSampleCsv("a");
    const csvB = generateSampleCsv("b");

    // Parse and load directly
    const blobA = new Blob([csvA], { type: "text/csv" });
    const blobB = new Blob([csvB], { type: "text/csv" });
    const fileA = new File([blobA], "Report_A_Sample.csv", { type: "text/csv" });
    const fileB = new File([blobB], "Report_B_Sample.csv", { type: "text/csv" });

    Promise.all([parseFile(fileA), parseFile(fileB)]).then(([a, b]) => {
      onReportAChange(a);
      onReportBChange(b);
      toast.success("Sample data loaded — 14 invoices with various discrepancy types");
    });
  };

  const downloadSample = (variant: "a" | "b") => {
    const csv = generateSampleCsv(variant);
    downloadCsv(csv, `Sample_Report_${variant.toUpperCase()}.csv`);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/40 border border-accent">
        <AlertCircle className="w-4 h-4 text-accent-foreground mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-accent-foreground">
            All processing happens in your browser
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your invoice data is never uploaded to any server. Reconciliation runs entirely client-side.
          </p>
        </div>
      </div>

      {/* Upload panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DropZone
          label="Report A"
          sublabel="Primary source (e.g., ERP system export)"
          accentColor="#0F766E"
          file={reportA}
          onFile={onReportAChange}
        />
        <DropZone
          label="Report B"
          sublabel="Secondary source (e.g., accounting system export)"
          accentColor="#B45309"
          file={reportB}
          onFile={onReportBChange}
        />
      </div>

      {/* Sample data */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 border-t border-border">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            Don't have files ready?
          </p>
          <p className="text-xs text-muted-foreground">
            Use sample data to explore the tool, or download templates to see the expected format.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadSampleData} className="text-xs gap-1.5">
            <Upload className="w-3 h-3" />
            Load Sample Data
          </Button>
          <Button variant="ghost" size="sm" onClick={() => downloadSample("a")} className="text-xs gap-1.5">
            <Download className="w-3 h-3" />
            Template A
          </Button>
          <Button variant="ghost" size="sm" onClick={() => downloadSample("b")} className="text-xs gap-1.5">
            <Download className="w-3 h-3" />
            Template B
          </Button>
        </div>
      </div>

      {/* Next button */}
      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canProceed}
          size="lg"
          className="px-8 font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Map Columns
          <span className="ml-2">→</span>
        </Button>
      </div>
    </div>
  );
}
