// Single source of truth for "who is the card holder" role logic.
//
// Before this module the two role predicates were copy-pasted across a dozen
// routes and components: the exact `role === "card_holder"` check and the
// card-holder-OR-admin privilege check (`role === "card_holder" || role ===
// "admin"`). Spelling either one by hand in each place is how the two drift
// apart. Both now live here; everything else imports these.

import type { UserRole } from "@/types";

/**
 * The one person who holds the crew's point balance and logs self-care. This is
 * the exact-role check: an admin is NOT the card holder. Use it where only the
 * balance owner applies (logging milestones, being excluded from the
 * leaderboard, being blocked from bidding on their own asks).
 */
export function isCardHolder(role: UserRole | string | null | undefined): boolean {
  return role === "card_holder";
}

/**
 * Card-holder-level privilege: the card holder themselves, or an admin acting on
 * their behalf. Use it for actions an admin is allowed to perform for the card
 * holder (creating, completing, closing asks, managing the menu, inviting).
 */
export function canManageCrew(role: UserRole | string | null | undefined): boolean {
  return role === "card_holder" || role === "admin";
}
