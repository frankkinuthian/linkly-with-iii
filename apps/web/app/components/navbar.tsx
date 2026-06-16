import Link from "next/link";

export function Navbar() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-5xl flex h-14 items-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-heading font-bold tracking-tight">
            Linkly
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-sm">
          <Link
            href="http://localhost:3001/docs"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Docs
          </Link>
          <Link
            href="http://localhost:3001/reference"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            API
          </Link>
        </nav>
      </div>
    </header>
  );
}
