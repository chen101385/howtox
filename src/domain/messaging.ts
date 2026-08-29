/**
 * Conversations and messages.
 *
 * Messages pass through anti-circumvention assessment before being persisted.
 * Blocked messages are not stored as delivered content; only the fact of the
 * block and a redacted excerpt are retained, which is enough for dispute review
 * without warehousing people's contact details.
 */

import type { ConversationId, MessageId, TenantId, UserId } from "./ids";
import { assessWithHistory, type RiskAssessment } from "./risk";

export type MessageStatus = "sent" | "warned" | "blocked";

export type Message = {
  id: MessageId;
  conversationId: ConversationId;
  senderUserId: UserId;
  body: string;
  status: MessageStatus;
  sentAt: string;
  /** Present when the sender was warned or blocked. */
  moderation?: {
    action: RiskAssessment["action"];
    kinds: string[];
    message: string;
  };
};

export type Conversation = {
  id: ConversationId;
  tenantId: TenantId;
  participantUserIds: UserId[];
  /** Booking this conversation relates to, when applicable. */
  bookingRef?: string;
  messages: Message[];
  createdAt: string;
  /** Counters that drive progressive enforcement. */
  clearViolations: number;
  ambiguousSignals: number;
  blockedForUserIds?: UserId[];
};

export type SendMessageResult = {
  conversation: Conversation;
  message: Message;
  delivered: boolean;
  assessment: ReturnType<typeof assessWithHistory>;
};

/**
 * Applies moderation and appends the message.
 *
 * A blocked message stores only a redaction notice in `body`, never the original
 * text — the sender sees why it was blocked, and the recipient never receives it.
 */
export function sendMessage(args: {
  conversation: Conversation;
  senderUserId: UserId;
  body: string;
  messageId: MessageId;
  at?: string;
}): SendMessageResult {
  const { conversation, senderUserId, body, messageId } = args;
  const assessment = assessWithHistory(
    body,
    conversation.clearViolations,
    conversation.ambiguousSignals
  );

  const blocked = assessment.action === "block" || assessment.action === "review";
  const status: MessageStatus = blocked ? "blocked" : assessment.action === "warn" ? "warned" : "sent";

  const message: Message = {
    id: messageId,
    conversationId: conversation.id,
    senderUserId,
    body: blocked ? "[Message blocked: shared contact or payment details]" : body,
    status,
    sentAt: args.at ?? new Date().toISOString(),
    moderation:
      assessment.action === "allow"
        ? undefined
        : {
            action: assessment.action,
            kinds: Array.from(new Set(assessment.findings.map((f) => f.kind))),
            message: assessment.message,
          },
  };

  const next: Conversation = {
    ...conversation,
    messages: [...conversation.messages, message],
    clearViolations:
      conversation.clearViolations + (assessment.severity === "clear" ? 1 : 0),
    ambiguousSignals:
      conversation.ambiguousSignals + (assessment.severity === "ambiguous" ? 1 : 0),
  };

  return { conversation: next, message, delivered: !blocked, assessment };
}

/** Messages visible to a recipient — blocked content is never delivered. */
export function visibleMessages(
  conversation: Conversation,
  viewerUserId: UserId
): Message[] {
  return conversation.messages.filter(
    (m) => m.status !== "blocked" || m.senderUserId === viewerUserId
  );
}
