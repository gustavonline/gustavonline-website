import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from "@tanstack/react-router";

import { App } from "./routes/App";

const staticRoute = new URLSearchParams(window.location.search).get("spa");
if (staticRoute === "/newsletter") {
  const basePath = window.location.pathname.replace(/\/+$/, "");
  window.history.replaceState(null, "", `${basePath}${staticRoute}${window.location.hash}`);
}

const rootRoute = createRootRoute();

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: App,
});

const newsletterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/newsletter",
  component: lazyRouteComponent(() => import("./routes/NewsletterApp"), "NewsletterApp"),
});

const routeTree = rootRoute.addChildren([indexRoute, newsletterRoute]);
const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
const routerBasepath =
  pathname === "/gustavonline" || pathname.startsWith("/gustavonline/")
    ? "/gustavonline"
    : "/";

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
