/**
 * Demo-mode disclosure.
 *
 * Users (and anyone demoing this) must never mistake a simulated charge or an
 * empty session shell for the real thing, so the banner names what is not real.
 *
 * It shows whenever ANY provider is a mock, not only when all of them are. A
 * partially-live deployment — real sign-in, simulated payments — is the case
 * most likely to mislead someone, because the parts that work lend credibility
 * to the parts that do not.
 */
export function DemoModeBanner({ mocked }: { mocked: string[] }) {
  if (mocked.length === 0) return null;

  const list =
    mocked.length === 1
      ? mocked[0]
      : `${mocked.slice(0, -1).join(", ")} and ${mocked[mocked.length - 1]}`;

  return (
    <div
      role="note"
      className="border-b border-border bg-surface px-6 py-2 text-center text-xs text-muted"
    >
      <strong className="font-semibold text-fg">Demo mode.</strong>{" "}
      {`${list} ${mocked.length === 1 ? "is" : "are"} simulated. Nothing here charges a card, pays anyone out, or connects live video.`}
    </div>
  );
}
