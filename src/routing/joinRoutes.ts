export function joinRoutes(base: string, route: string): string {
  const realBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const realRoute = route.startsWith("/") ? route : `/${route}`;

  return realBase + (realRoute.endsWith("/") ? realRoute : `${realRoute}/`);
}
