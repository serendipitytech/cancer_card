import { describe, it, expect } from "vitest";
import { isCardHolder, canManageCrew } from "@/lib/roles";

// The two role predicates are the single source of truth for "who is the card
// holder" vs "who may act on the card holder's behalf". These tests pin the
// exact semantics every route now relies on.
describe("role predicates (single source of truth)", () => {
  it("isCardHolder is the exact card_holder role only", () => {
    expect(isCardHolder("card_holder")).toBe(true);
    expect(isCardHolder("admin")).toBe(false);
    expect(isCardHolder("crew_member")).toBe(false);
    expect(isCardHolder(null)).toBe(false);
    expect(isCardHolder(undefined)).toBe(false);
  });

  it("canManageCrew is card_holder OR admin (the privilege check)", () => {
    expect(canManageCrew("card_holder")).toBe(true);
    expect(canManageCrew("admin")).toBe(true);
    expect(canManageCrew("crew_member")).toBe(false);
    expect(canManageCrew(null)).toBe(false);
    expect(canManageCrew(undefined)).toBe(false);
  });

  it("admin can manage the crew but is not the card holder", () => {
    expect(canManageCrew("admin")).toBe(true);
    expect(isCardHolder("admin")).toBe(false);
  });
});
