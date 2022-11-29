import { createMemoryHistory } from "history";

import { buildCreateRoute } from "../routing";

export const history = createMemoryHistory<any>();
const createRoute = buildCreateRoute(() => history, "/");
export const homeRoute = createRoute.route()({
  matcher(url, _query) {
    if (url === "/") {
      return { matchLength: 1 };
    }

    return false;
  },
  reverser: () => "/",
  event: "GO_HOME",
});
export const settingsRoute = createRoute.simpleRoute()({
  url: "/settings",
  event: "GO_SETTINGS",
});
