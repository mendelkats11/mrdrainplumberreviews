"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AreaLinkRow } from "@/lib/area-links";

type Status = { kind: "ok" | "error"; text: string } | null;

function Row({ row }: { row: AreaLinkRow }) {
  const [url, setUrl] = useState(row.url);
  const [saved, setSaved] = useState(row.url);
  const [overridden, setOverridden] = useState(row.overridden);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function send(nextUrl: string) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: row.slug, url: nextUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setStatus({ kind: "error", text: data.error ?? "Couldn't save." });
        return;
      }
      if (data.reset) {
        setUrl(row.defaultUrl);
        setSaved(row.defaultUrl);
        setOverridden(false);
        setStatus({ kind: "ok", text: "Reset to the original link." });
      } else {
        setUrl(data.url);
        setSaved(data.url);
        setOverridden(true);
        setStatus({ kind: "ok", text: "Saved." });
      }
    } catch {
      setStatus({ kind: "error", text: "Couldn't reach the server." });
    } finally {
      setBusy(false);
    }
  }

  const changed = url.trim() !== saved;

  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold text-text">{row.name}</h2>
        <span className="shrink-0 text-xs text-text-muted">
          {overridden ? "Custom link" : row.defaultUrl ? "Original link" : "No link yet"}
        </span>
      </div>
      <label htmlFor={`url-${row.slug}`} className="sr-only">
        Google review link for {row.name}
      </label>
      <input
        id={`url-${row.slug}`}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste the Google review link"
        spellCheck={false}
        className="mt-3 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-brass"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => send(url)}
          disabled={busy || !changed}
          className="cursor-pointer rounded-full bg-brass px-4 py-1.5 text-sm font-medium text-bg transition hover:bg-brass-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {overridden && (
          <button
            type="button"
            onClick={() => send("")}
            disabled={busy}
            className="cursor-pointer text-sm text-text-muted underline hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset to original
          </button>
        )}
        {saved && (
          <a
            href={saved}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer text-sm text-teal-bright hover:underline"
          >
            Test link
          </a>
        )}
        <a href={`/${row.slug}`} className="cursor-pointer text-sm text-text-muted hover:text-text">
          View page
        </a>
      </div>
      {status && (
        <p role="status" className={`mt-2 text-sm ${status.kind === "ok" ? "text-success" : "text-red-400"}`}>
          {status.text}
        </p>
      )}
    </li>
  );
}

// "RenoMake ... of Oakville" -> "Oakville"; plumbing areas are already short.
function shortName(row: AreaLinkRow): string {
  const prefix = `${row.business} of `;
  return row.name.startsWith(prefix) ? row.name.slice(prefix.length) : row.name;
}

export default function AdminLinks({
  rows,
  left = {},
}: {
  rows: AreaLinkRow[];
  // Approved reviews still available per page (renovation pages only).
  left?: Record<string, number>;
}) {
  const router = useRouter();

  const groups = rows.reduce<{ business: string; rows: AreaLinkRow[] }[]>((acc, row) => {
    const group = acc.find((g) => g.business === row.business);
    if (group) group.rows.push(row);
    else acc.push({ business: row.business, rows: [row] });
    return acc;
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    router.refresh();
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          Set where each page&apos;s &ldquo;Leave your review on Google&rdquo; button goes. Changes apply
          right away.
        </p>
        <button
          type="button"
          onClick={logout}
          className="shrink-0 cursor-pointer rounded-full border border-border px-4 py-1.5 text-sm text-text transition hover:border-teal-bright"
        >
          Log out
        </button>
      </div>
      <section className="mt-5 rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-semibold text-text">All review pages</h2>
        <p className="mt-1 text-sm text-text-muted">
          Opens each page in test mode: Copy and &ldquo;Leave your review on Google&rdquo; work
          normally, but nothing is recorded, so testing won&apos;t use up any reviews.
        </p>
        {groups.map((group) => (
          <div key={group.business} className="mt-4">
            <h3 className="text-sm font-medium text-text-muted">{group.business}</h3>
            <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {group.rows.map((row) => (
                <li key={row.slug}>
                  <a
                    href={`/${row.slug}?test=1`}
                    className="block cursor-pointer rounded-lg border border-border px-3 py-2 text-center text-sm text-text transition hover:border-teal-bright"
                  >
                    {shortName(row)}
                    {row.slug in left && (
                      <span className="block text-xs text-text-muted">{left[row.slug]} reviews left</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <h2 className="mt-8 text-lg font-semibold text-text">Edit links</h2>
      {groups.map((group) => (
        <div key={group.business} className="mt-4">
          <h3 className="text-sm font-medium text-text-muted">{group.business}</h3>
          <ul className="mt-2 flex flex-col gap-3">
            {group.rows.map((row) => (
              <Row key={row.slug} row={row} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
