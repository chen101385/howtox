/**
 * Notification dispatch.
 *
 * Sits between the booking lifecycle and the provider so no caller assembles a
 * message itself. Three responsibilities, and no others:
 *
 *   1. look up the recipient's contact details through the narrow repository
 *   2. render the copy with the active client's terminology and branding
 *   3. hand it to the provider
 *
 * **A notification failure never fails the operation that triggered it.** A
 * confirmation email that does not send is a bad experience; a booking that
 * rolls back because an email did not send is a lost sale and a charged card
 * with nothing to show for it. So every send is caught and logged, and the
 * caller is not told. That is a deliberate trade, not an oversight — and it is
 * why the demo provider keeps an outbox tests can assert on, rather than relying
 * on a return value nobody checks.
 */

import { client } from "@/config/active";
import { getRepositories } from "@/data";
import { getProviders } from "@/providers";
import type { TenantId, UserId } from "@/domain/ids";
import {
  renderNotification,
  type NotificationContext,
  type NotificationPayload,
} from "@/domain/notifications";

/**
 * Terminology and branding for the active client.
 *
 * Read here rather than threaded through every call site, because every
 * notification needs all of it and none of it varies per message.
 */
function contextForClient(): NotificationContext {
  return {
    brandName: client.config.site.brand.name,
    listingTerm: client.terms.listing(),
    occurrenceTerm: client.terms.occurrence(),
    providerTerm: client.terms.provider(),
    customerTerm: client.terms.customer(),
    // Vercel sets VERCEL_URL without a scheme. Absent locally, in which case
    // rendered links stay relative — useful in a log, honest in an email that
    // nothing is sending anyway.
    baseUrl:
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
  };
}

/**
 * Renders and sends one notification. Resolves to whether it was sent, for
 * tests and logging — callers in the booking path deliberately ignore it.
 */
export async function notify(args: {
  tenantId: TenantId;
  userId: UserId;
  payload: NotificationPayload;
  reference?: string;
}): Promise<boolean> {
  try {
    const contact = await getRepositories().users.getContact(
      args.tenantId,
      args.userId
    );

    if (!contact) {
      // Not an error: seeded demo personas have no contact record, and a user
      // may legitimately have no address. Logged by id — never by address —
      // so a missing-notification report is diagnosable.
      console.info(
        `[notifications] skipped ${args.payload.kind} for ${args.userId}: no contact record`
      );
      return false;
    }

    const rendered = renderNotification(
      args.payload,
      // Their own pseudonymous display name — never their legal name.
      { displayName: contact.displayName },
      contextForClient()
    );

    const result = await getProviders().notifications.send({
      tenantId: args.tenantId,
      kind: args.payload.kind,
      to: { email: contact.email, displayName: contact.displayName },
      subject: rendered.subject,
      text: rendered.text,
      reference: args.reference,
    });

    return result.ok;
  } catch (cause) {
    // Swallowed on purpose — see the note at the top of this file.
    console.error(`[notifications] ${args.payload.kind} failed to send:`, cause);
    return false;
  }
}
