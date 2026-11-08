import { describe, it, expect } from "vitest";
import { eq, and } from "drizzle-orm";
import { db, createUser, createCrew, addMember } from "../helpers/fixtures";
import { crewMembers } from "@/db/schema";
import type { MemberStats } from "@/types";
import { evaluateBadges } from "@/lib/badges";
import {
  recordCompletionStats,
  recordAuctionWin,
  recordStreak,
  awardEligibleBadges,
} from "@/lib/member-stats";

function statsOf(crewId: string, userId: string): MemberStats {
  const row = db
    .select({ stats: crewMembers.stats })
    .from(crewMembers)
    .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, userId)))
    .get();
  return (row?.stats || {}) as MemberStats;
}

function badgesOf(crewId: string, userId: string): string[] {
  const row = db
    .select({ badges: crewMembers.badges })
    .from(crewMembers)
    .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, userId)))
    .get();
  return (row?.badges || []) as string[];
}

const baseStats: MemberStats = {
  tasksCompleted: 0,
  pointsSpent: 0,
  auctionWins: 0,
  totalResponseTimeMs: 0,
  responseCount: 0,
  currentStreak: 0,
  longestStreak: 0,
};

describe("evaluateBadges (pure threshold rules)", () => {
  it("awards nothing below the thresholds in a large crew", () => {
    expect(evaluateBadges(baseStats, [], 6)).toEqual([]);
  });

  it("awards each stat-backed badge at its threshold", () => {
    expect(evaluateBadges({ ...baseStats, tasksCompleted: 5 }, [], 10)).toContain("first_responder");
    expect(evaluateBadges({ ...baseStats, auctionWins: 5 }, [], 10)).toContain("auction_shark");
    expect(evaluateBadges({ ...baseStats, longestStreak: 7 }, [], 10)).toContain("seven_day_streak");
    expect(evaluateBadges(baseStats, [], 3)).toContain("the_og");
  });

  it("never re-awards a badge the member already has", () => {
    const earned = evaluateBadges({ ...baseStats, tasksCompleted: 9 }, ["first_responder"], 10);
    expect(earned).not.toContain("first_responder");
  });
});

describe("stat writes", () => {
  it("records completion stats and auction wins additively", () => {
    const holder = createUser();
    const helper = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, helper.id, "crew_member");

    recordCompletionStats(db, crew.id, helper.id, 40);
    recordCompletionStats(db, crew.id, helper.id, 10);
    recordAuctionWin(db, crew.id, helper.id);

    const s = statsOf(crew.id, helper.id);
    expect(s.tasksCompleted).toBe(2);
    expect(s.pointsSpent).toBe(50);
    expect(s.auctionWins).toBe(1);
  });

  it("recordStreak sets current and keeps longest as a high-water mark", () => {
    const holder = createUser();
    const crew = createCrew(holder.id);

    recordStreak(db, crew.id, holder.id, 7);
    expect(statsOf(crew.id, holder.id)).toMatchObject({ currentStreak: 7, longestStreak: 7 });

    // A later shorter streak lowers current but not longest.
    recordStreak(db, crew.id, holder.id, 2);
    expect(statsOf(crew.id, holder.id)).toMatchObject({ currentStreak: 2, longestStreak: 7 });
  });
});

describe("awardEligibleBadges (transactional award path)", () => {
  it("awards earned badges once and is idempotent", () => {
    const holder = createUser();
    const helper = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, helper.id, "crew_member");

    // Five completions crosses the first_responder threshold; the small crew
    // also earns the_og.
    for (let i = 0; i < 5; i++) recordCompletionStats(db, crew.id, helper.id, 10);

    const awarded = awardEligibleBadges(db, crew.id, helper.id);
    expect(awarded).toContain("first_responder");
    expect(awarded).toContain("the_og");

    expect(badgesOf(crew.id, helper.id).sort()).toEqual(["first_responder", "the_og"]);

    // A second pass with no new stats awards nothing.
    expect(awardEligibleBadges(db, crew.id, helper.id)).toEqual([]);
  });

  it("awards auction_shark after five auction wins", () => {
    const holder = createUser();
    const helper = createUser();
    const crew = createCrew(holder.id);
    // Pad the crew past 5 members so the_og does not fire and muddy the assertion.
    for (let i = 0; i < 6; i++) addMember(crew.id, createUser().id, "crew_member");
    addMember(crew.id, helper.id, "crew_member");

    for (let i = 0; i < 5; i++) recordAuctionWin(db, crew.id, helper.id);
    const awarded = awardEligibleBadges(db, crew.id, helper.id);
    expect(awarded).toEqual(["auction_shark"]);
  });
});
