import { Button } from "@repo/design-system/components/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Linkly</h1>
      <p className="text-muted-foreground">URL shortener powered by iii</p>
      <Button size="lg">Get started</Button>
    </main>
  );
}
