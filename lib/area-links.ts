import { reviewAreas, getReviewAreaBySlug } from "@/lib/review-areas";
import { readAll, writeAll } from "@/lib/durable-store";

// Admin-edited review links live in a small JSON file layered OVER the
// defaults in lib/review-areas.ts. An area with no override simply uses
// its default. The file is written to several places (see
// lib/durable-store.ts) because a redeploy can replace the app folder and
// take a file there with it. A link that must never be lost belongs in
// lib/review-areas.ts, which is part of the code.
const DATA_NAME = "area-links.json";

// A saved link must be https and point at Google. Without this, anyone who
// got hold of the admin login could point every printed QR code at a
// phishing page.
const ALLOWED_HOST_SUFFIXES = ["google.com", "goo.gl", "g.page"];
const MAX_URL_LENGTH = 600;

export type LinkCheck = { ok: true; url: string } | { ok: false; error: string };

export function validateLinkUrl(raw: unknown): LinkCheck {
  if (typeof raw !== "string") return { ok: false, error: "Link must be text." };
  const value = raw.trim();
  if (value.length === 0) return { ok: false, error: "Link is empty." };
  if (value.length > MAX_URL_LENGTH) return { ok: false, error: "Link is too long." };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: "That doesn't look like a valid link." };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Link must start with https://" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "Link can't contain a username or password." };
  }
  const host = parsed.hostname.toLowerCase();
  const allowed = ALLOWED_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
  if (!allowed) {
    return {
      ok: false,
      error: "Link must be a Google link (google.com, maps.app.goo.gl or g.page).",
    };
  }
  return { ok: true, url: parsed.toString() };
}

type Links = Record<string, string>;

function asLinks(value: unknown): Links {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Links) : {};
}

// The saved links. Newer saves are written as { updatedAt, links }; the first
// version of the file was a plain { slug: url } object. Of all the copies the
// newest wins; old plain copies are only used when there is nothing newer.
async function readOverrides(): Promise<Links> {
  const copies = await readAll(DATA_NAME);
  let newest: { updatedAt: number; links: Links } | null = null;
  const plain: Links[] = [];
  for (const { value } of copies) {
    if (value && typeof value === "object" && "links" in value && typeof (value as { updatedAt?: unknown }).updatedAt === "number") {
      const { updatedAt, links } = value as { updatedAt: number; links: unknown };
      if (!newest || updatedAt > newest.updatedAt) newest = { updatedAt, links: asLinks(links) };
    } else if (value) {
      plain.push(asLinks(value));
    }
  }
  if (newest) return newest.links;
  return Object.assign({}, ...plain.reverse());
}

// Serialize writes so two quick saves can't interleave and lose one.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function getAreaUrl(slug: string): Promise<string | undefined> {
  const area = getReviewAreaBySlug(slug);
  if (!area) return undefined;
  const override = (await readOverrides())[slug];
  // Re-validate on read, so a hand-edited or corrupted file can never
  // make a page link somewhere that isn't allowed.
  if (override && validateLinkUrl(override).ok) return override;
  return area.googleReviewUrl;
}

export interface AreaLinkRow {
  slug: string;
  name: string;
  business: string;
  url: string;
  defaultUrl: string;
  overridden: boolean;
}

export async function getAllAreaLinks(): Promise<AreaLinkRow[]> {
  const overrides = await readOverrides();
  return reviewAreas.map((a) => {
    const override = overrides[a.slug];
    const usable = override && validateLinkUrl(override).ok ? override : undefined;
    return {
      slug: a.slug,
      name: a.name,
      business: a.business,
      url: usable ?? a.googleReviewUrl,
      defaultUrl: a.googleReviewUrl,
      overridden: Boolean(usable),
    };
  });
}

// url === null resets the area back to its default link.
export function setAreaUrl(slug: string, url: string | null): Promise<void> {
  return enqueue(async () => {
    const overrides = await readOverrides();
    if (url === null) delete overrides[slug];
    else overrides[slug] = url;
    await writeAll(DATA_NAME, { updatedAt: Date.now(), links: overrides });
  });
}
