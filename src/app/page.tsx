import { client } from "@/config/active";
import { PageRenderer } from "@/sections/PageRenderer";

/**
 * Home page.
 *
 * Contains no section list of its own — the active client's `pages.home`
 * composition decides what renders and in what order. A brochure client and a
 * marketplace client run this identical file.
 *
 * Dynamic because marketplace sections read a schedule generated relative to now;
 * prerendering would freeze "live tonight" at build time.
 */
export const dynamic = "force-dynamic";

export default function Home() {
  return <PageRenderer composition={client.config.pages.home} client={client} />;
}
