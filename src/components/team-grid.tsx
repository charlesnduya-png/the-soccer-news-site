import Image from "next/image";
import type { Team } from "@/lib/types";

interface TeamGridProps {
  teams: Team[];
}

export function TeamGrid({ teams }: TeamGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {teams.map((team) => (
        <div
          key={team.id}
          className="group flex flex-col items-center rounded-2xl border border-white/10 bg-[#1a0533]/80 p-6 text-center transition hover:border-[#00ff87]/30 hover:bg-[#1a0533]"
        >
          <Image
            src={team.crest}
            alt={team.name}
            width={64}
            height={64}
            className="mb-4 h-16 w-16 object-contain transition group-hover:scale-110"
          />
          <h3 className="font-bold text-white">{team.shortName}</h3>
          <p className="mt-1 text-xs text-white/40">{team.name}</p>
          {team.venue && (
            <p className="mt-3 text-xs text-white/30">{team.venue}</p>
          )}
          <span className="mt-3 rounded-full bg-white/5 px-2 py-0.5 text-xs font-bold text-[#00ff87]">
            {team.tla}
          </span>
        </div>
      ))}
    </div>
  );
}
