import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_PATH || "./data/app.db";

const dir = dirname(DB_PATH);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

const DEFAULT_SELF_CARE_ROUTINES = [
  { name: "Completed chemo session", milestoneType: "chemo", pointValue: 100, emoji: "💪" },
  { name: "Took all medications today", milestoneType: "meds", pointValue: 25, emoji: "💊" },
  { name: "Good sleep (self-reported)", milestoneType: "sleep", pointValue: 20, emoji: "😴" },
  { name: "Went for a walk / light exercise", milestoneType: "exercise", pointValue: 15, emoji: "🚶" },
  { name: "Ate a full meal", milestoneType: "meal", pointValue: 15, emoji: "🍽️" },
  { name: "Drank enough water", milestoneType: "water", pointValue: 10, emoji: "💧" },
  { name: "Attended doctor appointment", milestoneType: "appointment", pointValue: 50, emoji: "🏥" },
  { name: "Did something fun / laughed", milestoneType: "joy", pointValue: 30, emoji: "😄" },
] as const;

const DEFAULT_TASK_TEMPLATES = [
  // Food & Drinks
  { title: "Bring a meal", category: "Food & Drinks", defaultPoints: 30, emoji: "🍕" },
  { title: "Grocery run", category: "Food & Drinks", defaultPoints: 40, emoji: "🛒" },
  { title: "Milkshake delivery", category: "Food & Drinks", defaultPoints: 15, emoji: "🥤" },
  { title: "Cook at my house", category: "Food & Drinks", defaultPoints: 50, emoji: "👨‍🍳" },
  // Transportation
  { title: "Drive to chemo", category: "Transportation", defaultPoints: 60, emoji: "🚗" },
  { title: "Pick up prescriptions", category: "Transportation", defaultPoints: 35, emoji: "💊" },
  { title: "Airport run", category: "Transportation", defaultPoints: 80, emoji: "✈️" },
  { title: "Drive to appointment", category: "Transportation", defaultPoints: 50, emoji: "🏥" },
  // Household
  { title: "Laundry", category: "Household", defaultPoints: 30, emoji: "👕" },
  { title: "Dishes", category: "Household", defaultPoints: 20, emoji: "🍽️" },
  { title: "Vacuuming", category: "Household", defaultPoints: 25, emoji: "🧹" },
  { title: "Yard work", category: "Household", defaultPoints: 40, emoji: "🌿" },
  { title: "Take out trash", category: "Household", defaultPoints: 15, emoji: "🗑️" },
  // Errands
  { title: "Post office run", category: "Errands", defaultPoints: 20, emoji: "📦" },
  { title: "Pharmacy pickup", category: "Errands", defaultPoints: 25, emoji: "💊" },
  { title: "Returns / exchanges", category: "Errands", defaultPoints: 30, emoji: "🔄" },
  { title: "Pet supplies", category: "Errands", defaultPoints: 25, emoji: "🐾" },
  // Company & Comfort
  { title: "Watch a movie together", category: "Company & Comfort", defaultPoints: 15, emoji: "🎬" },
  { title: "Sit with me during treatment", category: "Company & Comfort", defaultPoints: 25, emoji: "🤗" },
  { title: "Phone call / video chat", category: "Company & Comfort", defaultPoints: 10, emoji: "📞" },
  { title: "Bring flowers", category: "Company & Comfort", defaultPoints: 15, emoji: "💐" },
  // Pet Care
  { title: "Walk the dog", category: "Pet Care", defaultPoints: 20, emoji: "🐶" },
  { title: "Feed pets", category: "Pet Care", defaultPoints: 15, emoji: "🐱" },
  { title: "Vet appointment", category: "Pet Care", defaultPoints: 50, emoji: "🐾" },
  // Kid Care
  { title: "School pickup", category: "Kid Care", defaultPoints: 40, emoji: "🏫" },
  { title: "Homework help", category: "Kid Care", defaultPoints: 35, emoji: "📚" },
  { title: "Babysitting", category: "Kid Care", defaultPoints: 60, emoji: "👶" },
  { title: "Take to practice", category: "Kid Care", defaultPoints: 45, emoji: "⚽" },
  // Wildcard
  { title: "Custom request", category: "Wildcard", defaultPoints: 25, emoji: "🎲" },
  { title: "Surprise me", category: "Wildcard", defaultPoints: 20, emoji: "🎁" },
  { title: "Dealer's choice", category: "Wildcard", defaultPoints: 30, emoji: "✨" },
] as const;

export function seedCrewDefaults(crewId: string) {
  for (const template of DEFAULT_TASK_TEMPLATES) {
    db.insert(schema.taskMenuTemplates).values({
      crewId,
      ...template,
    }).run();
  }

  for (const routine of DEFAULT_SELF_CARE_ROUTINES) {
    db.insert(schema.selfCareRoutines).values({
      crewId,
      ...routine,
    }).run();
  }
}

export { DEFAULT_TASK_TEMPLATES, DEFAULT_SELF_CARE_ROUTINES };

if (require.main === module) {
  console.log("Seed script ready. Defaults will be applied when a crew is created.");
  console.log(`Task templates: ${DEFAULT_TASK_TEMPLATES.length}`);
  console.log(`Self-care routines: ${DEFAULT_SELF_CARE_ROUTINES.length}`);
  sqlite.close();
}
