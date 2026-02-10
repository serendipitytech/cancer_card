import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { crews, crewMembers } from "@/db/schema";
import { joinCrewSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/points";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = joinCrewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const existingMembership = db
      .select({ id: crewMembers.id })
      .from(crewMembers)
      .where(eq(crewMembers.userId, session.user.id))
      .get();

    if (existingMembership) {
      return NextResponse.json(
        { error: "You're already in a crew. One crew at a time for now!" },
        { status: 409 }
      );
    }

    const crew = db
      .select()
      .from(crews)
      .where(eq(crews.inviteCode, parsed.data.inviteCode.toUpperCase()))
      .get();

    if (!crew) {
      return NextResponse.json(
        { error: "Invalid invite code. Double-check and try again!" },
        { status: 404 }
      );
    }

    db.insert(crewMembers)
      .values({
        crewId: crew.id,
        userId: session.user.id,
        role: "crew_member",
      })
      .run();

    logActivity(crew.id, "member_joined", session.user.id, {
      crewName: crew.name,
    });

    return NextResponse.json(
      { crew, message: `Welcome to ${crew.name}!` },
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
