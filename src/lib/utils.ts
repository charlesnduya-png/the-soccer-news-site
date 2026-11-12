import { format, formatDistanceToNow, isToday, isTomorrow, parseISO } from "date-fns";

export function formatMatchDate(dateString: string): string {
  const date = parseISO(dateString);

  if (isToday(date)) return `Today, ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `Tomorrow, ${format(date, "HH:mm")}`;
  return format(date, "EEE d MMM, HH:mm");
}

export function formatNewsDate(dateString: string): string {
  return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
}

export function getMatchStatusLabel(status: string): string {
  switch (status) {
    case "IN_PLAY":
    case "LIVE":
      return "LIVE";
    case "PAUSED":
      return "HT";
    case "FINISHED":
      return "FT";
    case "SCHEDULED":
    case "TIMED":
      return "Upcoming";
    case "POSTPONED":
      return "PP";
    case "CANCELLED":
      return "CAN";
    default:
      return status;
  }
}

export function isLiveMatch(status: string): boolean {
  return ["IN_PLAY", "PAUSED", "LIVE"].includes(status);
}

export function getFormColor(result: string): string {
  switch (result) {
    case "W":
      return "bg-emerald-500";
    case "D":
      return "bg-zinc-500";
    case "L":
      return "bg-red-500";
    default:
      return "bg-zinc-700";
  }
}

export function getPositionZone(position: number): string {
  if (position <= 4) return "border-l-4 border-l-emerald-400";
  if (position === 5) return "border-l-4 border-l-blue-400";
  if (position === 6) return "border-l-4 border-l-orange-400";
  if (position >= 18) return "border-l-4 border-l-red-500";
  return "";
}
