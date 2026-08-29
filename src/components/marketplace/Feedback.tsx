"use client";

import { useState } from "react";
import { formatMoneyCompact, money } from "@/domain/money";
import type { StarRating, StructuredFeedback } from "@/domain/review";

/**
 * Post-session feedback and tipping.
 *
 * The four channels are kept visually and structurally distinct so a guest
 * understands what becomes public. The safety question is separated from the
 * quality questions on purpose: conflating "I didn't enjoy it" with "something
 * was wrong" is how review systems end up punishing hosts for taste.
 */

const QUALITY_QUESTIONS: {
  key: keyof Omit<StructuredFeedback, "inappropriateBehavior">;
  label: string;
}[] = [
  { key: "deliveredAsAdvertised", label: "Did the host deliver the experience as advertised?" },
  { key: "meaningfullyInteractive", label: "Was the session meaningfully interactive?" },
  { key: "wouldBookAgain", label: "Would you book this host again?" },
  { key: "memorable", label: "Was it memorable or worthwhile?" },
];

const TIP_PRESETS_MINOR = [0, 300, 500, 1000, 2000];

export function TipSelector({
  currency,
  value,
  onChange,
  providerTerm = "host",
}: {
  currency: string;
  value: number;
  onChange: (minor: number) => void;
  providerTerm?: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-fg">
        Add a tip? (optional)
      </legend>
      <p className="mt-1 text-xs text-muted">
        Tips go entirely to the {providerTerm.toLowerCase()}.
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup">
        {TIP_PRESETS_MINOR.map((minor) => {
          const active = value === minor;
          return (
            <label
              key={minor}
              className={`cursor-pointer rounded-theme border px-4 py-2 text-sm transition-colors ${
                active ? "border-primary bg-primary/10 text-fg" : "border-border text-muted hover:bg-surface"
              }`}
            >
              <input
                type="radio"
                name="tip"
                value={minor}
                checked={active}
                onChange={() => onChange(minor)}
                className="sr-only"
              />
              {minor === 0 ? "No tip" : formatMoneyCompact(money(minor, currency))}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ReviewForm({
  bookingCode,
  currency,
  tipsEnabled,
  providerTerm = "Host",
}: {
  bookingCode: string;
  currency: string;
  tipsEnabled: boolean;
  providerTerm?: string;
}) {
  const [rating, setRating] = useState<StarRating>(5);
  const [answers, setAnswers] = useState<Record<string, boolean>>({
    deliveredAsAdvertised: true,
    meaningfullyInteractive: true,
    wouldBookAgain: true,
    memorable: true,
  });
  const [inappropriate, setInappropriate] = useState(false);
  const [publicComment, setPublicComment] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [tipMinor, setTipMinor] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingCode,
          rating,
          publicComment,
          privateNotes,
          tipMinor,
          structured: { ...answers, inappropriateBehavior: inappropriate },
        }),
      });
    } catch {
      /* demo adapter; feedback is best-effort */
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-theme border border-border bg-surface p-6" role="status">
        <h2 className="font-heading text-lg font-semibold text-fg">Thanks — that helps.</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Your star rating and public comment appear on the listing. Your structured
          answers and any private notes go to review only.
        </p>
        {tipMinor > 0 && (
          <p className="mt-2 text-sm text-muted">
            Tip of {formatMoneyCompact(money(tipMinor, currency))} recorded in the demo
            ledger. No real payment was made.
          </p>
        )}
        {inappropriate && (
          <p className="mt-3 rounded-theme border border-border p-3 text-sm text-muted">
            You flagged a conduct concern. That goes to a human reviewer as a private
            safety report — it is not shown publicly and is not attributed to you in
            the listing.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Public */}
      <section className="rounded-theme border border-border bg-surface p-5">
        <h2 className="font-heading text-base font-semibold text-fg">
          Public review
        </h2>
        <p className="mt-1 text-xs text-muted">Shown on the listing.</p>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-fg">Overall rating</legend>
          <div className="mt-2 flex gap-1" role="radiogroup">
            {([1, 2, 3, 4, 5] as StarRating[]).map((n) => (
              <label key={n} className="cursor-pointer">
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                  className="sr-only"
                />
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-theme border text-lg ${
                    n <= rating
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted"
                  }`}
                >
                  ★
                </span>
                <span className="sr-only">{n} stars</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4">
          <label htmlFor="public-comment" className="block text-sm font-medium text-fg">
            Comment (optional)
          </label>
          <textarea
            id="public-comment"
            rows={3}
            value={publicComment}
            onChange={(e) => setPublicComment(e.target.value)}
            className="mt-1 w-full rounded-theme border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
      </section>

      {/* 2. Structured quality — private, feeds bonus review only */}
      <section className="rounded-theme border border-border bg-surface p-5">
        <h2 className="font-heading text-base font-semibold text-fg">
          A few specifics
        </h2>
        <p className="mt-1 text-xs text-muted">
          Not shown publicly. Used to review discretionary bonuses — never to reduce
          the {providerTerm.toLowerCase()}&apos;s guaranteed pay.
        </p>

        <div className="mt-4 space-y-3">
          {QUALITY_QUESTIONS.map((q) => (
            <div key={q.key} className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted">{q.label}</span>
              <span className="flex shrink-0 gap-1">
                {[true, false].map((v) => (
                  <label key={String(v)} className="cursor-pointer">
                    <input
                      type="radio"
                      name={q.key}
                      checked={answers[q.key] === v}
                      onChange={() => setAnswers((a) => ({ ...a, [q.key]: v }))}
                      className="sr-only"
                    />
                    <span
                      className={`inline-flex h-8 min-w-[3rem] items-center justify-center rounded-theme border px-2 text-xs ${
                        answers[q.key] === v
                          ? "border-primary bg-primary/10 text-fg"
                          : "border-border text-muted"
                      }`}
                    >
                      {v ? "Yes" : "No"}
                    </span>
                  </label>
                ))}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Safety — the only channel that can open an incident */}
      <section className="rounded-theme border border-border bg-surface p-5">
        <h2 className="font-heading text-base font-semibold text-fg">Safety</h2>
        <label className="mt-3 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={inappropriate}
            onChange={(e) => setInappropriate(e.target.checked)}
            className="mt-1 accent-[var(--color-primary)]"
          />
          <span className="text-sm leading-relaxed text-muted">
            Someone in this session behaved inappropriately.
          </span>
        </label>

        <div className="mt-4">
          <label htmlFor="private-notes" className="block text-sm font-medium text-fg">
            Private notes (optional)
          </label>
          <p className="text-xs text-muted">
            Only visible to reviewers. Never published.
          </p>
          <textarea
            id="private-notes"
            rows={3}
            value={privateNotes}
            onChange={(e) => setPrivateNotes(e.target.value)}
            className="mt-1 w-full rounded-theme border border-border bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
      </section>

      {/* 4. Tip */}
      {tipsEnabled && (
        <section className="rounded-theme border border-border bg-surface p-5">
          <TipSelector
            currency={currency}
            value={tipMinor}
            onChange={setTipMinor}
            providerTerm={providerTerm}
          />
        </section>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-theme bg-primary px-6 py-3 text-base font-semibold text-primary-fg transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {submitting ? "Submitting…" : "Submit feedback"}
      </button>
    </form>
  );
}
