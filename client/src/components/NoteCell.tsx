/**
 * NoteCell — Inline click-to-edit annotation cell for discrepancy rows
 * Design: Refined Enterprise — minimal, unobtrusive until activated
 *
 * Behaviour:
 * - Shows a faint "Add note…" placeholder when empty, or the note text when filled
 * - Clicking enters edit mode with a textarea; Escape or blur saves and exits
 * - Enter key (without Shift) also saves and exits
 * - Displays a small pencil icon on hover to signal editability
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Pencil, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteCellProps {
  invoiceId: string;
  value: string;
  onChange: (invoiceId: string, note: string) => void;
  /** Optional: max character count */
  maxLength?: number;
}

export default function NoteCell({ invoiceId, value, onChange, maxLength = 200 }: NoteCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync draft when external value changes (e.g., reset)
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const startEdit = useCallback(() => {
    setDraft(value);
    setEditing(true);
  }, [value]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    onChange(invoiceId, trimmed);
    setEditing(false);
  }, [draft, invoiceId, onChange]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at end
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  if (editing) {
    return (
      <td className="px-2 py-1.5 min-w-[160px] max-w-[240px]">
        <div className="flex flex-col gap-1">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); cancel(); }
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
            }}
            maxLength={maxLength}
            rows={2}
            className={cn(
              "w-full text-xs rounded border border-primary/40 bg-primary/5 px-2 py-1",
              "resize-none outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary",
              "placeholder:text-muted-foreground/50 text-foreground leading-snug",
              "transition-colors"
            )}
            placeholder="Add annotation…"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/60">
              Enter to save · Esc to cancel
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              {draft.length}/{maxLength}
            </span>
          </div>
        </div>
      </td>
    );
  }

  return (
    <td
      className="px-2 py-2.5 min-w-[120px] max-w-[200px] cursor-pointer group/note"
      onClick={startEdit}
      title="Click to add annotation"
    >
      {value ? (
        <div className="flex items-start gap-1.5">
          <MessageSquare className="w-3 h-3 text-primary/60 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-foreground leading-snug break-words line-clamp-2">
            {value}
          </span>
          <Pencil className="w-2.5 h-2.5 text-muted-foreground/40 flex-shrink-0 mt-0.5 opacity-0 group-hover/note:opacity-100 transition-opacity" />
        </div>
      ) : (
        <div className="flex items-center gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity">
          <Pencil className="w-3 h-3 text-muted-foreground/50" />
          <span className="text-[11px] text-muted-foreground/60 italic">Add note…</span>
        </div>
      )}
    </td>
  );
}
