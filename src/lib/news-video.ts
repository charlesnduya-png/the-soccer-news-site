export type VideoEmbed =
  | { kind: "youtube"; src: string; id: string }
  | { kind: "vimeo"; src: string; id: string }
  | { kind: "dailymotion"; src: string; id: string }
  | { kind: "file"; src: string };

const VIDEO_EXT = /\.(mp4|webm|ogg|m3u8|mov)(\?|#|$)/i;

export function isLikelyVideoUrl(url: string, mimeType?: string): boolean {
  if (mimeType?.toLowerCase().startsWith("video/")) return true;
  if (VIDEO_EXT.test(url)) return true;
  return /youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|dai\.ly/i.test(url);
}

export function toVideoEmbed(url: string): VideoEmbed | null {
  if (!url || !url.startsWith("http")) return null;

  const yt =
    url.match(
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i
    ) ?? url.match(/youtube\.com\/watch\?.*\bv=([\w-]{11})/i);
  if (yt?.[1]) {
    return {
      kind: "youtube",
      id: yt[1],
      src: `https://www.youtube.com/embed/${yt[1]}?rel=0&playsinline=1`,
    };
  }

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo?.[1]) {
    return {
      kind: "vimeo",
      id: vimeo[1],
      src: `https://player.vimeo.com/video/${vimeo[1]}`,
    };
  }

  const dm =
    url.match(/dailymotion\.com\/(?:video|embed\/video)\/([a-zA-Z0-9]+)/i) ??
    url.match(/dai\.ly\/([a-zA-Z0-9]+)/i);
  if (dm?.[1]) {
    return {
      kind: "dailymotion",
      id: dm[1],
      src: `https://www.dailymotion.com/embed/video/${dm[1]}`,
    };
  }

  if (VIDEO_EXT.test(url) || url.includes("mime=video")) {
    return { kind: "file", src: url };
  }

  return null;
}

/** Pull YouTube / Vimeo / mp4 / iframe / og:video URLs from HTML or text. */
export function extractVideoUrlFromHtml(html: string): string | undefined {
  if (!html) return undefined;

  const patterns = [
    /https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]{11})/i,
    /https?:\/\/(?:www\.)?youtube-nocookie\.com\/embed\/([\w-]{11})/i,
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/i,
    /https?:\/\/youtu\.be\/([\w-]{11})/i,
    /https?:\/\/(?:www\.)?youtube\.com\/shorts\/([\w-]{11})/i,
    /property=["']og:video(?::url)?["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:video(?::url)?["']/i,
    /https?:\/\/(?:www\.)?vimeo\.com\/(?:video\/)?(\d+)/i,
    /https?:\/\/player\.vimeo\.com\/video\/(\d+)/i,
    /https?:\/\/(?:www\.)?dailymotion\.com\/(?:video|embed\/video)\/([a-zA-Z0-9]+)/i,
    /<(?:source|video)[^>]+src=["'](https?:\/\/[^"']+\.(?:mp4|webm|m3u8)[^"']*)["']/i,
    /https?:\/\/[^"'<\s]+\.(?:mp4|webm|m3u8)(?:\?[^"'<\s]*)?/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;

    if (pattern.source.includes("youtube") || pattern.source.includes("youtu")) {
      const id = match[1];
      if (id && id.length === 11) return `https://www.youtube.com/watch?v=${id}`;
    }
    if (pattern.source.includes("vimeo")) {
      return `https://vimeo.com/${match[1]}`;
    }
    if (pattern.source.includes("dailymotion")) {
      return `https://www.dailymotion.com/video/${match[1]}`;
    }

    const candidate = match[1] ?? match[0];
    if (candidate?.startsWith("http") && toVideoEmbed(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export function looksLikeVideoStory(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return (
    /\b(video|watch|highlights?|clip|footage|goal of|watch:?)\b/.test(text) ||
    text.includes("▶") ||
    text.includes("📹")
  );
}

export function videoDescription(
  title: string,
  source: string,
  description?: string
): string {
  const clean = description?.trim();
  if (clean) return clean;
  return `Watch ${title} from ${source}. Get the key football moment, highlights and context in this video report.`;
}

/** Best-effort poster image for embeds (YouTube / Dailymotion / file fallback). */
export function videoPosterUrl(
  url: string | undefined,
  fallbackImage?: string
): string | undefined {
  if (!url) return fallbackImage;
  const embed = toVideoEmbed(url);
  if (!embed) return fallbackImage;

  if (embed.kind === "youtube") {
    // hqdefault matches the Aug 20 zip cards — sharper 16:9 poster for play UI.
    return `https://i.ytimg.com/vi/${embed.id}/hqdefault.jpg`;
  }
  if (embed.kind === "dailymotion") {
    return `https://www.dailymotion.com/thumbnail/video/${embed.id}`;
  }
  if (embed.kind === "vimeo") {
    // Vimeo needs an API call for thumbs; use article image when present.
    return fallbackImage;
  }
  return fallbackImage;
}
