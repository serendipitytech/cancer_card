import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserCrew } from "@/lib/session";
import { sendInviteEmailSchema } from "@/lib/validators";
import { sendInviteEmail } from "@/lib/email";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, emailCount: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(userId, {
      count: emailCount,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (entry.count + emailCount > RATE_LIMIT_MAX) {
    return false;
  }

  rateLimitStore.set(userId, {
    ...entry,
    count: entry.count + emailCount,
  });
  return true;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const crew = await getUserCrew(session.user.id);
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

    if (!checkRateLimit(session.user.id, emails.length)) {
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
