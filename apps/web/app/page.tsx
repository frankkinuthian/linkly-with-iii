import { CreateLinkForm } from "./components/create-link-form";
import { LiveClicks } from "./components/live-clicks";
import { LinksList } from "./components/links-list";
import { Navbar } from "./components/navbar";
import { listLinks } from "./actions";
import { Separator } from "@repo/design-system/components/separator";

export const dynamic = "force-dynamic";

export default async function Home() {
  const links = await listLinks();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            <CreateLinkForm />
            <Separator />
            <LinksList initialLinks={links} />
          </div>
          <aside className="space-y-6">
            <LiveClicks />
          </aside>
        </div>
      </main>
    </div>
  );
}
