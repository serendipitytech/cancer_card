import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { joinCrewSchema } from "@/lib/validators";
import { redeemInvite, type InviteRejection } from "@/lib/invite";
import { logActivity } from "@/lib/points";
import { notifyOnEvent } from "@/lib/notification-service";
import { setActiveCrewCookie } from "@/lib/cookies";
import { checkRateLimit } from "@/lib/rate-limit";

// Maps a redemption rejection to an HTTP status + user-facing message. Kept out
// of the lib so the lib stays transport-agnostic and testable.
const REJECTIONS: Record<
  InviteRejection,
  { status: number; error: string }
> = {
  not_found: {
    status: 404,
    error: "Invalid invite code. Double-check and try again!",
  },
  revoked: {
    status: 410,
    error: "This invite has been turned off. Ask for a new one.",
  },
  expired: {
    status: 410,
    error: "This invite has expired. Ask for a new one.",
  },
  exhausted: {
    status: 410,
    error: "This invite has reached its limit. Ask for a new one.",
  },
  email_mismatch: {
    status: 403,
    error: "This invite is for a different email address.",
  },
  already_member: {
    status: 409,
    error: "You're already a member of this crew!",
  },
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, resetAt } = checkRateLimit("crews:join", session.user.id, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many join attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const parsed = joinCrewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = redeemInvite({
      code: parsed.data.inviteCode,
      userId: session.user.id,
      userEmail: session.user.email,
    });

    if (!result.ok) {
      const { status, error } = REJECTIONS[result.reason];
      return NextResponse.json({ error }, { status });
    }

    const { crew } = result;

    logActivity(crew.id, "member_joined", session.user.id, {
      crewName: crew.name,
    });

    notifyOnEvent(crew.id, "member_joined", session.user.id, {
      crewName: crew.name,
      actorName: session.user.name || "Someone",
    });

    await setActiveCrewCookie(crew.id);

    return NextResponse.json(
      {
        crew: { id: crew.id, name: crew.name, pointBalance: crew.pointBalance },
        message: `Welcome to ${crew.name}!`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Join crew error:", error);
    return NextResponse.json(
      { error: "Failed to join crew" },
      { status: 500 }
    );
  }
}
