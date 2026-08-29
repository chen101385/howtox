import { describe, expect, it } from "vitest";
import { InvalidTransitionError } from "./state-machine";
import { bookingMachine } from "./booking";
import { sessionMachine, defaultPermissions, requiresReview, completedNormally } from "./session";
import { incidentMachine, defaultSeverity, suggestedResolution } from "./incident";

describe("booking state machine", () => {
  it("allows the normal purchase path", () => {
    expect(bookingMachine.can("pending", "confirmed")).toBe(true);
    expect(bookingMachine.can("confirmed", "completed")).toBe(true);
  });

  it("allows a dispute to be raised after completion", () => {
    // Most disputes surface after the session, so `completed` must not be terminal.
    expect(bookingMachine.can("completed", "disputed")).toBe(true);
  });

  it("rejects refunding a booking that was never confirmed", () => {
    expect(bookingMachine.can("pending", "refunded")).toBe(false);
    expect(() => bookingMachine.transition("pending", "refunded")).toThrow(
      InvalidTransitionError
    );
  });

  it("rejects reviving a refunded booking", () => {
    expect(bookingMachine.isTerminal("refunded")).toBe(true);
    expect(() => bookingMachine.transition("refunded", "confirmed")).toThrow();
  });

  it("names the allowed transitions in the error", () => {
    try {
      bookingMachine.transition("pending", "refunded");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as Error).message).toContain("confirmed");
    }
  });
});

describe("session state machine", () => {
  it("allows lobby → live → completed", () => {
    expect(sessionMachine.can("scheduled", "lobby_open")).toBe(true);
    expect(sessionMachine.can("lobby_open", "live")).toBe(true);
    expect(sessionMachine.can("live", "completed")).toBe(true);
  });

  it("distinguishes who interrupted a live session", () => {
    expect(sessionMachine.can("live", "interrupted_by_host")).toBe(true);
    expect(sessionMachine.can("live", "interrupted_by_guest")).toBe(true);
  });

  it("rejects going live from scheduled without opening the lobby", () => {
    expect(sessionMachine.can("scheduled", "live")).toBe(false);
    expect(() => sessionMachine.transition("scheduled", "live")).toThrow();
  });

  it("rejects restarting a completed session", () => {
    expect(sessionMachine.can("completed", "live")).toBe(false);
  });

  it("routes every abnormal ending to review", () => {
    expect(sessionMachine.can("technical_failure", "under_review")).toBe(true);
    expect(sessionMachine.can("interrupted_by_host", "under_review")).toBe(true);
  });

  it("treats resolved as terminal", () => {
    expect(sessionMachine.isTerminal("resolved")).toBe(true);
  });

  it("classifies outcomes for compensation", () => {
    expect(completedNormally("completed")).toBe(true);
    expect(requiresReview("technical_failure")).toBe(true);
    expect(requiresReview("completed")).toBe(false);
  });
});

describe("participant permissions", () => {
  it("gives crowdshared audiences no publishing rights by default", () => {
    const audience = defaultPermissions("audience");
    expect(audience.canPublishAudio).toBe(false);
    expect(audience.canPublishVideo).toBe(false);
    expect(audience.canChat).toBe(true);
  });

  it("grants publishing only once promoted to the stage", () => {
    expect(defaultPermissions("stage_guest").canPublishAudio).toBe(true);
  });

  it("gives moderators control without a stage presence", () => {
    const mod = defaultPermissions("moderator");
    expect(mod.canModerate).toBe(true);
    expect(mod.canPublishVideo).toBe(false);
  });
});

describe("incident state machine", () => {
  it("allows the triage path", () => {
    expect(incidentMachine.can("submitted", "triaged")).toBe(true);
    expect(incidentMachine.can("triaged", "investigating")).toBe(true);
    expect(incidentMachine.can("investigating", "resolved")).toBe(true);
  });

  it("allows an appeal after resolution or dismissal", () => {
    expect(incidentMachine.can("resolved", "appealed")).toBe(true);
    expect(incidentMachine.can("dismissed", "appealed")).toBe(true);
  });

  it("rejects resolving straight from submitted", () => {
    expect(incidentMachine.can("submitted", "resolved")).toBe(false);
    expect(() => incidentMachine.transition("submitted", "resolved")).toThrow();
  });

  it("rejects reopening by an invalid edge", () => {
    expect(incidentMachine.can("resolved", "submitted")).toBe(false);
  });
});

describe("severity and dispute defaults", () => {
  it("treats harassment and threats as high severity", () => {
    expect(defaultSeverity("harassment")).toBe("high");
    expect(defaultSeverity("hate_or_threats")).toBe("high");
  });

  it("treats circumvention and recording as medium", () => {
    expect(defaultSeverity("unauthorized_recording")).toBe("medium");
    expect(defaultSeverity("off_platform_transaction_attempt")).toBe("medium");
  });

  it("requires human review for every abnormal outcome", () => {
    for (const status of [
      "cancelled_by_host",
      "cancelled_by_guest",
      "interrupted_by_guest",
      "interrupted_by_host",
      "technical_failure",
    ] as const) {
      expect(suggestedResolution(status).requiresHumanReview, status).toBe(true);
    }
  });

  it("does not require review for a normal completion", () => {
    const outcome = suggestedResolution("completed");
    expect(outcome.outcome).toBe("release_guaranteed_compensation");
    expect(outcome.requiresHumanReview).toBe(false);
  });

  it("reviews rather than voids host pay when a guest leaves early", () => {
    expect(suggestedResolution("interrupted_by_guest").outcome).toBe(
      "host_compensation_review"
    );
  });
});
