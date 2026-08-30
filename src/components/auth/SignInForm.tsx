"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Email magic-link sign-in.
 *
 * The success message is identical whether or not an account exists for the
 * address — the server answers that way too, so this form is not an account
 * enumeration oracle for anyone typing addresses into it.
 *
 * The wording avoids "we sent you an email" in favour of "if that address can
 * receive mail from us", because promising delivery we cannot confirm is how
 * people end up staring at an empty inbox assuming the fault is theirs.
 */
export function SignInForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, next }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(body.error ?? "Could not send the link. Try again shortly.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setMessage("Could not reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div
        className="rounded-theme border border-border bg-surface p-6"
        role="status"
        aria-live="polite"
      >
        <p className="font-medium text-fg">Check your email</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          If <strong className="font-medium text-fg">{email}</strong> can receive
          mail from us, a sign-in link is on its way. It expires in about an hour
          and works once.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-medium text-primary underline underline-offset-4"
        >
          Use a different address
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-fg">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-describedby={status === "error" ? "sign-in-error" : undefined}
          aria-invalid={status === "error"}
          className="mt-2 w-full rounded-theme border border-border bg-bg px-3 py-2 text-fg outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder="you@example.com"
        />
      </div>

      {status === "error" && (
        <p id="sign-in-error" role="alert" className="text-sm text-fg">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-theme bg-primary px-4 py-2.5 font-medium text-primary-fg transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>

      <p className="text-xs leading-relaxed text-muted">
        No password. We email you a link that signs you in.
      </p>
    </form>
  );
}
