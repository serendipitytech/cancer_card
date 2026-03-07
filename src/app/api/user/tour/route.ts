import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";

export async function PATCH() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, resetAt } = checkRateLimit("tour", session.user.id, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      );
    }

    db.update(users)
      .set({ hasSeenTour: true })
      .where(eq(users.id, session.user.id))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tour completion error:", error);
    return NextResponse.json(
      { error: "Failed to update tour status" },
      { status: 500 }
    );
  }
}
