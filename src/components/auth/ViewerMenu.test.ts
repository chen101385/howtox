import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ViewerMenuContent } from "./ViewerMenu";

describe("ViewerMenuContent", () => {
  it("renders sign-in without an account label when signed out", () => {
    const html = renderToStaticMarkup(ViewerMenuContent({}));
    expect(html).toContain("Sign in");
    expect(html).not.toContain("Signed in as");
    expect(html).not.toContain("Sign out");
  });

  it("renders the verified email and POST sign-out control when signed in", () => {
    const html = renderToStaticMarkup(
      ViewerMenuContent({ email: "parent@example.invalid" })
    );
    expect(html).toContain("Signed in as parent@example.invalid");
    expect(html).toContain('action="/api/auth/sign-out"');
    expect(html).toContain('method="post"');
    expect(html).toContain("Sign out");
    expect(html).not.toContain(">Sign in<");
  });
});
