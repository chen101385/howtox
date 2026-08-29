import { describe, expect, it } from "vitest";
import { assessListingText, assessText, assessWithHistory } from "./risk";

/**
 * Anti-circumvention tests.
 *
 * False positives are the expensive failure here: wrongly blocking an innocent
 * message trains people to distrust the product. The "leaves alone" block below
 * is therefore as important as the detection block.
 */

describe("assessText — unambiguous contact and payment exchange", () => {
  it("blocks a plain email address", () => {
    const result = assessText("just email me at dev.k@example.com and we'll sort it");
    expect(result.severity).toBe("clear");
    expect(result.action).toBe("block");
    expect(result.findings.some((f) => f.kind === "email")).toBe(true);
  });

  it("blocks an obfuscated email", () => {
    const result = assessText("reach me at marisol at gmail dot com");
    expect(result.severity).toBe("clear");
    expect(result.findings.some((f) => f.kind === "obfuscated_email")).toBe(true);
  });

  it("blocks a full phone number", () => {
    const result = assessText("my number is 415 555 0147, text anytime");
    expect(result.severity).toBe("clear");
    expect(result.findings.some((f) => f.kind === "phone")).toBe(true);
  });

  it("blocks a phone number written with dashes and parens", () => {
    const result = assessText("call (415) 555-0147");
    expect(result.severity).toBe("clear");
    expect(result.findings.some((f) => f.kind === "phone")).toBe(true);
  });

  it("blocks a payment app aimed at a participant", () => {
    for (const text of [
      "you can venmo me",
      "just paypal me instead",
      "I can cashapp you the difference",
    ]) {
      const result = assessText(text);
      expect(result.severity, text).toBe("clear");
      expect(result.findings.some((f) => f.kind === "payment_app")).toBe(true);
    }
  });

  it("blocks a literal cashtag handle", () => {
    const result = assessText("my tag is $lamplighter if that's easier");
    expect(result.severity).toBe("clear");
  });

  it("blocks a payment app when the message also solicits off-platform payment", () => {
    const result = assessText("next time pay me directly, venmo is fine");
    expect(result.severity).toBe("clear");
  });

  it("only warns on a passing payment-app mention", () => {
    // The classic false positive: a real conversation about someone else's money.
    const result = assessText("I'll venmo my flatmate for dinner after this");
    expect(result.severity).toBe("ambiguous");
    expect(result.action).toBe("warn");
  });

  it("blocks explicit off-platform solicitation", () => {
    for (const text of [
      "next time just pay me directly",
      "we can book direct and avoid the fees",
      "let's do it off the app",
    ]) {
      const result = assessText(text);
      expect(result.severity, text).toBe("clear");
    }
  });

  it("blocks external meeting links", () => {
    const result = assessText("here's the link: https://zoom.us/j/1234567890");
    expect(result.severity).toBe("clear");
    expect(result.findings.some((f) => f.kind === "external_meeting_link")).toBe(true);
  });

  it("redacts the matched text rather than storing it verbatim", () => {
    const result = assessText("email dev.k@example.com");
    const excerpt = result.findings[0].excerpt;
    expect(excerpt).not.toContain("dev.k@example.com");
    expect(excerpt).toContain("*");
  });
});

describe("assessText — ambiguous signals warn but do not block", () => {
  it("warns on a bare social handle", () => {
    const result = assessText("my portfolio is on instagram @marisolmakes");
    expect(result.severity).toBe("ambiguous");
    expect(result.action).toBe("warn");
  });
});

describe("assessText — leaves ordinary messages alone", () => {
  const innocuous = [
    "See you Friday at 8!",
    "The session was 60 minutes and worth every penny.",
    "It cost $60 and I'd pay it again.",
    "Can we start at 7:30 instead?",
    "I booked for 2026-08-29, is that right?",
    "There were 12 of us and 3 dropped out.",
    "Bring a deck of 52 cards.",
    "My kitchen is tiny but I managed.",
    "Loved round 6, the connections one.",
    "I'll be about 5 minutes late, sorry!",
    "That was the best £45 I've spent this year.",
    "We had 4 people and 2 laptops between us.",
  ];

  for (const text of innocuous) {
    it(`allows: "${text}"`, () => {
      const result = assessText(text);
      expect(result.severity).toBe("none");
      expect(result.action).toBe("allow");
      expect(result.findings).toHaveLength(0);
    });
  }

  it("does not read a price as a phone number", () => {
    expect(assessText("$1,234.56 total").severity).toBe("none");
  });

  it("does not read an ISO date as a phone number", () => {
    expect(assessText("scheduled 2026-08-29").severity).toBe("none");
  });

  it("does not treat the bare word 'at' as an email", () => {
    expect(assessText("meet at eight at the latest").severity).toBe("none");
  });

  it("allows an empty message", () => {
    expect(assessText("   ").action).toBe("allow");
  });
});

describe("assessWithHistory — progressive enforcement", () => {
  it("blocks a first clear violation without flagging for review", () => {
    const result = assessWithHistory("email me at a@b.com", 0);
    expect(result.action).toBe("block");
    expect(result.flagForManualReview).toBe(false);
  });

  it("escalates a repeat clear violation to manual review", () => {
    const result = assessWithHistory("email me at a@b.com", 1);
    expect(result.action).toBe("review");
    expect(result.flagForManualReview).toBe(true);
    expect(result.createsRiskSignal).toBe(true);
  });

  it("escalates accumulated ambiguous signals to review", () => {
    const result = assessWithHistory("find me on instagram @someone", 0, 2);
    expect(result.action).toBe("review");
    expect(result.createsRiskSignal).toBe(true);
  });

  it("does not escalate a single ambiguous signal", () => {
    const result = assessWithHistory("find me on instagram @someone", 0, 0);
    expect(result.action).toBe("warn");
    expect(result.createsRiskSignal).toBe(false);
  });

  it("leaves clean messages alone regardless of history", () => {
    const result = assessWithHistory("looking forward to it", 5, 5);
    expect(result.action).toBe("allow");
  });
});

describe("assessListingText", () => {
  it("flags contact details embedded in a listing description", () => {
    const result = assessListingText({
      title: "Ghost stories",
      description: "Book me directly at host@example.com for a better price",
    });
    expect(result.ok).toBe(false);
    expect(result.problems[0].field).toBe("description");
  });

  it("passes a clean listing", () => {
    const result = assessListingText({
      title: "Ghost Stories by Lamplight",
      description: "An hour of folklore. You vote on which story gets told.",
    });
    expect(result.ok).toBe(true);
  });
});
