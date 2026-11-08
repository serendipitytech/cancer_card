import type { NotificationEventType } from "@/lib/notification-types";

type NotificationTemplate = {
  title: string;
  body: string;
};

/**
 * Placeholder token that stands in for the actor's name inside stored
 * notification text. We never freeze a person's name into `notification_log`;
 * instead the template emits this token, we persist the token plus the
 * `actorId`, and the name is resolved to the actor's CURRENT display name at
 * read/send time (see `renderActorText`). That keeps one governed home for the
 * name, so when an account is closed every notification about that person
 * renders "A former member" automatically, with nothing to scrub in the log.
 */
export const ACTOR_PLACEHOLDER = "{{actor}}";

/** Substitute the live actor name into placeholdered notification text. */
export function renderActorText(text: string, actorName: string): string {
  return text.split(ACTOR_PLACEHOLDER).join(actorName);
}

export function getTaskCreatedNotification(
  taskTitle: string,
  mode: string
): NotificationTemplate {
  switch (mode) {
    case "direct":
      return {
        title: "You've Been Summoned",
        body: `${ACTOR_PLACEHOLDER} has PLAYED THEIR CANCER CARD. "${taskTitle}" — resistance is futile.`,
      };
    case "auction":
      return {
        title: "Auction Alert",
        body: `Who will ${taskTitle.toLowerCase()} for ${ACTOR_PLACEHOLDER}? May the cheapest friend win.`,
      };
    default:
      return {
        title: "Card Played",
        body: `${ACTOR_PLACEHOLDER} needs "${taskTitle}". First come, first served!`,
      };
  }
}

export function getTaskClaimedNotification(
  taskTitle: string,
  comment?: string
): NotificationTemplate {
  const commentPart = comment ? ` They say: "${comment}"` : "";
  return {
    title: "Task Claimed!",
    body: `${ACTOR_PLACEHOLDER} claimed "${taskTitle}".${commentPart}`,
  };
}

export function getTaskCompletedNotification(
  taskTitle: string
): NotificationTemplate {
  return {
    title: "Task Complete",
    body: `${ACTOR_PLACEHOLDER} finished "${taskTitle}". What a legend.`,
  };
}

export function getAuctionWonNotification(
  taskTitle: string,
  bidAmount: number
): NotificationTemplate {
  return {
    title: "Auction Won!",
    body: `${ACTOR_PLACEHOLDER} won "${taskTitle}" for just ${bidAmount} pts. Absolute bargain hunter.`,
  };
}

export function getMilestoneNotification(
  milestoneType: string,
  points: number
): NotificationTemplate {
  const messages: Record<string, string> = {
    chemo: `${ACTOR_PLACEHOLDER} logged a chemo session. +${points} points. Absolute warrior.`,
    meds: `${ACTOR_PLACEHOLDER} took all their meds today. +${points} pts. Consistency wins.`,
    sleep: `${ACTOR_PLACEHOLDER} got some good rest. +${points} pts. Rest is medicine.`,
    exercise: `${ACTOR_PLACEHOLDER} got moving today. +${points} pts. Every step counts.`,
    meal: `${ACTOR_PLACEHOLDER} ate a full meal. +${points} pts. Fuel for the fight.`,
    water: `${ACTOR_PLACEHOLDER} stayed hydrated. +${points} pts. Water is life.`,
    appointment: `${ACTOR_PLACEHOLDER} kept their appointment. +${points} pts. Showing up is half the battle.`,
    joy: `${ACTOR_PLACEHOLDER} did something fun today. +${points} pts. Joy is medicine.`,
  };

  return {
    title: "Self-Care Win",
    body:
      messages[milestoneType] ||
      `${ACTOR_PLACEHOLDER} logged a milestone. +${points} pts.`,
  };
}

export function getStreakNotification(
  streak: number,
  bonusPoints: number
): NotificationTemplate {
  return {
    title: "Streak Bonus!",
    body: `${ACTOR_PLACEHOLDER} is on a ${streak}-day medication streak! +${bonusPoints} bonus pts.`,
  };
}

export function getBadgeNotification(
  badgeName: string,
  badgeEmoji: string
): NotificationTemplate {
  return {
    title: `${badgeEmoji} Badge Unlocked!`,
    body: `${ACTOR_PLACEHOLDER} just earned the ${badgeName} badge. Someone had to do it.`,
  };
}

// ─── Template Dispatcher ────────────────────────────────────────────────────

export function getNotificationTemplate(
  eventType: NotificationEventType,
  data: Record<string, unknown>
): NotificationTemplate | null {
  const taskTitle = (data.taskTitle as string) || "a task";

  switch (eventType) {
    case "task_created":
      return getTaskCreatedNotification(
        taskTitle,
        (data.mode as string) || "open"
      );
    case "task_claimed":
      return getTaskClaimedNotification(taskTitle);
    case "task_completed":
      return getTaskCompletedNotification(taskTitle);
    case "bid_placed":
      return {
        title: "New Bid",
        body: `${ACTOR_PLACEHOLDER} bid ${data.bidAmount ?? "?"} pts on "${taskTitle}".`,
      };
    case "auction_won":
      return getAuctionWonNotification(
        taskTitle,
        (data.winningBid as number) || 0
      );
    case "milestone_logged":
      return getMilestoneNotification(
        (data.milestoneType as string) || "milestone",
        (data.pointsEarned as number) || 0
      );
    case "badge_earned":
      return getBadgeNotification(
        (data.badgeName as string) || "a badge",
        (data.badgeEmoji as string) || "🎖️"
      );
    case "member_joined":
      return {
        title: "New Crew Member",
        body: `${ACTOR_PLACEHOLDER} joined the crew! Time to put them to work.`,
      };
    case "card_holder_left":
      return {
        title: "A Card Holder has closed their account",
        body: "Someone you supported has closed their Cancer Card account, and their personal information has been removed. You're welcome to keep your account, or you can close yours too from Settings.",
      };
    default:
      return null;
  }
}
