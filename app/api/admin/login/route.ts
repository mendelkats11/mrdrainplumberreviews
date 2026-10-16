import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  adminEnabled,
  checkPassword,
  createSessionToken,
  loginRateLimited,
  sameOrigin,
  sourceKey,
} from "@/lib/admin-auth";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  if (!sameOrigin(req.headers.get("origin"), req.headers.get("host"))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!adminEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Admin login isn't set up on this server." },
      { status: 503 },
    );
  }
  if (loginRateLimited(sourceKey(req.headers.get("x-forwarded-for")))) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  const rawBody = await req.text().catch(() => "");
  let password: unknown;
  try {
    password = rawBody.length <= 1024 ? JSON.parse(rawBody)?.password : undefined;
  } catch {
    password = undefined;
  }

  if (typeof password !== "string" || !checkPassword(password)) {
    await sleep(500); // slows down guessing
    return NextResponse.json({ ok: false, error: "Wrong password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
