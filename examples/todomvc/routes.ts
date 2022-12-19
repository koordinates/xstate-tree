import { buildCreateRoute, XstateTreeHistory } from "@koordinates/xstate-tree";
import { createBrowserHistory } from "history";

export const history: XstateTreeHistory = createBrowserHistory();
const createRoute = buildCreateRoute(() => history, "/");

export const allTodos = createRoute.simpleRoute()({
  url: "/",
  event: "SHOW_ALL_TODOS",
});
export const activeTodos = createRoute.simpleRoute()({
  url: "/active",
  event: "SHOW_ACTIVE_TODOS",
});
export const completedTodos = createRoute.simpleRoute()({
  url: "/completed",
  event: "SHOW_COMPLETED_TODOS",
});

export const routes = [allTodos, activeTodos, completedTodos];
