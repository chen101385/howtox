import { describe, expect, it } from "vitest";
import { __parseEnv as parse } from "./load-env";

/**
 * Load-bearing: every `db:*` script depends on this to find DATABASE_URL, and a
 * parse bug surfaces as "No DATABASE_URL set" on a correctly-filled file — which
 * reads as the user's mistake when it is ours.
 */
describe("env parsing", () => {
  it("reads plain assignments", () => {
    expect(parse("A=1\nB=two")).toEqual({ A: "1", B: "two" });
  });

  it("ignores comments and blank lines", () => {
    // The env files in this repo are mostly comments.
    expect(parse("# a note\n\nA=1\n   # indented note\nB=2\n")).toEqual({
      A: "1",
      B: "2",
    });
  });

  it("keeps everything after the first '=' — connection strings depend on it", () => {
    const url =
      "postgresql://postgres.ref:p%40ss@aws-0-us-west-2.pooler.supabase.com:6543/postgres";
    expect(parse(`DATABASE_URL=${url}`).DATABASE_URL).toBe(url);
  });

  it("does not treat a '#' inside a value as a comment", () => {
    // A '#' is legal in a password. Stripping from '#' onward would silently
    // truncate the URL and produce an auth error nobody could explain.
    expect(parse("PASSWORD=abc#def").PASSWORD).toBe("abc#def");
  });

  it("strips matching surrounding quotes", () => {
    expect(parse(`A="quoted"\nB='single'`)).toEqual({ A: "quoted", B: "single" });
  });

  it("leaves unbalanced quotes alone", () => {
    expect(parse(`A="unclosed`).A).toBe('"unclosed');
  });

  it("trims surrounding whitespace", () => {
    expect(parse("  A =  1  ").A).toBe("1");
  });

  it("skips lines with no '='", () => {
    expect(parse("NOT_AN_ASSIGNMENT\nA=1")).toEqual({ A: "1" });
  });

  it("keeps an explicitly empty value", () => {
    // Distinct from absent: someone may have blanked a variable on purpose.
    expect(parse("A=")).toEqual({ A: "" });
  });

  it("lets a later line win", () => {
    expect(parse("A=1\nA=2").A).toBe("2");
  });
});
