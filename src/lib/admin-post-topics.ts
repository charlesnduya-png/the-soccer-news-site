import {
  LEAGUE_NEWS_CONFIG,
  newsTopicLabel,
  type NewsTopic,
} from "@/lib/league-news-config";

/** Categories admins can publish into (matches site news feeds). */
export const ADMIN_POST_TOPIC_OPTIONS: Array<{
  value: NewsTopic;
  label: string;
  hint: string;
}> = [
  {
    value: "european-leagues",
    label: "Home · European Football News",
    hint: "Shows on the homepage Top Stories and All Europe news",
  },
  {
    value: "kenyan-football",
    label: "Kenyan Football",
    hint: "Shows in Kenya news sections",
  },
  {
    value: "transfers",
    label: "Transfers",
    hint: "Shows on the Transfers page",
  },
  {
    value: "all",
    label: "Everything",
    hint: "Shows in the Everything news filter",
  },
  ...LEAGUE_NEWS_CONFIG.map((league) => ({
    value: league.slug as NewsTopic,
    label: `${league.flag} ${league.name}`,
    hint: `Shows when fans filter news by ${league.name}`,
  })),
];

export function adminTopicDisplayLabel(topic: NewsTopic): string {
  const match = ADMIN_POST_TOPIC_OPTIONS.find((option) => option.value === topic);
  return match?.label ?? newsTopicLabel(topic);
}
