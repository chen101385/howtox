"use client";

import { useState } from "react";
import { MAX_CHILD_AGE } from "@/domain/sign-in-profile";

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
type ChildInput = { id: number; firstName: string; age: string };

export function SignInForm({
  next,
  collectFamilyProfile = false,
}: {
  next?: string;
  collectFamilyProfile?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [children, setChildren] = useState<ChildInput[]>([
    { id: 0, firstName: "", age: "" },
  ]);
  const [nextChildId, setNextChildId] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          next,
          ...(collectFamilyProfile
            ? {
                profile: {
                  firstName,
                  lastName,
                  childFirstNames: children.map((child) => child.firstName),
                  childAges: children.map((child) => Number(child.age)),
                  zipCode,
                },
              }
            : {}),
        }),
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

  function addChild() {
    setChildren((current) => [
      ...current,
      { id: nextChildId, firstName: "", age: "" },
    ]);
    setNextChildId((current) => current + 1);
  }

  function updateChild(id: number, update: Partial<Omit<ChildInput, "id">>) {
    setChildren((current) =>
      current.map((child) => (child.id === id ? { ...child, ...update } : child))
    );
  }

  function removeChild(id: number) {
    setChildren((current) => current.filter((child) => child.id !== id));
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
      {collectFamilyProfile && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="first-name" className="block text-sm font-medium text-fg">
                First name
              </label>
              <input
                id="first-name"
                name="firstName"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="mt-2 w-full rounded-theme border border-border bg-bg px-3 py-2 text-fg outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="last-name" className="block text-sm font-medium text-fg">
                Last name
              </label>
              <input
                id="last-name"
                name="lastName"
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="mt-2 w-full rounded-theme border border-border bg-bg px-3 py-2 text-fg outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>

          <fieldset className="space-y-4 rounded-theme border border-border p-4">
            <legend className="px-1 text-sm font-medium text-fg">Children</legend>
            {children.map((child, index) => (
              <div key={child.id} className="grid gap-3 sm:grid-cols-[1fr_7rem_auto]">
                <div>
                  <label
                    htmlFor={`child-name-${child.id}`}
                    className="block text-sm font-medium text-fg"
                  >
                    Child’s first name {children.length > 1 ? index + 1 : ""}
                  </label>
                  <input
                    id={`child-name-${child.id}`}
                    required
                    value={child.firstName}
                    onChange={(event) =>
                      updateChild(child.id, { firstName: event.target.value })
                    }
                    className="mt-2 w-full rounded-theme border border-border bg-bg px-3 py-2 text-fg outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`child-age-${child.id}`}
                    className="block text-sm font-medium text-fg"
                  >
                    Age
                  </label>
                  <input
                    id={`child-age-${child.id}`}
                    type="number"
                    required
                    min={1}
                    max={MAX_CHILD_AGE}
                    inputMode="numeric"
                    value={child.age}
                    onChange={(event) =>
                      updateChild(child.id, { age: event.target.value })
                    }
                    className="mt-2 w-full rounded-theme border border-border bg-bg px-3 py-2 text-fg outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                {children.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChild(child.id)}
                    className="self-end py-2 text-sm font-medium text-muted underline underline-offset-4 hover:text-fg"
                    aria-label={`Remove ${child.firstName || `child ${index + 1}`}`}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addChild}
              className="text-sm font-medium text-primary underline underline-offset-4"
            >
              Add another child
            </button>
          </fieldset>

          <div>
            <label htmlFor="zip-code" className="block text-sm font-medium text-fg">
              ZIP code
            </label>
            <input
              id="zip-code"
              name="zipCode"
              required
              autoComplete="postal-code"
              inputMode="numeric"
              pattern="\d{5}(-\d{4})?"
              title="Enter a 5-digit US ZIP code or ZIP+4."
              value={zipCode}
              onChange={(event) => setZipCode(event.target.value)}
              className="mt-2 w-full rounded-theme border border-border bg-bg px-3 py-2 text-fg outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="12345"
            />
          </div>
        </>
      )}

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
