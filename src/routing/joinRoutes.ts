export function joinRoutes(base: string, route: string): string {
  const realBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const realRoute = route.startsWith("/") ? route : `/${route}`;

  const joinedUrl = realBase + realRoute;
  if (!joinedUrl.endsWith("/")) {
    if (!joinedUrl.includes("?")) {
      return `${joinedUrl}/`;
    }

    if (!joinedUrl.includes("/?")) {
      return joinedUrl.replace("?", "/?");
    }

    return joinedUrl;
  }

  return joinedUrl;
}
