import { Button } from "@repo/design-system/components/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Linkly Docs</h1>
      <p className="text-muted-foreground text-center max-w-md">
        API documentation for the Linkly URL shortener. Explore endpoints, try
        requests, and see response schemas.
      </p>
      <Link href="/reference">
        <Button variant="default" size="lg">
          View API Reference
        </Button>
      </Link>
    </main>
  );
}
