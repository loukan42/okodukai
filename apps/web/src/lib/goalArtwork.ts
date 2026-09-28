export const GOAL_ARTWORKS = ["book", "bicycle", "cinema", "icecream", "dessert", "family-game", "music", "friend", "figurine"] as const;
export type GoalArtworkKey = typeof GOAL_ARTWORKS[number];

export function isGoalArtworkKey(value: string | null): value is GoalArtworkKey {
  return GOAL_ARTWORKS.some((key) => key === value);
}
