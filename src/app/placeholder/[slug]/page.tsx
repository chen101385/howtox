export default function PlaceholderPage() {
  return (
    <section className="min-h-[60vh] bg-bg px-6 py-24 sm:px-8">
      <div className="mx-auto max-w-2xl rounded-theme border border-border bg-surface p-8 sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Coming soon
        </p>
        <h1 className="mt-4 font-heading text-4xl font-semibold text-fg">
          This page is still being shaped.
        </h1>
        <p className="mt-5 max-w-xl leading-7 text-muted">
          This navigation destination is a placeholder for now. Nothing has been
          published here yet.
        </p>
        <a
          href="/"
          className="mt-8 inline-flex rounded-theme border border-border bg-bg px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Back to home
        </a>
      </div>
    </section>
  );
}
