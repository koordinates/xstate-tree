import { createMemoryHistory } from "history";

import { buildCreateRoute } from "../routing";

export const history = createMemoryHistory<any>();
const createRoute = buildCreateRoute(history, "/");
export const homeRoute = createRoute.dynamicRoute()({
  matches: (url) => {
    if (url === "/") {
      return {};
    }
    return false;
  },
  reverse: () => "/",
  event: "GO_HOME",
});
export const settingsRoute = createRoute.staticRoute()(
  "/settings",
  "GO_SETTINGS"
);
