export type TourStep = {
  target: string;
  title: string;
  description: string;
  position: "above" | "below";
};

export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="point-bank"]',
    title: "Your Point Bank",
    description:
      "This is your balance. Spend points to request help from your Crew — self-care earns them back.",
    position: "below",
  },
  {
    target: '[data-tour="quick-actions"]',
    title: "Quick Actions",
    description:
      "Play a card to request help, log self-care to earn points, or check your open requests.",
    position: "below",
  },
  {
    target: '[data-tour="invite-code"]',
    title: "Your Invite Code",
    description:
      "Share this code with friends and family so they can join your Crew and start helping out.",
    position: "below",
  },
  {
    target: '[data-tour="recent-tasks"]',
    title: "Recent Requests",
    description:
      "Your latest help requests show up here. Tap any card to see details or track progress.",
    position: "above",
  },
  {
    target: '[data-tour="activity-feed"]',
    title: "Activity Feed",
    description:
      "See what's happening in your Crew — tasks claimed, milestones logged, badges earned.",
    position: "above",
  },
];
