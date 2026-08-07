export type LeagueSlug =
  | "premier-league"
  | "la-liga"
  | "bundesliga"
  | "serie-a"
  | "ligue-1"
  | "eredivisie"
  | "primeira-liga"
  | "belgian-pro-league"
  | "scottish-premiership"
  | "swiss-super-league"
  | "austrian-bundesliga"
  | "turkish-super-lig"
  | "danish-superliga"
  | "norwegian-eliteserien"
  | "swedish-allsvenskan";

export type LeagueNewsConfig = {
  slug: LeagueSlug;
  name: string;
  country: string;
  flag: string;
  keywords: string[];
  gnewsQuery: string;
  gnewsCountry: string;
  googleNewsRss: string;
};

function googleNewsRss(query: string, gl: string, hl = "en"): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${gl}:en`;
}

export const LEAGUE_NEWS_CONFIG: LeagueNewsConfig[] = [
  {
    slug: "premier-league",
    name: "Premier League",
    country: "England",
    flag: "🇬🇧",
    keywords: [
      "premier league",
      "epl",
      "english premier",
      "liverpool",
      "arsenal",
      "manchester united",
      "manchester city",
      "man utd",
      "man city",
      "chelsea",
      "tottenham",
      "spurs",
      "newcastle",
      "aston villa",
      "brighton",
      "west ham",
      "wolves",
      "everton",
      "fulham",
      "crystal palace",
      "bournemouth",
      "brentford",
      "nottingham forest",
    ],
    gnewsQuery:
      '"Premier League" OR EPL OR Liverpool OR Arsenal OR Chelsea OR "Manchester United" OR "Manchester City"',
    gnewsCountry: "gb",
    googleNewsRss: googleNewsRss("Premier League football", "GB"),
  },
  {
    slug: "la-liga",
    name: "La Liga",
    country: "Spain",
    flag: "🇪🇸",
    keywords: [
      "la liga",
      "laliga",
      "real madrid",
      "barcelona",
      "barça",
      "atletico madrid",
      "atlético",
      "sevilla",
      "real sociedad",
      "villarreal",
      "athletic bilbao",
      "real betis",
    ],
    gnewsQuery: '"La Liga" OR Real Madrid OR Barcelona OR Atletico Madrid OR Sevilla',
    gnewsCountry: "es",
    googleNewsRss: googleNewsRss("La Liga football", "ES"),
  },
  {
    slug: "bundesliga",
    name: "Bundesliga",
    country: "Germany",
    flag: "🇩🇪",
    keywords: [
      "bundesliga",
      "bayern munich",
      "bayern münchen",
      "borussia dortmund",
      "dortmund",
      "rb leipzig",
      "leverkusen",
      "bayer leverkusen",
      "eintracht frankfurt",
      "stuttgart",
      "wolfsburg",
      "freiburg",
    ],
    gnewsQuery: 'Bundesliga OR "Bayern Munich" OR "Borussia Dortmund" OR Leverkusen',
    gnewsCountry: "de",
    googleNewsRss: googleNewsRss("Bundesliga football", "DE"),
  },
  {
    slug: "serie-a",
    name: "Serie A",
    country: "Italy",
    flag: "🇮🇹",
    keywords: [
      "serie a",
      "juventus",
      "inter milan",
      "ac milan",
      "napoli",
      "roma",
      "lazio",
      "atalanta",
      "fiorentina",
      "torino",
      "bologna",
    ],
    gnewsQuery: '"Serie A" OR Juventus OR "Inter Milan" OR "AC Milan" OR Napoli OR Roma',
    gnewsCountry: "it",
    googleNewsRss: googleNewsRss("Serie A football", "IT"),
  },
  {
    slug: "ligue-1",
    name: "Ligue 1",
    country: "France",
    flag: "🇫🇷",
    keywords: [
      "ligue 1",
      "psg",
      "paris saint-germain",
      "marseille",
      "olympique marseille",
      "lyon",
      "olympique lyon",
      "monaco",
      "lille",
      "nice",
      "lens",
    ],
    gnewsQuery: '"Ligue 1" OR PSG OR Marseille OR Lyon OR Monaco',
    gnewsCountry: "fr",
    googleNewsRss: googleNewsRss("Ligue 1 football", "FR"),
  },
  {
    slug: "eredivisie",
    name: "Eredivisie",
    country: "Netherlands",
    flag: "🇳🇱",
    keywords: [
      "eredivisie",
      "ajax",
      "psv",
      "feyenoord",
      "az alkmaar",
      "twente",
      "utrecht",
    ],
    gnewsQuery: "Eredivisie OR Ajax OR PSV OR Feyenoord",
    gnewsCountry: "nl",
    googleNewsRss: googleNewsRss("Eredivisie football", "NL"),
  },
  {
    slug: "primeira-liga",
    name: "Primeira Liga",
    country: "Portugal",
    flag: "🇵🇹",
    keywords: [
      "primeira liga",
      "benfica",
      "porto",
      "fc porto",
      "sporting cp",
      "sporting lisbon",
      "braga",
    ],
    gnewsQuery: '"Primeira Liga" OR Benfica OR Porto OR "Sporting CP"',
    gnewsCountry: "pt",
    googleNewsRss: googleNewsRss("Primeira Liga football", "PT"),
  },
  {
    slug: "belgian-pro-league",
    name: "Belgian Pro League",
    country: "Belgium",
    flag: "🇧🇪",
    keywords: [
      "belgian pro league",
      "jupiler pro league",
      "anderlecht",
      "club brugge",
      "genk",
      "standard liege",
      "standard liège",
      "union saint-gilloise",
    ],
    gnewsQuery: '"Belgian Pro League" OR Anderlecht OR "Club Brugge" OR Genk',
    gnewsCountry: "be",
    googleNewsRss: googleNewsRss("Belgian Pro League football", "BE"),
  },
  {
    slug: "scottish-premiership",
    name: "Scottish Premiership",
    country: "Scotland",
    flag: "🏴",
    keywords: [
      "scottish premiership",
      "spfl",
      "celtic",
      "rangers",
      "hearts",
      "hibernian",
      "aberdeen",
    ],
    gnewsQuery: '"Scottish Premiership" OR Celtic OR Rangers OR SPFL',
    gnewsCountry: "gb",
    googleNewsRss: googleNewsRss("Scottish Premiership football", "GB"),
  },
  {
    slug: "swiss-super-league",
    name: "Swiss Super League",
    country: "Switzerland",
    flag: "🇨🇭",
    keywords: [
      "swiss super league",
      "super league switzerland",
      "basel",
      "young boys",
      "servette",
      "lugano",
      "zürich",
      "zurich",
    ],
    gnewsQuery: '"Swiss Super League" OR Basel OR "Young Boys"',
    gnewsCountry: "ch",
    googleNewsRss: googleNewsRss("Swiss Super League football", "CH"),
  },
  {
    slug: "austrian-bundesliga",
    name: "Austrian Bundesliga",
    country: "Austria",
    flag: "🇦🇹",
    keywords: [
      "austrian bundesliga",
      "admiral bundesliga",
      "red bull salzburg",
      "rb salzburg",
      "rapid vienna",
      "rapid wien",
      "sturm graz",
      "lask",
    ],
    gnewsQuery: '"Austrian Bundesliga" OR Salzburg OR "Rapid Vienna" OR "Sturm Graz"',
    gnewsCountry: "at",
    googleNewsRss: googleNewsRss("Austrian Bundesliga football", "AT"),
  },
  {
    slug: "turkish-super-lig",
    name: "Turkish Süper Lig",
    country: "Türkiye",
    flag: "🇹🇷",
    keywords: [
      "süper lig",
      "super lig",
      "turkish super lig",
      "galatasaray",
      "fenerbahce",
      "fenerbahçe",
      "besiktas",
      "beşiktaş",
      "trabzonspor",
    ],
    gnewsQuery: '"Super Lig" OR Galatasaray OR Fenerbahce OR Besiktas OR Trabzonspor',
    gnewsCountry: "tr",
    googleNewsRss: googleNewsRss("Turkish Super Lig football", "TR"),
  },
  {
    slug: "danish-superliga",
    name: "Danish Superliga",
    country: "Denmark",
    flag: "🇩🇰",
    keywords: [
      "danish superliga",
      "superliga denmark",
      "fc copenhagen",
      "copenhagen",
      "midtjylland",
      "brondby",
      "brøndby",
      "nordsjaelland",
    ],
    gnewsQuery: '"Danish Superliga" OR "FC Copenhagen" OR Midtjylland OR Brondby',
    gnewsCountry: "dk",
    googleNewsRss: googleNewsRss("Danish Superliga football", "DK"),
  },
  {
    slug: "norwegian-eliteserien",
    name: "Norwegian Eliteserien",
    country: "Norway",
    flag: "🇳🇴",
    keywords: [
      "eliteserien",
      "norwegian eliteserien",
      "bodo glimt",
      "bodø glimt",
      "molde",
      "rosenborg",
      "viking",
      "brann",
    ],
    gnewsQuery: 'Eliteserien OR "Bodo Glimt" OR Molde OR Rosenborg',
    gnewsCountry: "no",
    googleNewsRss: googleNewsRss("Eliteserien football Norway", "NO"),
  },
  {
    slug: "swedish-allsvenskan",
    name: "Swedish Allsvenskan",
    country: "Sweden",
    flag: "🇸🇪",
    keywords: [
      "allsvenskan",
      "swedish allsvenskan",
      "malmo ff",
      "malmö",
      "aik",
      "djurgarden",
      "djurgården",
      "hammarby",
      "ifk goteborg",
      "göteborg",
    ],
    gnewsQuery: "Allsvenskan OR Malmo OR AIK OR Hammarby OR Djurgarden",
    gnewsCountry: "se",
    googleNewsRss: googleNewsRss("Allsvenskan football Sweden", "SE"),
  },
];

export const LEAGUE_SLUGS = LEAGUE_NEWS_CONFIG.map((league) => league.slug);

const leagueBySlug = new Map(LEAGUE_NEWS_CONFIG.map((league) => [league.slug, league]));

export function getLeagueConfig(slug: LeagueSlug): LeagueNewsConfig {
  const league = leagueBySlug.get(slug);
  if (!league) throw new Error(`Unknown league slug: ${slug}`);
  return league;
}

export function isLeagueSlug(value: string): value is LeagueSlug {
  return leagueBySlug.has(value as LeagueSlug);
}

export function matchesLeagueArticle(
  title: string,
  description: string,
  slug: LeagueSlug
): boolean {
  const text = `${title} ${description}`.toLowerCase();
  const exclude = [
    "tennis",
    "f1",
    "formula 1",
    "cricket",
    "rugby union",
    "golf",
    "darts",
    "snooker",
    "boxing",
    "nba",
    "nfl",
    "horse racing",
    "motogp",
  ];
  if (exclude.some((kw) => text.includes(kw))) return false;

  const league = getLeagueConfig(slug);
  return league.keywords.some((kw) => text.includes(kw));
}

export function leagueSourceLabel(slug: LeagueSlug): string {
  const league = getLeagueConfig(slug);
  return `Google News · ${league.name}`;
}

export const ALL_LEAGUE_TOPICS = LEAGUE_SLUGS;

export type NewsTopic =
  | "all"
  | "european-leagues"
  | "transfers"
  | "kenyan-football"
  | LeagueSlug;

export const ALL_NEWS_TOPICS: NewsTopic[] = [
  "all",
  "european-leagues",
  "transfers",
  "kenyan-football",
  ...LEAGUE_SLUGS,
];

export function isNewsTopic(value: string): value is NewsTopic {
  return ALL_NEWS_TOPICS.includes(value as NewsTopic);
}

export function getNewsTopicFromParam(value?: string | null): NewsTopic {
  if (!value) return "european-leagues";
  if (isNewsTopic(value)) return value;
  return "european-leagues";
}

export function newsTopicLabel(topic: NewsTopic): string {
  if (topic === "all") return "All football news";
  if (topic === "european-leagues") return "European league news";
  if (topic === "kenyan-football") return "Kenyan football news";
  if (topic === "transfers") return "Transfer news";
  const league = LEAGUE_NEWS_CONFIG.find((item) => item.slug === topic);
  return league ? `${league.flag} ${league.name}` : "Football news";
}

export function matchesEuropeanLeagues(title: string, description: string): boolean {
  return LEAGUE_NEWS_CONFIG.some((league) =>
    matchesLeagueArticle(title, description, league.slug)
  );
}

export function leagueRssFeeds(): Array<{
  url: string;
  source: string;
  slug: LeagueSlug;
}> {
  return LEAGUE_NEWS_CONFIG.map((league) => ({
    url: league.googleNewsRss,
    source: leagueSourceLabel(league.slug),
    slug: league.slug,
  }));
}
