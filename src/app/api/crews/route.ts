import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { crews, crewMembers } from "@/db/schema";
import { createCrewSchema } from "@/lib/validators";
import { generateInviteCode } from "@/lib/utils";
import { seedCrewDefaults } from "@/db/seed";
import { eq } from "drizzle-orm";
import { setActiveCrewCookie, getActiveCrewCookie } from "@/lib/cookies";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createCrewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const inviteCode = generateInviteCode();

    const crew = db
      .insert(crews)
      .values({
        name: parsed.data.name,
        cardHolderId: session.user.id,
        pointBalance: parsed.data.initialPoints,
        inviteCode,
      })
      .returning()
      .get();

    db.insert(crewMembers)
      .values({
        crewId: crew.id,
        userId: session.user.id,
        role: "card_holder",
      })
      .run();

    seedCrewDefaults(crew.id);

    await setActiveCrewCookie(crew.id);

    return NextResponse.json(crew, { status: 201 });
  } catch (error) {
    console.error("Create crew error:", error);
    return NextResponse.json(
      { error: "Failed to create crew" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = db
      .select({
        crewId: crewMembers.crewId,
        role: crewMembers.role,
        crew: crews,
      })
      .from(crewMembers)
      .innerJoin(crews, eq(crewMembers.crewId, crews.id))
      .where(eq(crewMembers.userId, session.user.id))
      .all();

    if (memberships.length === 0) {
      return NextResponse.json({ crews: [], activeCrewId: null });
    }

    const cookieCrewId = await getActiveCrewCookie();
    const validCookieMatch = memberships.find(
      (m) => m.crewId === cookieCrewId
    );
    const activeCrewId = validCookieMatch
      ? validCookieMatch.crewId
      : memberships[0].crewId;

    return NextResponse.json({
      crews: memberships.map((m) => ({
        ...m.crew,
        role: m.role,
      })),
      activeCrewId,
    });
  } catch (error) {
    console.error("Get crew error:", error);
    return NextResponse.json(
      { error: "Failed to fetch crews" },
      { status: 500 }
    );
  }
}
