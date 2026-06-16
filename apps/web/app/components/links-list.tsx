"use client";

import { useState } from "react";
import { Button } from "@repo/design-system/components/button";
import { Badge } from "@repo/design-system/components/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/design-system/components/alert-dialog";
import { toast } from "sonner";
import type { Link } from "@repo/database/types";
import { deleteLink } from "../actions";

export function LinksList({ initialLinks }: { initialLinks: Link[] }) {
  const [links, setLinks] = useState(initialLinks);

  async function handleDelete(code: string) {
    try {
      await deleteLink(code);
      setLinks((prev) => prev.filter((l) => l.code !== code));
      toast.success("Link deleted", { description: code });
    } catch {
      toast.error("Failed to delete link");
    }
  }

  function copyLink(code: string) {
    const url = `${window.location.origin}/s/${code}`;
    navigator.clipboard.writeText(url);
    toast.info("Copied to clipboard", { description: url });
  }

  if (links.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          No links yet. Create one above to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Your links
        </h2>
        <Badge variant="secondary">{links.length}</Badge>
      </div>
      <div className="divide-y rounded-lg border">
        {links.map((link) => (
          <div
            key={link.code}
            className="flex items-center gap-3 px-4 py-3 group"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold">
                  {link.code}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(link.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {link.url}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => copyLink(link.code)}
              >
                Copy
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="xs">
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete link?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete{" "}
                      <span className="font-mono font-medium">{link.code}</span>{" "}
                      and remove it from the database. This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(link.code)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
