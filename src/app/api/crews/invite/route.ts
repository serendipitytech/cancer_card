import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserActiveCrew } from "@/lib/session";
import { updateInviteSchema } from "@/lib/validators";
import {
  revokeInvite,
  rotateInvite,
  updateInviteSettings,
} from "@/lib/invite";
import { db } from "@/db";
import { crews } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Manage the active crew's invite lifecycle. Card Holder or admin only.
 *
 * Body is a partial update (see `updateInviteSchema`). Precedence when several
 * are present: `rotate` (fresh code, all restrictions cleared) wins, else
 * `revoke` (turn the current code off), else the per-field settings.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, resetAt } = checkRateLimit(
      "crews:invite",
      session.user.id,
      { windowMs: 60 * 60 * 1000, maxRequests: 30 }
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      );
    }

    const crew = await getUserActiveCrew(session.user.id);
    if (!crew) {
      return NextResponse.json(
        { error: "You're not in a crew yet" },
        { status: 403 }
      );
    }

    if (crew.role !== "card_holder" && crew.role !== "admin") {
      return NextResponse.json(
        { error: "Only the Card Holder or an admin can manage invites" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateInviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { rotate, revoke, expiresAt, maxUses, boundEmail } = parsed.data;

    if (rotate) {
      rotateInvite(crew.crewId);
    } else {
      if (
        expiresAt !== undefined ||
        maxUses !== undefined ||
        boundEmail !== undefined
      ) {
        updateInviteSettings(crew.crewId, {
          ...(expiresAt !== undefined
            ? { expiresAt: expiresAt ? new Date(expiresAt) : null }
            : {}),
          ...(maxUses !== undefined ? { maxUses } : {}),
          ...(boundEmail !== undefined ? { boundEmail } : {}),
        });
      }
      if (revoke) {
        revokeInvite(crew.crewId);
      }
    }

    const updated = db
      .select({
        inviteCode: crews.inviteCode,
        inviteExpiresAt: crews.inviteExpiresAt,
        inviteMaxUses: crews.inviteMaxUses,
        inviteUseCount: crews.inviteUseCount,
        inviteRevokedAt: crews.inviteRevokedAt,
        inviteBoundEmail: crews.inviteBoundEmail,
      })
      .from(crews)
      .where(eq(crews.id, crew.crewId))
      .get();

    return NextResponse.json({ success: true, invite: updated });
  } catch (error) {
    console.error("Update invite error:", error);
    return NextResponse.json(
      { error: "Failed to update invite" },
      { status: 500 }
    );
  }
}
