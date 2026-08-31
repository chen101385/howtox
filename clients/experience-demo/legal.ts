/**
 * Legal documents for the demo client.
 *
 * EVERY DOCUMENT HERE IS MARKED `templateOnly`, and that flag renders a visible
 * notice on the page. This text is a structural starting point — the sections a
 * remote live-experience marketplace actually needs — not reviewed legal copy.
 * Nothing here has been near a lawyer, and jurisdictions differ on nearly all of
 * it (consumer cancellation rights, data transfer, platform liability, whether
 * hosts are contractors).
 *
 * What it IS useful for: it states the platform's actual behavior accurately,
 * which is the part a lawyer cannot write for you. Where this codebase does
 * something specific — guaranteed compensation independent of ratings,
 * watermarking without recording detection, nothing auto-adjudicated — the text
 * says so in those terms, so a review starts from the truth.
 */

import type { LegalDocument } from "@/config/client-config";

const UPDATED = "2026-08-31";

export const DEMO_LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    id: "terms",
    title: "Terms of service",
    updatedAt: UPDATED,
    summary:
      "What you agree to when you book or host a session, and what we are and are not responsible for.",
    templateOnly: true,
    sections: [
      {
        heading: "What this service is",
        body: [
          "Lantern Rooms is a marketplace that connects people who want to spend an hour doing something interesting with people who can host that hour. Sessions happen remotely, over live audio and video. We do not run the sessions ourselves.",
          "Hosts decide their own format, schedule and price. We provide discovery, booking, payment handling, the session room, and a process for when something goes wrong.",
        ],
      },
      {
        heading: "Accounts",
        body: [
          "You need an account to book or host. You are responsible for what happens under your account, and for keeping access to the email address it uses.",
          "You must be old enough to enter a contract where you live. Some sessions are restricted to adults; those restrictions are shown on the listing.",
        ],
      },
      {
        heading: "Bookings and payment",
        body: [
          "A booking is a contract between you and the host for a specific session at a specific time. We collect payment and pass on the host's share.",
          "Prices shown include our fee. The split between host compensation, platform fee and payment processing is shown before you pay.",
        ],
      },
      {
        heading: "Host compensation",
        body: [
          "Hosts are guaranteed a defined share of the session price for delivering the session as described. That guarantee does not depend on the rating a guest gives afterwards.",
          "A separate, discretionary bonus may respond to guest feedback. A low rating can reduce or remove a bonus; it can never reduce the guarantee.",
          "This is deliberate. A rating-dependent base payment turns every dissatisfied guest into a pay cut, which pushes hosts toward safe, unambitious sessions.",
        ],
      },
      {
        heading: "Recording",
        body: [
          "Recording or redistributing a session without the consent of everyone in it is prohibited. Accounts that do it can be removed.",
          "We do not claim to prevent recording, and we do not detect it. Any live video can be captured by a determined participant, and telling you otherwise would be false. What we do is display an individualized watermark during sessions, so material that leaks can be attributed to the account it came from.",
          "We do not record session audio or video ourselves, and we do not transcribe or analyze what is said.",
        ],
      },
      {
        heading: "Conduct and enforcement",
        body: [
          "Sessions must match how they were described. Harassment, hate, threats and sexual content outside a listing's stated scope are not permitted.",
          "Reports are reviewed by a person. Nothing is decided automatically: our systems produce indicators and suggested outcomes, and a human decides. An indicator is not proof of misconduct.",
        ],
      },
      {
        heading: "Booking off the platform",
        body: [
          "Arranging payment or contact outside the platform removes the protections both sides rely on — the compensation guarantee, cancellation cover, and any route to dispute resolution.",
          "We detect unambiguous attempts to move a transaction off-platform in messages and listings, warn first, and only then restrict. We accept that this will occasionally flag an innocent message; wrongly blocking someone is the failure we work hardest to avoid.",
        ],
      },
      {
        heading: "What we are not responsible for",
        body: [
          "We do not warrant that a session will meet your expectations. Hosts are independent; they are not our employees or agents.",
          "We are not responsible for failures of your own internet connection, device or software.",
          "Nothing here limits rights you have under consumer law where you live, which in many places cannot be waived.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "We will publish changes here with a new date. Material changes will be sent to the email address on your account before they take effect.",
        ],
      },
    ],
  },

  {
    id: "privacy",
    title: "Privacy",
    updatedAt: UPDATED,
    summary:
      "What we collect, what other users can see about you, and what we never publish.",
    templateOnly: true,
    sections: [
      {
        heading: "What other users can see",
        body: [
          "A display name, a handle, an avatar if you set one, and how long you have had an account. That is the whole public profile.",
          "Your display name does not have to be your legal name. Pseudonymity is the default, and hosts commonly use a stage name.",
        ],
      },
      {
        heading: "What is never published",
        body: [
          "Your legal surname, email address, phone number, home address, payout details and any identity documents are never shown to another user, and never appear in a session watermark.",
          "This is enforced in code rather than by policy alone: public and private records are separate types, and a single audited function converts one to the other.",
        ],
      },
      {
        heading: "What we collect",
        body: [
          "Account details you give us: email address, display name, and — if you host and take payouts — the identity and payment details our payment provider requires.",
          "Booking records: what you booked, when, for how much, and its outcome.",
          "Operational metadata about sessions: who joined, when, for how long, and technical quality indicators. This exists so a dispute about whether a session happened can be resolved.",
          "Message content between users, so moderation and dispute review are possible.",
        ],
      },
      {
        heading: "What we do not collect",
        body: [
          "We do not record session audio or video. We do not transcribe sessions, and we do not analyze what is said in them for any purpose.",
        ],
      },
      {
        heading: "Who we share it with",
        body: [
          "Service providers who make the product work — payment processing, live video, email delivery, hosting and error monitoring — and only what each needs.",
          "Law enforcement where we are legally required to, and where a person's safety is at immediate risk.",
          "We do not sell personal information.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "You can change your display name and handle at any time.",
          "You can ask for a copy of your data, or ask us to delete your account. Some records — payment history, and records relating to a safety report — are kept where law or a live dispute requires it.",
        ],
      },
    ],
  },

  {
    id: "cancellation",
    title: "Cancellation and refunds",
    updatedAt: UPDATED,
    summary:
      "What happens when a guest cancels, a host cancels, or the technology fails.",
    templateOnly: true,
    sections: [
      {
        heading: "If you cancel as a guest",
        body: [
          "Cancel more than 24 hours before the start time and you are refunded in full.",
          "Cancel inside 24 hours and the host receives a share of the price. A host who has kept an evening free deserves something for it; a guest whose plans changed should not lose everything. The split is shown at the point of cancelling.",
        ],
      },
      {
        heading: "If a host cancels",
        body: [
          "You are refunded in full. Repeated host cancellations affect a host's standing on the platform.",
        ],
      },
      {
        heading: "If the session does not work",
        body: [
          "If a session is interrupted or fails for technical reasons, the payment is held and a person reviews what happened. Neither side is paid or refunded automatically, because the records alone rarely show whose connection failed.",
          "We will tell you the outcome and why.",
        ],
      },
      {
        heading: "If a session was not what was described",
        body: [
          "Tell us. A materially different session is a refund question, and it is handled by a person looking at the listing and what happened.",
          "A session you simply did not enjoy is not a refund question. It is a rating question, and rating honestly does not take money away from the host's guarantee.",
        ],
      },
    ],
  },

  {
    id: "conduct",
    title: "Community guidelines",
    updatedAt: UPDATED,
    summary:
      "What is expected of everyone in a session, and how to get help during one.",
    templateOnly: true,
    sections: [
      {
        heading: "The short version",
        body: [
          "Be the kind of person other people are glad turned up. Hosts: deliver what you advertised. Guests: let the host run the session.",
        ],
      },
      {
        heading: "Not permitted",
        body: [
          "Harassment, hate speech, threats or intimidation.",
          "Sexual content outside the stated scope of a listing.",
          "Turning up so intoxicated that you disrupt the session for everyone else.",
          "Recording or redistributing a session without everyone's consent.",
          "Bringing someone into a session who has not been disclosed to the host.",
        ],
      },
      {
        heading: "Getting help during a session",
        body: [
          "There is a report control available at all times during a session, to every participant. You do not have to finish the session, explain yourself, or find a menu first — you can leave whenever you want and report afterwards.",
          "Reports go to a person. The person you report is not shown your report or told what it said.",
        ],
      },
      {
        heading: "How enforcement works",
        body: [
          "A first, minor issue usually gets a warning. Serious issues — threats, sexual misconduct, recording and redistributing someone — do not.",
          "Decisions are made by people. If we get it wrong, you can appeal and a different person will look at it.",
        ],
      },
    ],
  },
];
