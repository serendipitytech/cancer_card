import { describe, it, expect } from "vitest";
import { db, createUser, createCrew } from "../helpers/fixtures";
import { milestones } from "@/db/schema";
import { localDay, previousDay } from "@/lib/time";
import {
  calculateStreak,
  alreadyLoggedToday,
  STREAK_ACTION_TYPES,
} from "@/lib/streaks";

function logMeds(crewId: string, userId: string, loggedAt: Date) {
  db.insert(milestones)
    .values({
      crewId,
      userId,
      milestoneType: "meds",
      pointsEarned: 10,
      loggedAt,
    })
    .run();
}

describe("local day/hour boundaries", () => {
  it("localDay uses the given timezone, not server UTC", () => {
    // 02:00 UTC on Mar 10 is still the evening of Mar 9 in New York.
    const instant = new Date("2026-03-10T02:00:00Z");
    expect(localDay(instant, "America/New_York")).toBe("2026-03-09");
    expect(localDay(instant, "UTC")).toBe("2026-03-10");
  });

  it("previousDay steps one calendar day back, DST included", () => {
    expect(previousDay("2026-03-09")).toBe("2026-03-08");
    // Across the US spring-forward boundary (Mar 8 2026) it is still a calendar step.
    expect(previousDay("2026-03-08")).toBe("2026-03-07");
  });
});

describe("streak day boundaries respect the user's timezone", () => {
  it("counts the same logs differently under ET vs UTC", () => {
    const holder = createUser();
    const crew = createCrew(holder.id);

    // Three logs that are three consecutive ET days (Jun 13, 14, 15) but only
    // two distinct UTC days, because two of them fall after 00:00 UTC / before
    // the ET day rolls over.
    logMeds(crew.id, holder.id, new Date("2026-06-14T02:00:00Z")); // ET Jun 13 22:00
    logMeds(crew.id, holder.id, new Date("2026-06-15T02:00:00Z")); // ET Jun 14 22:00
    logMeds(crew.id, holder.id, new Date("2026-06-15T16:00:00Z")); // ET Jun 15 12:00

    const now = new Date("2026-06-15T16:30:00Z"); // ET Jun 15 12:30

    const et = calculateStreak(holder.id, crew.id, "America/New_York", STREAK_ACTION_TYPES, now);
    const utc = calculateStreak(holder.id, crew.id, "UTC", STREAK_ACTION_TYPES, now);

    expect(et.currentStreak).toBe(3);
    expect(et.bonusPoints).toBe(50); // 3-day bonus
    // Under UTC two of the logs collapse onto one day, so the streak is shorter.
    expect(utc.currentStreak).toBe(2);
  });

  it("seven consecutive local days earn the 150-point 7-day bonus", () => {
    const holder = createUser();
    const crew = createCrew(holder.id);

    const now = new Date("2026-06-15T16:00:00Z");
    // One ET-noon log on each of the 7 days ending today.
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      logMeds(crew.id, holder.id, d);
    }

    const streak = calculateStreak(holder.id, crew.id, "America/New_York", STREAK_ACTION_TYPES, now);
    expect(streak.currentStreak).toBe(7);
    expect(streak.longestStreak).toBe(7);
    expect(streak.bonusPoints).toBe(150);
  });
});

describe("alreadyLoggedToday farm guard", () => {
  it("is true only for a log in the same local day", () => {
    const holder = createUser();
    const crew = createCrew(holder.id);

    // A log at an instant that is Jun 14 in ET but Jun 15 in UTC.
    logMeds(crew.id, holder.id, new Date("2026-06-15T02:00:00Z"));
    const now = new Date("2026-06-15T16:00:00Z"); // ET Jun 15, UTC Jun 15

    // In ET the log is "yesterday", so a new log today is allowed.
    expect(alreadyLoggedToday(holder.id, crew.id, "meds", "America/New_York", now)).toBe(false);
    // In UTC the log is "today", so the guard fires.
    expect(alreadyLoggedToday(holder.id, crew.id, "meds", "UTC", now)).toBe(true);
  });

  it("fires for a second same-day log and ignores other action types", () => {
    const holder = createUser();
    const crew = createCrew(holder.id);
    const now = new Date("2026-06-15T16:00:00Z");

    logMeds(crew.id, holder.id, new Date("2026-06-15T15:00:00Z")); // same ET day as now
    expect(alreadyLoggedToday(holder.id, crew.id, "meds", "America/New_York", now)).toBe(true);
    // A different behavior that day is still loggable.
    expect(alreadyLoggedToday(holder.id, crew.id, "water", "America/New_York", now)).toBe(false);
  });
});
