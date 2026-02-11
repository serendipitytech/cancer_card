import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    db.update(users)
      .set({ hasSeenTour: true })
      .where(eq(users.id, session.user.id))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tour completion error:", error);
    return NextResponse.json(
      { error: "Failed to update tour status" },
      { status: 500 }
    );
  }
}
