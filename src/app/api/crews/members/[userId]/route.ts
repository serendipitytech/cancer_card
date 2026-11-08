import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserActiveCrew } from "@/lib/session";
import { uuidParamSchema } from "@/lib/validators";
import { removeMember, type RemoveMemberReason } from "@/lib/crew-members";
import { checkRateLimit } from "@/lib/rate-limit";

// Maps a removal rejection to an HTTP status + user-facing message.
const REJECTIONS: Record<
  RemoveMemberReason,
  { status: number; error: string }
> = {
  not_a_member: {
    status: 403,
    error: "You're not a member of this crew",
  },
  target_not_member: {
    status: 404,
    error: "That person isn't a member of this crew",
  },
  forbidden: {
    status: 403,
    error: "Only the Card Holder or an admin can remove members",
  },
  cannot_remove_card_holder: {
    status: 400,
    error: "The Card Holder anchors the crew and can't be removed",
  },
};

/**
 * Remove a member from the active crew, or leave it yourself.
 *
 * `userId` in the path is the member being removed. When it equals the caller
 * it is a self-leave; otherwise it is an authorized removal (Card Holder or
 * admin). Either way the `crew_members` row is deleted and access ends at once.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, resetAt } = checkRateLimit(
      "crews:member-remove",
      session.user.id,
      { windowMs: 60 * 60 * 1000, maxRequests: 30 }
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      );
    }

    const { userId: targetUserId } = await params;
    const parsedId = uuidParamSchema.safeParse(targetUserId);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });
    }

    const crew = await getUserActiveCrew(session.user.id);
    if (!crew) {
      return NextResponse.json(
        { error: "You're not in a crew yet" },
        { status: 403 }
      );
    }

    const result = removeMember(crew.crewId, session.user.id, targetUserId);
    if (!result.ok) {
      const { status, error } = REJECTIONS[result.reason];
      return NextResponse.json({ error }, { status });
    }

    return NextResponse.json({
      success: true,
      left: result.selfLeave,
    });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
