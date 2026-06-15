import { Button } from "@repo/ui/components/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Linkly Docs</h1>
      <p className="text-muted-foreground">API documentation coming soon.</p>
      <Button variant="outline" size="lg">
        View endpoints
      </Button>
    </main>
  );
}
