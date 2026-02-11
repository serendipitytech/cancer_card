import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { taskMenuTemplates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserActiveCrew } from "@/lib/session";
import { createTemplateSchema } from "@/lib/validators";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const crew = await getUserActiveCrew(session.user.id);
    if (!crew) {
      return NextResponse.json({ templates: [] });
    }

    const templates = db
      .select()
      .from(taskMenuTemplates)
      .where(
        and(
          eq(taskMenuTemplates.crewId, crew.crewId),
          eq(taskMenuTemplates.isActive, true)
        )
      )
      .all();

    const categories = [...new Set(templates.map((t) => t.category))];

    return NextResponse.json({ templates, categories });
  } catch (error) {
    console.error("Get menu error:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const crew = await getUserActiveCrew(session.user.id);
    if (!crew || (crew.role !== "card_holder" && crew.role !== "admin")) {
      return NextResponse.json(
        { error: "Only Card Holder or Admin can modify the menu" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const template = db
      .insert(taskMenuTemplates)
      .values({
        crewId: crew.crewId,
        ...parsed.data,
      })
      .returning()
      .get();

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Create template error:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
