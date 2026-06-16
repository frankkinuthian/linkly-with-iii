"use client";

import { useState } from "react";
import { Button } from "@repo/design-system/components/button";
import { Input } from "@repo/design-system/components/input";
import { Label } from "@repo/design-system/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/card";
import { toast } from "sonner";
import { createLink } from "../actions";

export function CreateLinkForm() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const data = new FormData(form);
    const url = data.get("url") as string;
    const code = data.get("code") as string;

    try {
      const link = await createLink(url, code || undefined);
      toast.success("Link created", {
        description: `${link.code} → ${link.url}`,
      });
      form.reset();
    } catch (err) {
      toast.error("Failed to create link", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a short link</CardTitle>
        <CardDescription>
          Enter a URL to shorten. Optionally pick a custom code.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Destination URL</Label>
            <Input
              id="url"
              name="url"
              type="url"
              placeholder="https://example.com/my-long-url"
              required
            />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-2">
              <Label htmlFor="code">
                Custom code{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input id="code" name="code" placeholder="my-code" />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Shorten"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
