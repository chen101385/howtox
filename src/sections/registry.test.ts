import { describe, expect, it } from "vitest";
import {
  shouldShowBookingSection,
  visibleAuthenticatedLink,
} from "./registry";

describe("booking section authentication gate", () => {
  it("hides an auth-required scheduler without a signed-in viewer", () => {
    expect(shouldShowBookingSection(true, false)).toBe(false);
  });

  it("shows an auth-required scheduler to a signed-in viewer", () => {
    expect(shouldShowBookingSection(true, true)).toBe(true);
  });

  it("preserves public booking sections for clients that do not opt in", () => {
    expect(shouldShowBookingSection(false, false)).toBe(true);
  });

  it("hides auth-required section links while signed out", () => {
    const book = {
      label: "Book",
      href: "#booking",
      requiresAuth: true,
    };
    expect(visibleAuthenticatedLink(book, false)).toBeUndefined();
    expect(visibleAuthenticatedLink(book, true)).toEqual(book);
  });
});
