import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserActiveCrew } from "@/lib/session";
import { sendInviteEmailSchema } from "@/lib/validators";
import { sendInviteEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        { error: "Only the Card Holder or an admin can send invites" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = sendInviteEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { emails } = parsed.data;

    const { allowed } = checkRateLimit("invite-email", session.user.id, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
    }, emails.length);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many invites sent. Try again later." },
        { status: 429 }
      );
    }

    const senderName = session.user.name || "Someone";
    const results = await Promise.all(
      emails.map((recipientEmail) =>
        sendInviteEmail(
          recipientEmail,
          senderName,
          crew.crewName,
          crew.inviteCode
        )
      )
    );

    const failed = results.filter((r) => !r.success);

    if (failed.length === results.length) {
      const firstError = failed[0] as { success: false; error: string };
      return NextResponse.json({ error: firstError.error }, { status: 500 });
    }

    const sent = results.length - failed.length;
    return NextResponse.json({ success: true, sent, total: results.length });
  } catch (error) {
    console.error("Invite email error:", error);
    return NextResponse.json(
      { error: "Failed to send invite email" },
      { status: 500 }
    );
  }
}
