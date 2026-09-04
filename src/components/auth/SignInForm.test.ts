import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SignInForm } from "./SignInForm";

describe("SignInForm modes", () => {
  it("renders log-in as email-only", () => {
    const html = renderToStaticMarkup(
      createElement(SignInForm, {
        mode: "log-in",
        collectFamilyProfile: true,
      })
    );

    expect(html).toContain("Email me a log-in link");
    expect(html).toContain("Email address");
    expect(html).not.toContain("First name");
    expect(html).not.toContain("Children");
    expect(html).not.toContain("ZIP code");
  });

  it("renders profile fields and sign-up copy for family sign-up", () => {
    const html = renderToStaticMarkup(
      createElement(SignInForm, {
        mode: "sign-up",
        collectFamilyProfile: true,
      })
    );

    expect(html).toContain("Email me a sign-up link");
    expect(html).toContain("First name");
    expect(html).toContain("Children");
    expect(html).toContain("ZIP code");
  });
});
