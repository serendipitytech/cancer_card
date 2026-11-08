import { describe, it, expect } from "vitest";
import {
  calculateMedicationStreak,
  calculateGeneralStreak,
} from "@/lib/streaks";
import { createUser, createCrew, createMilestone } from "../helpers/harness";

// Milestones are bucketed by local-calendar day, so log each one at local noon
// to stay clear of day boundaries (and DST shifts).
function daysAgoNoon(n: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function seedMedsForDays(crewId: string, userId: string, days: number[]): void {
  for (const d of days) {
    createMilestone(crewId, userId, "meds", daysAgoNoon(d));
  }
}

describe("streaks: medication streak", () => {
  it("returns 0 and no bonus with no logged milestones", () => {
    const u = createUser();
    const crew = createCrew(u.id);

    const result = calculateMedicationStreak(u.id, crew.id);

    expect(result).toEqual({ currentStreak: 0, bonusPoints: 0, bonusType: null });
  });

  it("awards the 3-day bonus (50 pts) at exactly a 3-day streak", () => {
    const u = createUser();
    const crew = createCrew(u.id);
    seedMedsForDays(crew.id, u.id, [0, 1, 2]);

    const result = calculateMedicationStreak(u.id, crew.id);

    expect(result.currentStreak).toBe(3);
    expect(result.bonusPoints).toBe(50);
    expect(result.bonusType).toBe("3-day medication streak");
  });

  it("awards the 7-day bonus (150 pts) at exactly a 7-day streak", () => {
    const u = createUser();
    const crew = createCrew(u.id);
    seedMedsForDays(crew.id, u.id, [0, 1, 2, 3, 4, 5, 6]);

    const result = calculateMedicationStreak(u.id, crew.id);

    expect(result.currentStreak).toBe(7);
    expect(result.bonusPoints).toBe(150);
    expect(result.bonusType).toBe("7-day medication streak");
  });

  it("gives no bonus for an off-threshold streak (e.g. 4 days)", () => {
    const u = createUser();
    const crew = createCrew(u.id);
    seedMedsForDays(crew.id, u.id, [0, 1, 2, 3]);

    const result = calculateMedicationStreak(u.id, crew.id);

    expect(result.currentStreak).toBe(4);
    expect(result.bonusPoints).toBe(0);
    expect(result.bonusType).toBeNull();
  });

  it("re-awards 150 at multiples of 7 beyond 7 (e.g. 14 days)", () => {
    const u = createUser();
    const crew = createCrew(u.id);
    seedMedsForDays(crew.id, u.id, Array.from({ length: 14 }, (_, i) => i));

    const result = calculateMedicationStreak(u.id, crew.id);

    expect(result.currentStreak).toBe(14);
    expect(result.bonusPoints).toBe(150);
  });

  it("breaks the streak on a gap day", () => {
    const u = createUser();
    const crew = createCrew(u.id);
    // Logged today and two days ago, but NOT yesterday.
    seedMedsForDays(crew.id, u.id, [0, 2]);

    const result = calculateMedicationStreak(u.id, crew.id);

    expect(result.currentStreak).toBe(1);
  });

  it("ignores non-medication milestones", () => {
    const u = createUser();
    const crew = createCrew(u.id);
    createMilestone(crew.id, u.id, "mood", daysAgoNoon(0));
    createMilestone(crew.id, u.id, "mood", daysAgoNoon(1));

    const result = calculateMedicationStreak(u.id, crew.id);

    expect(result.currentStreak).toBe(0);
  });

  it("is scoped per user within a crew", () => {
    const holder = createUser();
    const other = createUser();
    const crew = createCrew(holder.id);
    seedMedsForDays(crew.id, holder.id, [0, 1, 2]);

    // The other user logged nothing; their streak must be independent.
    expect(calculateMedicationStreak(other.id, crew.id).currentStreak).toBe(0);
    expect(calculateMedicationStreak(holder.id, crew.id).currentStreak).toBe(3);
  });
});

describe("streaks: general streak", () => {
  it("counts any milestone type", () => {
    const u = createUser();
    const crew = createCrew(u.id);
    createMilestone(crew.id, u.id, "mood", daysAgoNoon(0));
    createMilestone(crew.id, u.id, "meds", daysAgoNoon(1));
    createMilestone(crew.id, u.id, "walk", daysAgoNoon(2));

    expect(calculateGeneralStreak(u.id, crew.id)).toBe(3);
  });

  it("returns 0 with no milestones", () => {
    const u = createUser();
    const crew = createCrew(u.id);

    expect(calculateGeneralStreak(u.id, crew.id)).toBe(0);
  });
});
