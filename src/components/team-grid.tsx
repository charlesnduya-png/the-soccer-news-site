import Image from "next/image";
import type { Team } from "@/lib/types";

interface TeamGridProps {
  teams: Team[];
}

export function TeamGrid({ teams }: TeamGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {teams.map((team) => (
        <div key={team.id} className="team-card group flex flex-col items-center rounded-2xl border p-6 text-center transition">
          <Image
            src={team.crest}
            alt={team.name}
            width={64}
            height={64}
            className="mb-4 h-16 w-16 object-contain transition group-hover:scale-110"
          />
          <h3 className="team-card__name font-bold">{team.shortName}</h3>
          <p className="team-card__full mt-1 text-xs">{team.name}</p>
          {team.venue && (
            <p className="team-card__venue mt-3 text-xs">{team.venue}</p>
          )}
          <span className="team-card__tla mt-3 rounded-full px-2 py-0.5 text-xs font-bold">
            {team.tla}
          </span>
        </div>
      ))}
    </div>
  );
}
