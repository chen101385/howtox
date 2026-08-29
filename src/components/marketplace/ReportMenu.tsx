"use client";

import { useState } from "react";
import {
  REPORT_CATEGORY_LABELS,
  defaultSeverity,
  type ReportCategory,
} from "@/domain/incident";

/**
 * In-session reporting.
 *
 * Every participant can reach this at any time — reporting must not be buried
 * behind a menu that a distressed person has to hunt for. Submitting creates an
 * incident in the `submitted` state for human triage; nothing is auto-adjudicated
 * and no accusation is shown to the reported party.
 */
export function ReportMenu({
  onSubmit,
  className = "",
}: {
  onSubmit?: (report: { category: ReportCategory; description: string }) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory>("harassment");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const categories = Object.keys(REPORT_CATEGORY_LABELS) as ReportCategory[];

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit?.({ category, description });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        className={`rounded-theme border border-border bg-surface p-4 ${className}`}
        role="status"
      >
        <p className="text-sm font-medium text-fg">Report submitted</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          A person will review this. Severity was set to{" "}
          <strong className="font-medium text-fg">{defaultSeverity(category)}</strong>{" "}
          based on the category. You can leave the session at any time.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="report-panel"
        className="w-full rounded-theme border border-border px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Report a problem
      </button>

      {open && (
        <form
          id="report-panel"
          onSubmit={handleSubmit}
          className="mt-3 space-y-3 rounded-theme border border-border bg-surface p-4"
        >
          <div>
            <label
              htmlFor="report-category"
              className="block text-xs font-medium text-fg"
            >
              What happened?
            </label>
            <select
              id="report-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ReportCategory)}
              className="mt-1 w-full rounded-theme border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {categories.map((key) => (
                <option key={key} value={key}>
                  {REPORT_CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="report-description"
              className="block text-xs font-medium text-fg"
            >
              Anything else we should know? (optional)
            </label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-theme border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-theme bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Submit report
          </button>

          <p className="text-xs leading-relaxed text-muted">
            Reports go to a human reviewer. The other participant is not told who
            reported them.
          </p>
        </form>
      )}
    </div>
  );
}

/**
 * Always-visible exit. Deliberately separate from "end session": a guest leaving
 * a session they find unsafe should never have to consider what it does to the
 * host's payout.
 */
export function EmergencyLeaveButton({
  onLeave,
  className = "",
}: {
  onLeave?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onLeave}
      className={`rounded-theme border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      Leave session now
    </button>
  );
}
