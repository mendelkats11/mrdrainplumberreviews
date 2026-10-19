"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_CLAIM_ATTEMPTS = 5;
const REMEMBER_SEEN = 6;

interface Offered {
  id: string;
  text: string;
}

// Shows one approved review at a time. Regenerate asks for another and
// costs nothing; only Copy uses a review up (the server takes it out of the
// pool at that moment).
export default function CuratedReview({
  areaSlug,
  googleReviewUrl,
  testMode = false,
}: {
  areaSlug: string;
  googleReviewUrl: string;
  testMode?: boolean;
}) {
  const [review, setReview] = useState<Offered | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [clipboardFailed, setClipboardFailed] = useState(false);
  const [error, setError] = useState(false);
  const seen = useRef<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Throws on a network or server failure; returns null when the pool is empty.
  const fetchNext = useCallback(async (): Promise<Offered | null> => {
    const params = new URLSearchParams({ area: areaSlug, avoid: seen.current.join(",") });
    const res = await fetch(`/api/curated/next?${params}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`next failed: ${res.status}`);
    const data = await res.json();
    const next: Offered | null = data.review ?? null;
    if (next) seen.current = [...seen.current, next.id].slice(-REMEMBER_SEEN);
    return next;
  }, [areaSlug]);

  const show = useCallback(
    async () => {
      setLoading(true);
      setError(false);
      try {
        const next = await fetchNext();
        setReview(next);
        setEmpty(next === null);
        setCopied(false);
        setClipboardFailed(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [fetchNext],
  );

  // First review on load. `loading` already starts true, so nothing needs
  // setting synchronously here.
  useEffect(() => {
    let cancelled = false;
    fetchNext()
      .then((next) => {
        if (cancelled) return;
        setReview(next);
        setEmpty(next === null);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchNext]);

  async function claim(id: string): Promise<boolean> {
    const res = await fetch("/api/curated/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area: areaSlug, id, test: testMode }),
    });
    if (!res.ok) throw new Error(`claim failed: ${res.status}`);
    return Boolean((await res.json()).ok);
  }

  async function copy() {
    if (!review || claiming) return;
    // Already copied: the review is used up, so just put the same text back
    // on the clipboard instead of taking another one.
    if (copied) {
      try {
        await navigator.clipboard.writeText(review.text);
      } catch {
        textareaRef.current?.select();
        setClipboardFailed(true);
      }
      return;
    }
    setClaiming(true);
    setError(false);
    setClipboardFailed(false);
    try {
      let attempt: Offered | null = review;
      for (let i = 0; i < MAX_CLAIM_ATTEMPTS && attempt; i++) {
        if (await claim(attempt.id)) {
          setReview(attempt);
          try {
            await navigator.clipboard.writeText(attempt.text);
          } catch {
            // The claim already went through; clipboard access just is not
            // available, so select the text for a manual copy.
            textareaRef.current?.select();
            setClipboardFailed(true);
          }
          setCopied(true);
          return;
        }
        // Someone else copied it first. Show another and try that one, so
        // the text on screen is always the text that gets copied.
        attempt = await fetchNext();
        setReview(attempt);
      }
      setEmpty(attempt === null);
      if (attempt) setError(true);
    } catch {
      setError(true);
    } finally {
      setClaiming(false);
    }
  }

  const busy = loading || claiming;

  return (
    <div className="w-full max-w-xl">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <textarea
          ref={textareaRef}
          readOnly
          value={
            empty
              ? "We've run out of ready-made reviews for now."
              : (review?.text ?? "Loading a suggested review…")
          }
          rows={6}
          className="w-full resize-none bg-transparent text-text leading-relaxed outline-none"
        />
      </div>

      {!empty && (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => void show()}
            disabled={busy || !review}
            className="flex-1 cursor-pointer rounded-full border border-border bg-surface px-5 py-3 font-medium text-text transition hover:border-teal-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={copy}
            disabled={busy || !review}
            className="flex-1 cursor-pointer rounded-full bg-brass px-5 py-3 font-medium text-bg transition hover:bg-brass-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            {claiming ? "Checking…" : copied ? "Copied!" : "Copy review"}
          </button>
        </div>
      )}

      {empty && (
        <p className="mt-4 text-sm text-text-muted">
          Feel free to write your own review in your own words. It means just as much.
        </p>
      )}

      {error && (
        <p className="mt-4 text-sm text-text-muted">
          Couldn&apos;t reach the server just now. Check your connection and try again.
        </p>
      )}

      {clipboardFailed && (
        <p className="mt-4 text-sm text-text-muted">
          Couldn&apos;t copy automatically. The text above is selected, so use your keyboard or
          menu to copy it manually.
        </p>
      )}

      {(copied || empty) &&
        (googleReviewUrl ? (
          <a
            href={googleReviewUrl}
            className="mt-4 flex cursor-pointer items-center justify-center rounded-full bg-teal px-5 py-3 text-center font-medium text-text transition hover:bg-teal-bright"
          >
            {copied ? "Leave your review on Google →" : "Open our Google page →"}
          </a>
        ) : (
          <p className="mt-4 text-sm text-text-muted">
            {copied
              ? "Your review is copied. Open our Google page and paste it in."
              : "Open our Google page to leave your review."}
          </p>
        ))}
    </div>
  );
}
