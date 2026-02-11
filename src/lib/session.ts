import { auth } from "@/lib/auth";
import { db } from "@/db";
import { crewMembers, crews } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getActiveCrewCookie } from "@/lib/cookies";

type CrewMembership = {
  crewId: string;
  role: string;
  crewName: string;
  pointBalance: number;
  inviteCode: string;
  cardHolderId: string;
};

export async function getSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export function getUserCrews(userId: string): CrewMembership[] {
  return db
    .select({
      crewId: crewMembers.crewId,
      role: crewMembers.role,
      crewName: crews.name,
      pointBalance: crews.pointBalance,
      inviteCode: crews.inviteCode,
      cardHolderId: crews.cardHolderId,
    })
    .from(crewMembers)
    .innerJoin(crews, eq(crewMembers.crewId, crews.id))
    .where(eq(crewMembers.userId, userId))
    .all();
}

export async function resolveActiveCrew(
  allCrews: CrewMembership[]
): Promise<CrewMembership | null> {
  if (allCrews.length === 0) return null;

  const cookieCrewId = await getActiveCrewCookie();
  if (cookieCrewId) {
    const match = allCrews.find((c) => c.crewId === cookieCrewId);
    if (match) return match;
  }

  return allCrews[0];
}

export async function getUserActiveCrew(
  userId: string
): Promise<CrewMembership | null> {
  return resolveActiveCrew(getUserCrews(userId));
}

export function isCardHolder(userId: string, crewId: string): boolean {
  const member = db
    .select({ role: crewMembers.role })
    .from(crewMembers)
    .where(
      and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, userId))
    )
    .get();

  return member?.role === "card_holder";
}
