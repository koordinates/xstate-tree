import { buildRootComponent } from "@koordinates/xstate-tree";
import React from "react";
import { createRoot } from "react-dom/client";

import { TodoApp } from "./App";
import { routes, history } from "./routes";

const appRoot = document.getElementById("root");
const root = createRoot(appRoot!);
const App = buildRootComponent(TodoApp, {
  basePath: "/",
  history,
  routes,
});

root.render(<App />);
