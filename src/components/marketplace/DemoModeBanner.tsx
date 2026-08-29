/**
 * Demo-mode disclosure.
 *
 * Every third-party integration in this build is a mock. Users (and anyone
 * demoing this) must never mistake a simulated charge or an empty session shell
 * for the real thing, so the banner states plainly what is not real.
 */
export function DemoModeBanner({ mocked }: { mocked: string[] }) {
  if (mocked.length === 0) return null;

  return (
    <div
      role="note"
      className="border-b border-border bg-surface px-6 py-2 text-center text-xs text-muted"
    >
      <strong className="font-semibold text-fg">Demo mode.</strong>{" "}
      {mocked.join(", ")} are simulated — no payments, no real video, no persistence
      beyond this server process.
    </div>
  );
}
