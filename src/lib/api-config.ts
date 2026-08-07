export type ConnectedApis = {
  gnews: boolean;
  footballData: boolean;
  cron: boolean;
  rss: boolean;
  youtube: boolean;
};

/** APIs currently configured for this deployment. */
export function getConnectedApis(): ConnectedApis {
  return {
    gnews: Boolean(process.env.GNEWS_API_KEY),
    footballData: Boolean(process.env.FOOTBALL_DATA_API_KEY),
    cron: Boolean(process.env.CRON_SECRET),
    rss: true,
    youtube: true,
  };
}

/** Data sources actively driving the site right now. */
export function getSiteControllers(): string[] {
  const apis = getConnectedApis();
  const controllers: string[] = [];

  if (apis.gnews) controllers.push("gnews");
  controllers.push("rss", "youtube");
  if (apis.footballData) controllers.push("football-data");
  else controllers.push("fallback-football");
  if (apis.cron) controllers.push("cron");

  return controllers;
}

export function isNewsApiConnected() {
  const apis = getConnectedApis();
  return apis.gnews || apis.rss || apis.youtube;
}
