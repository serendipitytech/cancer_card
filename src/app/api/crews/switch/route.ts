import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { crewMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { setActiveCrewCookie } from "@/lib/cookies";

const switchCrewSchema = z.object({
  crewId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = switchCrewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const membership = db
      .select({ id: crewMembers.id })
      .from(crewMembers)
      .where(
        and(
          eq(crewMembers.crewId, parsed.data.crewId),
          eq(crewMembers.userId, session.user.id)
        )
      )
      .get();

    if (!membership) {
      return NextResponse.json(
        { error: "You're not a member of this crew" },
        { status: 403 }
      );
    }

    await setActiveCrewCookie(parsed.data.crewId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Switch crew error:", error);
    return NextResponse.json(
      { error: "Failed to switch crew" },
      { status: 500 }
    );
  }
}
