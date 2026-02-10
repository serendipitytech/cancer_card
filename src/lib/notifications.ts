type NotificationTemplate = {
  title: string;
  body: string;
};

export function getTaskCreatedNotification(
  cardHolderName: string,
  taskTitle: string,
  mode: string
): NotificationTemplate {
  switch (mode) {
    case "direct":
      return {
        title: "You've Been Summoned",
        body: `${cardHolderName} has PLAYED THEIR CANCER CARD. "${taskTitle}" — resistance is futile.`,
      };
    case "auction":
      return {
        title: "Auction Alert",
        body: `Who will ${taskTitle.toLowerCase()} for ${cardHolderName}? May the cheapest friend win.`,
      };
    default:
      return {
        title: "Card Played",
        body: `${cardHolderName} needs "${taskTitle}". First come, first served!`,
      };
  }
}

export function getTaskClaimedNotification(
  crewMemberName: string,
  taskTitle: string,
  comment?: string
): NotificationTemplate {
  const commentPart = comment ? ` They say: "${comment}"` : "";
  return {
    title: "Task Claimed!",
    body: `${crewMemberName} claimed "${taskTitle}".${commentPart}`,
  };
}

export function getTaskCompletedNotification(
  crewMemberName: string,
  taskTitle: string
): NotificationTemplate {
  return {
    title: "Task Complete",
    body: `${crewMemberName} finished "${taskTitle}". What a legend.`,
  };
}

export function getAuctionWonNotification(
  winnerName: string,
  taskTitle: string,
  bidAmount: number
): NotificationTemplate {
  return {
    title: "Auction Won!",
    body: `${winnerName} won "${taskTitle}" for just ${bidAmount} pts. Absolute bargain hunter.`,
  };
}

export function getMilestoneNotification(
  cardHolderName: string,
  milestoneType: string,
  points: number
): NotificationTemplate {
  const messages: Record<string, string> = {
    chemo: `${cardHolderName} logged a chemo session. +${points} points. Absolute warrior.`,
    meds: `${cardHolderName} took all their meds today. +${points} pts. Consistency wins.`,
    sleep: `${cardHolderName} got some good rest. +${points} pts. Rest is medicine.`,
    exercise: `${cardHolderName} got moving today. +${points} pts. Every step counts.`,
    meal: `${cardHolderName} ate a full meal. +${points} pts. Fuel for the fight.`,
    water: `${cardHolderName} stayed hydrated. +${points} pts. Water is life.`,
    appointment: `${cardHolderName} kept their appointment. +${points} pts. Showing up is half the battle.`,
    joy: `${cardHolderName} did something fun today. +${points} pts. Joy is medicine.`,
  };

  return {
    title: "Self-Care Win",
    body: messages[milestoneType] || `${cardHolderName} logged a milestone. +${points} pts.`,
  };
}

export function getStreakNotification(
  cardHolderName: string,
  streak: number,
  bonusPoints: number
): NotificationTemplate {
  return {
    title: "Streak Bonus!",
    body: `${cardHolderName} is on a ${streak}-day medication streak! +${bonusPoints} bonus pts.`,
  };
}

export function getBadgeNotification(
  memberName: string,
  badgeName: string,
  badgeEmoji: string
): NotificationTemplate {
  return {
    title: `${badgeEmoji} Badge Unlocked!`,
    body: `${memberName} just earned the ${badgeName} badge. Someone had to do it.`,
  };
}
