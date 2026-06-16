// ─── Domain Types ─────────────────────────────────────────────────────────────
// These mirror the database schema and are the contract between
// the iii workers and any consuming app (web, docs, CLI, tRPC, oRPC, Effect, etc.)

export type Link = {
  code: string;
  url: string;
  created_at: string;
};

export type Click = {
  id: number;
  code: string;
  clicked_at: string;
};

// ─── Function Payloads ───────────────────────────────────────────────────────
// Input/output shapes for iii functions. These can later become
// Zod schemas, Effect schemas, tRPC procedures, or oRPC contracts.

export type CreateLinkInput = {
  url: string;
  code?: string;
};

export type CreateLinkOutput = {
  code: string;
  url: string;
};

export type ResolveLinkInput = {
  code: string;
};

export type ResolveLinkOutput = {
  url: string | null;
};

export type UpdateLinkInput = {
  code: string;
  url: string;
};

export type UpdateLinkOutput = {
  code: string;
  url: string;
};

export type DeleteLinkInput = {
  code: string;
};

export type DeleteLinkOutput = {
  deleted: boolean;
};

export type RecordClickInput = {
  code: string;
  clicked_at: string;
};

export type RecordClickOutput = {
  recorded: boolean;
};

// ─── Event Types ─────────────────────────────────────────────────────────────

export type LinkCreatedEvent = {
  code: string;
  url: string;
};

export type LinkUpdatedEvent = {
  code: string;
  url: string;
};

export type LinkClickedEvent = {
  code: string;
  clicked_at: string;
};
