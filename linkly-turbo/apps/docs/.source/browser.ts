// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"browser.mdx": () => import("../content/docs/browser.mdx?collection=docs"), "channels.mdx": () => import("../content/docs/channels.mdx?collection=docs"), "durability.mdx": () => import("../content/docs/durability.mdx?collection=docs"), "foundations.mdx": () => import("../content/docs/foundations.mdx?collection=docs"), "index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "nextjs.mdx": () => import("../content/docs/nextjs.mdx?collection=docs"), "observability.mdx": () => import("../content/docs/observability.mdx?collection=docs"), "persistence.mdx": () => import("../content/docs/persistence.mdx?collection=docs"), "streaming.mdx": () => import("../content/docs/streaming.mdx?collection=docs"), }),
};
export default browserCollections;