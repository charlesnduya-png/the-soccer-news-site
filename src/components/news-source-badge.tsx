import type { NewsTopic } from "@/lib/news-api";
import { getActiveNewsSources } from "@/lib/news-api";

export function NewsSourceBadge({ topic = "all" }: { topic?: NewsTopic }) {
  const sources = getActiveNewsSources(topic);

  return (
    <div className="mb-8 flex flex-wrap gap-2">
      {sources.map((source) => (
        <span
          key={source}
          className="news-source-chip rounded-full border px-3 py-1 text-xs font-medium"
        >
          {source}
        </span>
      ))}
    </div>
  );
}
