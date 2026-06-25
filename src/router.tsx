import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

import { App } from "./routes/App";

const rootRoute = createRootRoute();

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: App,
});

const routeTree = rootRoute.addChildren([indexRoute]);
const routerBasepath = window.location.pathname.startsWith("/gustavonline") ? "/gustavonline" : "/";

export const router = createRouter({
  routeTree,
  basepath: routerBasepath,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
