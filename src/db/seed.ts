import { db } from "@/db";
import * as schema from "./schema";

const DEFAULT_SELF_CARE_ROUTINES = [
  { name: "Completed chemo session", milestoneType: "chemo", pointValue: 100, emoji: "\u{1F4AA}" },
  { name: "Took all medications today", milestoneType: "meds", pointValue: 25, emoji: "\u{1F48A}" },
  { name: "Good sleep (self-reported)", milestoneType: "sleep", pointValue: 20, emoji: "\u{1F634}" },
  { name: "Went for a walk / light exercise", milestoneType: "exercise", pointValue: 15, emoji: "\u{1F6B6}" },
  { name: "Ate a full meal", milestoneType: "meal", pointValue: 15, emoji: "\u{1F37D}\u{FE0F}" },
  { name: "Drank enough water", milestoneType: "water", pointValue: 10, emoji: "\u{1F4A7}" },
  { name: "Attended doctor appointment", milestoneType: "appointment", pointValue: 50, emoji: "\u{1F3E5}" },
  { name: "Did something fun / laughed", milestoneType: "joy", pointValue: 30, emoji: "\u{1F604}" },
] as const;

const DEFAULT_TASK_TEMPLATES = [
  // Food & Drinks
  { title: "Bring a meal", category: "Food & Drinks", defaultPoints: 30, emoji: "\u{1F355}" },
  { title: "Grocery run", category: "Food & Drinks", defaultPoints: 40, emoji: "\u{1F6D2}" },
  { title: "Milkshake delivery", category: "Food & Drinks", defaultPoints: 15, emoji: "\u{1F964}" },
  { title: "Cook at my house", category: "Food & Drinks", defaultPoints: 50, emoji: "\u{1F468}\u{200D}\u{1F373}" },
  // Transportation
  { title: "Drive to chemo", category: "Transportation", defaultPoints: 60, emoji: "\u{1F697}" },
  { title: "Pick up prescriptions", category: "Transportation", defaultPoints: 35, emoji: "\u{1F48A}" },
  { title: "Airport run", category: "Transportation", defaultPoints: 80, emoji: "\u{2708}\u{FE0F}" },
  { title: "Drive to appointment", category: "Transportation", defaultPoints: 50, emoji: "\u{1F3E5}" },
  // Household
  { title: "Laundry", category: "Household", defaultPoints: 30, emoji: "\u{1F455}" },
  { title: "Dishes", category: "Household", defaultPoints: 20, emoji: "\u{1F37D}\u{FE0F}" },
  { title: "Vacuuming", category: "Household", defaultPoints: 25, emoji: "\u{1F9F9}" },
  { title: "Yard work", category: "Household", defaultPoints: 40, emoji: "\u{1F33F}" },
  { title: "Take out trash", category: "Household", defaultPoints: 15, emoji: "\u{1F5D1}\u{FE0F}" },
  // Errands
  { title: "Post office run", category: "Errands", defaultPoints: 20, emoji: "\u{1F4E6}" },
  { title: "Pharmacy pickup", category: "Errands", defaultPoints: 25, emoji: "\u{1F48A}" },
  { title: "Returns / exchanges", category: "Errands", defaultPoints: 30, emoji: "\u{1F504}" },
  { title: "Pet supplies", category: "Errands", defaultPoints: 25, emoji: "\u{1F43E}" },
  // Company & Comfort
  { title: "Watch a movie together", category: "Company & Comfort", defaultPoints: 15, emoji: "\u{1F3AC}" },
  { title: "Sit with me during treatment", category: "Company & Comfort", defaultPoints: 25, emoji: "\u{1F917}" },
  { title: "Phone call / video chat", category: "Company & Comfort", defaultPoints: 10, emoji: "\u{1F4DE}" },
  { title: "Bring flowers", category: "Company & Comfort", defaultPoints: 15, emoji: "\u{1F490}" },
  // Pet Care
  { title: "Walk the dog", category: "Pet Care", defaultPoints: 20, emoji: "\u{1F436}" },
  { title: "Feed pets", category: "Pet Care", defaultPoints: 15, emoji: "\u{1F431}" },
  { title: "Vet appointment", category: "Pet Care", defaultPoints: 50, emoji: "\u{1F43E}" },
  // Kid Care
  { title: "School pickup", category: "Kid Care", defaultPoints: 40, emoji: "\u{1F3EB}" },
  { title: "Homework help", category: "Kid Care", defaultPoints: 35, emoji: "\u{1F4DA}" },
  { title: "Babysitting", category: "Kid Care", defaultPoints: 60, emoji: "\u{1F476}" },
  { title: "Take to practice", category: "Kid Care", defaultPoints: 45, emoji: "\u{26BD}" },
  // Wildcard
  { title: "Custom request", category: "Wildcard", defaultPoints: 25, emoji: "\u{1F3B2}" },
  { title: "Surprise me", category: "Wildcard", defaultPoints: 20, emoji: "\u{1F381}" },
  { title: "Dealer's choice", category: "Wildcard", defaultPoints: 30, emoji: "\u{2728}" },
] as const;

type DbOrTx = {
  insert: typeof db.insert;
};

export function seedCrewDefaults(crewId: string, txOrDb: DbOrTx = db) {
  for (const template of DEFAULT_TASK_TEMPLATES) {
    txOrDb.insert(schema.taskMenuTemplates).values({
      crewId,
      ...template,
    }).run();
  }

  for (const routine of DEFAULT_SELF_CARE_ROUTINES) {
    txOrDb.insert(schema.selfCareRoutines).values({
      crewId,
      ...routine,
    }).run();
  }
}

export { DEFAULT_TASK_TEMPLATES, DEFAULT_SELF_CARE_ROUTINES };
