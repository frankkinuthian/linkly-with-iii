import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Linkly Docs</h1>
      <p className="text-fd-muted-foreground max-w-md">
        Learn how to build a URL shortener with iii, from first function to
        full-stack Next.js deployment.
      </p>
      <div className="flex gap-4">
        <Link
          href="/docs"
          className="rounded-md bg-fd-primary px-6 py-2.5 text-sm font-medium text-fd-primary-foreground hover:bg-fd-primary/90"
        >
          Read the Tutorial
        </Link>
        <Link
          href="/reference"
          className="rounded-md border border-fd-border px-6 py-2.5 text-sm font-medium hover:bg-fd-accent"
        >
          API Reference
        </Link>
      </div>
    </main>
  );
}
