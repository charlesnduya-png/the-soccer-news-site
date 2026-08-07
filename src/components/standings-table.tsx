import Image from "next/image";
import type { StandingRow } from "@/lib/types";
import { getFormColor, getPositionZone } from "@/lib/utils";

interface StandingsTableProps {
  standings: StandingRow[];
  compact?: boolean;
}

export function StandingsTable({ standings, compact = false }: StandingsTableProps) {
  const rows = compact ? standings.slice(0, 10) : standings;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a0533]/80">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wider text-white/50">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Team</th>
              <th className="px-4 py-3 text-center font-semibold">P</th>
              <th className="px-4 py-3 text-center font-semibold">W</th>
              <th className="px-4 py-3 text-center font-semibold">D</th>
              <th className="px-4 py-3 text-center font-semibold">L</th>
              <th className="px-4 py-3 text-center font-semibold">GF</th>
              <th className="px-4 py-3 text-center font-semibold">GA</th>
              <th className="px-4 py-3 text-center font-semibold">GD</th>
              {!compact && <th className="px-4 py-3 font-semibold">Form</th>}
              <th className="px-4 py-3 text-center font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.team.id}
                className={`border-b border-white/5 transition hover:bg-white/5 ${getPositionZone(row.position)}`}
              >
                <td className="px-4 py-3 font-bold text-white/80">{row.position}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Image
                      src={row.team.crest}
                      alt={row.team.name}
                      width={24}
                      height={24}
                      className="h-6 w-6 object-contain"
                    />
                    <span className="font-medium text-white">{row.team.shortName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-white/70">{row.playedGames}</td>
                <td className="px-4 py-3 text-center text-white/70">{row.won}</td>
                <td className="px-4 py-3 text-center text-white/70">{row.draw}</td>
                <td className="px-4 py-3 text-center text-white/70">{row.lost}</td>
                <td className="px-4 py-3 text-center text-white/70">{row.goalsFor}</td>
                <td className="px-4 py-3 text-center text-white/70">{row.goalsAgainst}</td>
                <td className="px-4 py-3 text-center text-white/70">
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </td>
                {!compact && (
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {(row.form ?? "")
                        .split(",")
                        .slice(-5)
                        .map((result, i) => (
                          <span
                            key={i}
                            className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white ${getFormColor(result.trim())}`}
                          >
                            {result.trim()}
                          </span>
                        ))}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 text-center text-base font-black text-[#00ff87]">
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-4 border-t border-white/10 px-4 py-3 text-xs text-white/50">
          <span className="flex items-center gap-2">
            <span className="h-3 w-1 rounded bg-emerald-400" /> Champions League
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-1 rounded bg-blue-400" /> Europa League
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-1 rounded bg-orange-400" /> Conference League
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-1 rounded bg-red-500" /> Relegation
          </span>
        </div>
      )}
    </div>
  );
}
