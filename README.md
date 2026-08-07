# Premier League Hub — soccer.co.ke

A modern Premier League website — **100% free forever**, no credit card, no payment ever.

## Features

- **League Table** — Full standings with form, goal difference, and European/relegation zones
- **Fixtures & Results** — Upcoming matches and full-time scores
- **Top Scorers** — Golden boot race with goals, assists, and penalties
- **Teams** — All 20 clubs with crests and venues
- **News** — Auto-fetched from **free RSS feeds** (BBC, Sky Sports, Guardian, Goal.com)
- **Optional GNews.io** — Extra headlines on the free tier (100 req/day)
- **JSON API** — `/api/news` endpoint for programmatic access

## 100% Free Data Sources

| What | Source | Cost | API key? |
|------|--------|------|----------|
| **News** | RSS feeds (BBC, Sky, Guardian, Goal) | Free forever | No |
| **Extra news** | [GNews.io](https://gnews.io) | Free 100 req/day | Optional |
| **Tables & scores** | [football-data.org](https://www.football-data.org) | Free forever | Optional |

News works **immediately with zero setup** via RSS. No signup required.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Optional free API keys

Only add these if you want live table data or extra news from GNews.io:

```bash
cp .env.example .env.local
```

| Variable | Sign up (free, no card) |
|----------|-------------------------|
| `FOOTBALL_DATA_API_KEY` | [football-data.org/client/register](https://www.football-data.org/client/register) |
| `GNEWS_API_KEY` | [gnews.io/register](https://gnews.io/register) |
| `CRON_SECRET` | Any long random string — protects the autopilot refresh endpoint |

### Autopilot (self-updating)

The site keeps itself fresh without manual deploys:

| Piece | What it does |
|-------|----------------|
| **Site Autopilot** | Refreshes server-rendered pages when their data is stale |
| **Live feeds** | News, transfers and Kenya feeds refresh every 2 minutes with last-known-good recovery |
| **Cron** | Authenticated `/api/cron/refresh` runs twice daily on Vercel Hobby |
| **Pulse** | `/api/pulse` shows last update status |

On Vercel: set `CRON_SECRET` and redeploy — Vercel Cron calls the refresh route automatically.
On a VPS, schedule an authenticated refresh:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/refresh
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with table preview, fixtures, results, news |
| `/standings` | Full league table |
| `/fixtures` | Upcoming matches |
| `/results` | Match results |
| `/scorers` | Top goal scorers |
| `/teams` | All clubs |
| `/news` | Latest headlines |
| `/api/news` | JSON news feed |

## Deploy

```bash
npm run build
npm start
```

Live site: [soccercoke.vercel.app](https://soccercoke-alpha.vercel.app)
