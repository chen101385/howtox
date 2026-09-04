"use client";

import Image from "next/image";
import { useEffect, useState, type FocusEvent } from "react";
import type { Brand, Navigation } from "@/config/types";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";

/**
 * Sticky top nav. Brand, links, optional mega-menu and actions all come from config.
 *
 * `viewerMenu` is passed in rather than rendered here so this stays a pure
 * presentational component that legacy marketing clients can use unchanged.
 */
export function Header({
  brand,
  nav,
  viewerMenu,
  showSecondaryCta = true,
}: {
  brand: Brand;
  nav: Navigation;
  viewerMenu?: React.ReactNode;
  showSecondaryCta?: boolean;
}) {
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hasMegaMenu = Boolean(nav.megaMenu?.length);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveMenu(null);
        setMobileOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  function closeWhenFocusLeaves(event: FocusEvent<HTMLElement>) {
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      setActiveMenu(null);
    }
  }

  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur"
      onMouseLeave={() => setActiveMenu(null)}
      onBlur={closeWhenFocusLeaves}
    >
      <Container className="flex h-16 items-center gap-4">
        <a
          href="/"
          className={`flex shrink-0 items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            hasMegaMenu ? "border-r border-border pr-4 xl:pr-6" : ""
          }`}
          aria-label={`${brand.name} home`}
        >
          <Image
            src={brand.logo.src}
            alt={brand.logo.alt}
            width={brand.logo.width ?? 160}
            height={brand.logo.height ?? 40}
            className="h-8 w-auto"
            priority
          />
        </a>

        <nav className="hidden min-w-0 flex-1 items-stretch justify-center self-stretch lg:flex">
          {nav.megaMenu?.map((item, index) => {
            const isOpen = activeMenu === index;
            const panelId = `mega-menu-${index}`;

            return (
              <div
                key={item.label}
                className="flex items-stretch"
                onMouseEnter={() => setActiveMenu(index)}
              >
                <button
                  type="button"
                  className={`relative px-2 text-sm font-medium text-fg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent xl:px-3 ${
                    isOpen
                      ? "after:absolute after:inset-x-2 after:bottom-0 after:h-1 after:bg-primary xl:after:inset-x-3"
                      : "hover:text-primary"
                  }`}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setActiveMenu(index)}
                  onFocus={() => setActiveMenu(index)}
                >
                  {item.label}
                </button>

                <div
                  id={panelId}
                  className={`absolute inset-x-0 top-full grid border-t border-border bg-bg shadow-lg transition-[grid-template-rows,opacity] duration-[250ms] ease-out ${
                    isOpen
                      ? "pointer-events-auto grid-rows-[1fr] opacity-100"
                      : "pointer-events-none grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <Container className="grid grid-cols-[324px_1fr] py-9">
                      <div className="border-r border-border pr-12">
                        <p className="font-heading text-2xl font-semibold text-fg">
                          {item.title}
                        </p>
                        <p className="mt-3 max-w-[15rem] text-sm leading-6 text-muted">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex gap-16 pl-12">
                        {item.groups.map((group) => (
                          <div key={group.label} className="min-w-40">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                              {group.label}
                            </p>
                            <div className="mt-5 flex flex-col gap-6">
                              {group.links.map((link) => (
                                <a
                                  key={`${link.label}-${link.href}`}
                                  href={link.href}
                                  className="w-fit text-base font-medium text-fg transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                  onClick={() => setActiveMenu(null)}
                                >
                                  {link.label}
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Container>
                  </div>
                </div>
              </div>
            );
          })}

          {!hasMegaMenu &&
            nav.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center px-4 text-sm text-muted transition-colors hover:text-fg"
              >
                {link.label}
              </a>
            ))}
        </nav>

        <div className="ml-auto hidden shrink-0 items-center gap-3 lg:flex">
          {viewerMenu}
          {showSecondaryCta && nav.secondaryCta && <Button link={nav.secondaryCta} />}
          {nav.cta && <Button link={nav.cta} />}
        </div>

        <button
          type="button"
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-theme border border-border text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
          <span className="flex w-5 flex-col gap-1.5" aria-hidden="true">
            <span
              className={`h-0.5 w-full bg-fg transition-transform ${
                mobileOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span className={`h-0.5 w-full bg-fg ${mobileOpen ? "opacity-0" : ""}`} />
            <span
              className={`h-0.5 w-full bg-fg transition-transform ${
                mobileOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </Container>

      <div
        id="mobile-navigation"
        className={`absolute inset-x-0 top-full max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-border bg-bg shadow-lg lg:hidden ${
          mobileOpen ? "block" : "hidden"
        }`}
      >
        <Container className="py-5">
          <nav aria-label="Mobile navigation" className="flex flex-col">
            {nav.megaMenu?.map((item) => (
              <details key={item.label} className="border-b border-border">
                <summary className="cursor-pointer py-4 font-heading text-lg font-semibold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  {item.label}
                </summary>
                <p className="pb-4 text-sm leading-6 text-muted">{item.description}</p>
                <div className="flex flex-col gap-5 pb-5">
                  {item.groups.map((group) => (
                    <div key={group.label}>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        {group.label}
                      </p>
                      <div className="flex flex-col gap-3">
                        {group.links.map((link) => (
                          <a
                            key={`${link.label}-${link.href}`}
                            href={link.href}
                            className="w-fit font-medium text-fg"
                            onClick={() => setMobileOpen(false)}
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}

            {!hasMegaMenu &&
              nav.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="border-b border-border py-4 font-medium text-fg"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
          </nav>

          <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5">
            {viewerMenu}
            {showSecondaryCta && nav.secondaryCta && (
              <Button link={nav.secondaryCta} className="w-full" />
            )}
            {nav.cta && <Button link={nav.cta} className="w-full" />}
          </div>
        </Container>
      </div>
    </header>
  );
}
