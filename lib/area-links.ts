import { promises as fs } from "fs";
import path from "path";
import { reviewAreas, getReviewAreaBySlug } from "@/lib/review-areas";

// Admin-edited review links live in a small JSON file layered OVER the
// defaults in lib/review-areas.ts. An area with no override simply uses
// its default, so if the file is ever lost (e.g. a redeploy replaces the
// app directory) every page keeps working with the last links committed
// to the code — you'd only need to re-enter any edits made since.
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "area-links.json");

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

async function readOverrides(): Promise<Record<string, string>> {
  try {
    const parsed = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
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
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(overrides, null, 2));
    await fs.rename(tmp, DATA_FILE);
  });
}
