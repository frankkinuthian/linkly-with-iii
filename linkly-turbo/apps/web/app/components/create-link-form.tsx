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
import { createLink } from "../actions";
import type { CreateLinkOutput } from "@repo/database/types";

export function CreateLinkForm() {
  const [result, setResult] = useState<CreateLinkOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const data = new FormData(form);
    const url = data.get("url") as string;
    const code = data.get("code") as string;

    try {
      const link = await createLink(url, code || undefined);
      setResult(link);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
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
          <div className="space-y-2">
            <Label htmlFor="code">
              Custom code{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input id="code" name="code" placeholder="my-code" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Shorten"}
          </Button>
        </form>

        {error && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-md border bg-muted/50 p-3 text-sm">
            <p className="text-muted-foreground">Created:</p>
            <p className="mt-1 font-mono font-medium">
              {result.code} → {result.url}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
