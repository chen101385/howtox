import type { ReactNode } from "react";

/** Centered, max-width, responsive gutter wrapper used by every section. */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-content px-6 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}
