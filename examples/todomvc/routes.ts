import { buildCreateRoute, XstateTreeHistory } from "@koordinates/xstate-tree";
import { createBrowserHistory } from "history";

export const history: XstateTreeHistory = createBrowserHistory();
const createRoute = buildCreateRoute(history, "/");

export const allTodos = createRoute.staticRoute()("/", "SHOW_ALL_TODOS");
export const activeTodos = createRoute.staticRoute()(
  "/active",
  "SHOW_ACTIVE_TODOS"
);
export const completedTodos = createRoute.staticRoute()(
  "/completed",
  "SHOW_COMPLETED_TODOS"
);

export const routes = [allTodos, activeTodos, completedTodos];
