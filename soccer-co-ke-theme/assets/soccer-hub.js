/* soccer.co.ke Shopify theme — live news + World Cup APIs */

(function () {
  const WC = "https://worldcup26.ir/get";

  function qs(root, sel) {
    return root.querySelector(sel);
  }

  function qsa(root, sel) {
    return Array.from(root.querySelectorAll(sel));
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  function parseStatus(finished, elapsed) {
    const e = (elapsed || "").toLowerCase();
    if (finished === "TRUE" || e === "finished") return "FINISHED";
    if (e && e !== "notstarted" && e !== "finished") return "LIVE";
    return "SCHEDULED";
  }

  function parseScore(val, status) {
    if (status === "SCHEDULED") return null;
    const n = parseInt(val, 10);
    return Number.isNaN(n) ? null : n;
  }

  function renderNews(container, articles) {
    if (!articles.length) {
      container.innerHTML =
        '<p class="soccer-empty">No news right now. Check back shortly.</p>';
      return;
    }

    const html = articles
      .map(function (a, i) {
        const featured = i === 0 ? " soccer-news-card--featured" : "";
        const img = a.image
          ? '<img src="' +
            esc(a.image) +
            '" alt="" class="soccer-news-card__img" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">'
          : '<div class="soccer-news-card__placeholder">⚽</div>';
        return (
          '<a href="' +
          esc(a.link) +
          '" target="_blank" rel="noopener" class="soccer-news-card' +
          featured +
          '">' +
          '<div class="soccer-news-card__media">' +
          img +
          "</div>" +
          '<div class="soccer-news-card__body">' +
          '<span class="soccer-news-card__source">' +
          esc(a.source) +
          "</span>" +
          '<span class="soccer-news-card__date">' +
          fmtDate(a.pubDate) +
          "</span>" +
          "<h3>" +
          esc(a.title) +
          "</h3>" +
          (a.description ? "<p>" + esc(a.description) + "</p>" : "") +
          "</div></a>"
        );
      })
      .join("");

    container.innerHTML = '<div class="soccer-news-grid">' + html + "</div>";
  }

  async function loadNews(section) {
    const apiBase = section.dataset.apiBase || "https://soccercoke-alpha.vercel.app";
    const limit = section.dataset.limit || "12";
    const grid = qs(section, "[data-soccer-news-grid]");
    const status = qs(section, "[data-soccer-news-status]");
    if (!grid) return;

    try {
      if (status) status.textContent = "Loading news from BBC, Guardian, ESPN, GNews…";
      const res = await fetch(apiBase + "/api/news?limit=" + limit);
      if (!res.ok) throw new Error("News API " + res.status);
      const data = await res.json();
      renderNews(grid, data.articles || []);
      if (status) {
        status.textContent =
          (data.count || 0) +
          " stories · " +
          (data.sources ? data.sources.length : 0) +
          " sources · updated live";
      }
    } catch (err) {
      grid.innerHTML =
        '<p class="soccer-empty">Could not load news. ' + esc(String(err)) + "</p>";
      if (status) status.textContent = "News temporarily unavailable";
    }
  }

  function matchHtml(m) {
    const live = m.status === "LIVE";
    const badge = live
      ? '<span class="soccer-badge soccer-badge--live">LIVE</span>'
      : m.status === "FINISHED"
        ? '<span class="soccer-badge">FT</span>'
        : '<span class="soccer-badge">' +
          fmtDate(m.date).split(",")[1] +
          "</span>";
    const score =
      m.homeScore !== null
        ? '<span class="soccer-score">' + m.homeScore + " – " + m.awayScore + "</span>"
        : '<span class="soccer-score soccer-score--vs">vs</span>';

    return (
      '<div class="soccer-match' +
      (live ? " soccer-match--live" : "") +
      '">' +
      badge +
      '<div class="soccer-match__teams">' +
      '<div class="soccer-match__team"><img src="' +
      esc(m.homeFlag) +
      '" alt="" width="24" height="16"><span>' +
      esc(m.homeTeam) +
      "</span></div>" +
      score +
      '<div class="soccer-match__team soccer-match__team--away"><img src="' +
      esc(m.awayFlag) +
      '" alt="" width="24" height="16"><span>' +
      esc(m.awayTeam) +
      "</span></div>" +
      "</div>" +
      '<div class="soccer-match__meta">Group ' +
      esc(m.group) +
      " · MD " +
      esc(m.matchday) +
      "</div></div>"
    );
  }

  function groupTableHtml(groups) {
    return groups
      .slice(0, 8)
      .map(function (g) {
        const rows = g.rows
          .map(function (r) {
            return (
              "<tr><td>" +
              esc(r.team.name) +
              "</td><td>" +
              r.played +
              "</td><td>" +
              r.won +
              "</td><td>" +
              r.draw +
              "</td><td>" +
              r.lost +
              "</td><td>" +
              r.goalsFor +
              ":" +
              r.goalsAgainst +
              "</td><td><strong>" +
              r.points +
              "</strong></td></tr>"
            );
          })
          .join("");
        return (
          '<div class="soccer-group"><h4>Group ' +
          esc(g.name) +
          '</h4><table><thead><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>' +
          rows +
          "</tbody></table></div>"
        );
      })
      .join("");
  }

  async function loadWorldCup(section) {
    const mode = section.dataset.mode || "preview";
    const matchesEl = qs(section, "[data-soccer-wc-matches]");
    const groupsEl = qs(section, "[data-soccer-wc-groups]");
    const status = qs(section, "[data-soccer-wc-status]");
    if (!matchesEl) return;

    try {
      if (status) status.textContent = "Loading World Cup 2026 data…";
      const [teamsRes, groupsRes, gamesRes] = await Promise.all([
        fetch(WC + "/teams"),
        fetch(WC + "/groups"),
        fetch(WC + "/games"),
      ]);
      if (!teamsRes.ok || !groupsRes.ok || !gamesRes.ok) {
        throw new Error("World Cup API unavailable");
      }

      const teamsJson = await teamsRes.json();
      const groupsJson = await groupsRes.json();
      const gamesJson = await gamesRes.json();

      const teamMap = {};
      (teamsJson.teams || []).forEach(function (t) {
        teamMap[t.id] = {
          name: t.name_en,
          flag: t.flag,
        };
      });

      const matches = (gamesJson.games || [])
        .map(function (g) {
          const status = parseStatus(g.finished, g.time_elapsed);
          const parts = (g.local_date || "").split(" ");
          const d = parts[0] ? parts[0].split("/") : [];
          const t = parts[1] ? parts[1].split(":") : [];
          const date =
            d.length === 3
              ? new Date(+d[2], +d[0] - 1, +d[1], +(t[0] || 0), +(t[1] || 0)).toISOString()
              : new Date().toISOString();
          return {
            homeTeam: g.home_team_name_en || g.home_team_label || "TBD",
            awayTeam: g.away_team_name_en || g.away_team_label || "TBD",
            homeFlag: (teamMap[g.home_team_id] || {}).flag || "https://flagcdn.com/w80/un.png",
            awayFlag: (teamMap[g.away_team_id] || {}).flag || "https://flagcdn.com/w80/un.png",
            homeScore: parseScore(g.home_score, status),
            awayScore: parseScore(g.away_score, status),
            group: g.group,
            matchday: g.matchday,
            date: date,
            status: status,
          };
        })
        .sort(function (a, b) {
          return new Date(a.date) - new Date(b.date);
        });

      const live = matches.filter(function (m) {
        return m.status === "LIVE";
      });
      const today = new Date();
      const todayM = matches.filter(function (m) {
        const d = new Date(m.date);
        return (
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate()
        );
      });
      const show =
        live.length > 0
          ? live
          : todayM.length > 0
            ? todayM
            : matches.filter(function (m) {
                return m.status === "SCHEDULED";
              }).slice(0, mode === "full" ? 20 : 6);

      matchesEl.innerHTML =
        show.length > 0
          ? show.map(matchHtml).join("")
          : '<p class="soccer-empty">No matches scheduled right now.</p>';

      if (groupsEl && mode === "full") {
        const built = (groupsJson.groups || [])
          .sort(function (a, b) {
            return a.name.localeCompare(b.name);
          })
          .map(function (g) {
            return {
              name: g.name,
              rows: (g.teams || [])
                .map(function (row) {
                  const team = teamMap[row.team_id];
                  if (!team) return null;
                  return {
                    team: team,
                    played: parseInt(row.mp, 10),
                    won: parseInt(row.w, 10),
                    draw: parseInt(row.d, 10),
                    lost: parseInt(row.l, 10),
                    goalsFor: parseInt(row.gf, 10),
                    goalsAgainst: parseInt(row.ga, 10),
                    points: parseInt(row.pts, 10),
                  };
                })
                .filter(Boolean)
                .sort(function (a, b) {
                  return b.points - a.points;
                }),
            };
          });
        groupsEl.innerHTML =
          '<div class="soccer-groups-grid">' + groupTableHtml(built) + "</div>";
      } else if (groupsEl) {
        groupsEl.innerHTML = "";
      }

      if (status) {
        status.textContent =
          live.length > 0
            ? live.length + " live now · worldcup26.ir"
            : "World Cup 2026 · worldcup26.ir · auto-updates";
      }
    } catch (err) {
      matchesEl.innerHTML =
        '<p class="soccer-empty">Could not load World Cup data. ' + esc(String(err)) + "</p>";
      if (status) status.textContent = "Scores temporarily unavailable";
    }
  }

  function initSection(section) {
    if (section.dataset.soccerNews !== undefined) {
      loadNews(section);
    }
    if (section.dataset.soccerWorldcup !== undefined) {
      loadWorldCup(section);
      setInterval(function () {
        loadWorldCup(section);
      }, 60000);
    }
  }

  function init() {
    document.querySelectorAll("[data-soccer-news], [data-soccer-worldcup]").forEach(initSection);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
