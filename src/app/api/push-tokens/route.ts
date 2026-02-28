import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { registerPushToken } from "@/lib/notification-queries";
import { registerPushTokenSchema } from "@/lib/notification-validators";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, resetAt } = checkRateLimit(
      "push:register",
      session.user.id,
      RATE_LIMITS.write
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const body = await request.json();
    const parsed = registerPushTokenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const token = registerPushToken(
      session.user.id,
      parsed.data.endpoint,
      parsed.data.p256dh,
      parsed.data.authKey,
      parsed.data.userAgent
    );

    return NextResponse.json({ token }, { status: 201 });
  } catch (error) {
    console.error("Register push token error:", error);
    return NextResponse.json(
      { error: "Failed to register push token" },
      { status: 500 }
    );
  }
}
