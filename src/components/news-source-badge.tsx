import type { NewsTopic } from "@/lib/news-api";
import { getActiveNewsSources } from "@/lib/news-api";

export function NewsSourceBadge({ topic = "all" }: { topic?: NewsTopic }) {
  const sources = getActiveNewsSources(topic);

  return (
    <div className="mb-8 flex flex-wrap gap-2">
      {sources.map((source) => (
        <span
          key={source}
          className="rounded-full border border-[#00ff87]/20 bg-[#00ff87]/10 px-3 py-1 text-xs font-medium text-[#00ff87]"
        >
          {source}
        </span>
      ))}
    </div>
  );
}
