import { auth } from "@/lib/auth";
import { db } from "@/db";
import { crewMembers, crews } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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

export function getUserCrew(userId: string) {
  const membership = db
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
    .get();

  return membership || null;
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
