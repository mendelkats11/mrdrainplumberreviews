"use client";

import { useEffect, useRef, useState } from "react";
import { randomCandidate, type ReviewCandidate } from "@/lib/review-generator";

const MAX_CLAIM_ATTEMPTS = 25;

export default function ReviewGenerator({
  areaSlug,
  areaName,
  googleReviewUrl,
}: {
  areaSlug: string;
  areaName: string;
  googleReviewUrl: string;
}) {
  const [candidate, setCandidate] = useState<ReviewCandidate | null>(null);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [clipboardFailed, setClipboardFailed] = useState(false);
  const [claimError, setClaimError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCandidate(randomCandidate(areaName));
  }, [areaName]);

  function regenerate() {
    setCandidate((current) => {
      let next = randomCandidate(areaName);
      let attempts = 0;
      while (current && next.id === current.id && attempts < 10) {
        next = randomCandidate(areaName);
        attempts++;
      }
      return next;
    });
    setCopied(false);
    setExhausted(false);
    setClipboardFailed(false);
    setClaimError(false);
  }

  async function claim(candidate: ReviewCandidate): Promise<boolean> {
    const res = await fetch("/api/claim-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        area: areaSlug,
        id: candidate.id,
        text: candidate.text,
        contentKey: candidate.contentKey,
      }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.ok);
  }

  async function copy() {
    if (!candidate || claiming) return;
    setClaiming(true);
    setExhausted(false);
    setClipboardFailed(false);
    setClaimError(false);

    try {
      const tried = new Set<number>();
      let attempt = candidate;

      for (let i = 0; i < MAX_CLAIM_ATTEMPTS; i++) {
        tried.add(attempt.id);
        const ok = await claim(attempt);
        if (ok) {
          setCandidate(attempt);
          try {
            await navigator.clipboard.writeText(attempt.text);
          } catch {
            // Claim already succeeded (the part that guarantees no
            // duplicates) — clipboard access just isn't available, so
            // fall back to selecting the text for a manual copy.
            textareaRef.current?.select();
            setClipboardFailed(true);
          }
          setCopied(true);
          return;
        }

        let next = randomCandidate(areaName);
        let guard = 0;
        while (tried.has(next.id) && guard < 20) {
          next = randomCandidate(areaName);
          guard++;
        }
        attempt = next;
        setCandidate(attempt);
      }

      setExhausted(true);
    } catch {
      setClaimError(true);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="w-full max-w-xl">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <textarea
          ref={textareaRef}
          readOnly
          value={candidate?.text ?? "Loading a suggested review…"}
          rows={6}
          className="w-full resize-none bg-transparent text-text leading-relaxed outline-none"
        />
      </div>

      {candidate && (
        <p className="mt-2 text-right text-xs text-text-muted">Ref #{candidate.id}</p>
      )}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={regenerate}
          disabled={!candidate || claiming}
          className="flex-1 cursor-pointer rounded-full border border-border bg-surface px-5 py-3 font-medium text-text transition hover:border-teal-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          Regenerate
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={!candidate || claiming}
          className="flex-1 cursor-pointer rounded-full bg-brass px-5 py-3 font-medium text-bg transition hover:bg-brass-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          {claiming ? "Checking…" : copied ? "Copied!" : "Copy review"}
        </button>
      </div>

      {exhausted && (
        <p className="mt-4 text-sm text-text-muted">
          We're out of fresh variations for this area right now — feel free to write your own
          instead, or let us know so we can add more.
        </p>
      )}

      {claimError && (
        <p className="mt-4 text-sm text-text-muted">
          Couldn't reach the server just now — check your connection and try again.
        </p>
      )}

      {clipboardFailed && (
        <p className="mt-4 text-sm text-text-muted">
          Couldn't copy automatically — the text above is selected, so use your keyboard or
          menu to copy it manually.
        </p>
      )}

      {copied && (
        <a
          href={googleReviewUrl}
          className="mt-4 flex cursor-pointer items-center justify-center rounded-full bg-teal px-5 py-3 text-center font-medium text-text transition hover:bg-teal-bright"
        >
          Leave your review on Google →
        </a>
      )}
    </div>
  );
}
