"use client";

import { Button } from "@repo/design-system/components/button";
import type { Link } from "@repo/database/types";
import { deleteLink } from "../actions";
import { useState } from "react";

export function LinksList({ initialLinks }: { initialLinks: Link[] }) {
  const [links, setLinks] = useState(initialLinks);

  async function handleDelete(code: string) {
    await deleteLink(code);
    setLinks((prev) => prev.filter((l) => l.code !== code));
  }

  if (links.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No links yet. Create one above.
      </p>
    );
  }

  return (
    <div className="w-full max-w-md space-y-2">
      <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Your links
      </h2>
      <ul className="divide-y rounded-lg border">
        {links.map((link) => (
          <li
            key={link.code}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-medium truncate">
                {link.code}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {link.url}
              </p>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleDelete(link.code)}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
