import Image from "next/image";
import type { Scorer } from "@/lib/types";

interface ScorersTableProps {
  scorers: Scorer[];
}

export function ScorersTable({ scorers }: ScorersTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a0533]/80">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wider text-white/50">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Player</th>
              <th className="px-4 py-3 font-semibold">Team</th>
              <th className="px-4 py-3 text-center font-semibold">Goals</th>
              <th className="px-4 py-3 text-center font-semibold">Assists</th>
              <th className="px-4 py-3 text-center font-semibold">Pens</th>
            </tr>
          </thead>
          <tbody>
            {scorers.map((scorer, index) => (
              <tr
                key={`${scorer.player.id}-${index}`}
                className="border-b border-white/5 transition hover:bg-white/5"
              >
                <td className="px-4 py-3 font-bold text-white/80">{index + 1}</td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{scorer.player.name}</p>
                    <p className="text-xs text-white/40">{scorer.player.nationality}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Image
                      src={scorer.team.crest}
                      alt={scorer.team.name}
                      width={20}
                      height={20}
                      className="h-5 w-5 object-contain"
                    />
                    <span className="text-white/80">{scorer.team.shortName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-lg font-black text-[#00ff87]">
                  {scorer.goals}
                </td>
                <td className="px-4 py-3 text-center text-white/70">
                  {scorer.assists ?? "-"}
                </td>
                <td className="px-4 py-3 text-center text-white/70">
                  {scorer.penalties ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
