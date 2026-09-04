import { describe, expect, it } from "vitest";
import type { Navigation } from "@/config/types";
import { resolveHeaderActions } from "./Header";

const nav: Navigation = {
  links: [],
  authCtas: {
    signUp: { label: "Sign-up", href: "/sign-up", emphasized: true },
    signIn: { label: "Sign-in", href: "/sign-in" },
  },
  ctaRequiresAuth: true,
  cta: { label: "Book a first session", href: "/#booking", emphasized: true },
};

describe("resolveHeaderActions", () => {
  it("shows sign-up and sign-in, but not Book, while signed out", () => {
    const actions = resolveHeaderActions(nav, false);
    expect(actions.signedOut.map((link) => link.label)).toEqual([
      "Sign-up",
      "Sign-in",
    ]);
    expect(actions.primary).toBeUndefined();
  });

  it("shows Book and hides signed-out actions while signed in", () => {
    const actions = resolveHeaderActions(nav, true);
    expect(actions.signedOut).toEqual([]);
    expect(actions.primary?.label).toBe("Book a first session");
  });

  it("does not change ungated clients", () => {
    const legacy: Navigation = {
      links: [],
      cta: { label: "Contact", href: "/contact" },
    };
    expect(resolveHeaderActions(legacy, false).primary?.label).toBe("Contact");
  });
});
