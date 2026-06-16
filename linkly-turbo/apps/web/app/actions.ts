"use server";

import { iii } from "@repo/iii";
import type {
  Link,
  CreateLinkInput,
  CreateLinkOutput,
  ResolveLinkOutput,
  DeleteLinkOutput,
} from "@repo/database/types";
import { revalidatePath } from "next/cache";

export async function createLink(
  url: string,
  code?: string,
): Promise<CreateLinkOutput> {
  const link = await iii.trigger<CreateLinkInput, CreateLinkOutput>({
    function_id: "link::create",
    payload: { url, code: code || undefined },
  });
  revalidatePath("/");
  return link;
}

export async function listLinks(): Promise<Link[]> {
  const { rows } = await iii.trigger<
    { db: string; sql: string },
    { rows: Link[] }
  >({
    function_id: "database::query",
    payload: {
      db: "primary",
      sql: "SELECT code, url, created_at FROM links ORDER BY created_at DESC LIMIT 50",
    },
  });
  return rows;
}

export async function resolveLink(code: string): Promise<ResolveLinkOutput> {
  return iii.trigger<{ code: string }, ResolveLinkOutput>({
    function_id: "link::resolve",
    payload: { code },
  });
}

export async function deleteLink(code: string): Promise<DeleteLinkOutput> {
  const result = await iii.trigger<{ code: string }, DeleteLinkOutput>({
    function_id: "link::delete",
    payload: { code },
  });
  revalidatePath("/");
  return result;
}
