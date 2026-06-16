import { CreateLinkForm } from "./components/create-link-form";
import { LiveClicks } from "./components/live-clicks";
import { LinksList } from "./components/links-list";
import { listLinks } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const links = await listLinks();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-heading font-bold tracking-tight">
          Linkly
        </h1>
        <p className="text-muted-foreground">
          Shorten links. Track clicks. In real time.
        </p>
      </div>
      <CreateLinkForm />
      <LinksList initialLinks={links} />
      <LiveClicks />
    </main>
  );
}
