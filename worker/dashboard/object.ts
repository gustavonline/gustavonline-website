/// <reference types="@cloudflare/workers-types" />

import {
  applyMetrics,
  applyMonday,
  DashboardDataError,
  DashboardInputError,
  parseDashboard,
  parseMetrics,
  parseMonday,
  seedDashboard,
  type Dashboard,
} from "./model";
import type { Env } from "../types";

const DOCUMENT_KEY = "document";

// One private document for the content KPI dashboard. Requests to a single
// object are serialized, so a Monday save cannot overwrite a concurrent edit.
export class ContentDashboard {
  constructor(private readonly ctx: DurableObjectState, _env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/document" && request.method === "GET") {
        return Response.json(await this.read());
      }
      if (url.pathname === "/monday" && request.method === "POST") {
        const next = applyMonday(await this.read(), parseMonday(await request.json()));
        await this.write(next);
        return Response.json({ ok: true });
      }
      if (url.pathname === "/metrics" && request.method === "POST") {
        const next = applyMetrics(await this.read(), parseMetrics(await request.json()));
        await this.write(next);
        return Response.json({ ok: true });
      }
      return new Response(null, { status: 404 });
    } catch (error) {
      if (error instanceof DashboardInputError) {
        return Response.json({ error: error.message }, { status: 400 });
      }
      console.error("dashboard_data_invalid");
      const message = error instanceof DashboardDataError ? "Dashboard-data kan ikke læses." : "Dashboard-data kan ikke læses.";
      return Response.json({ error: message }, { status: 500 });
    }
  }

  private async read(): Promise<Dashboard> {
    const stored = await this.ctx.storage.get<string>(DOCUMENT_KEY);
    if (!stored) return seedDashboard();
    return parseDashboard(JSON.parse(stored));
  }

  private async write(document: Dashboard): Promise<void> {
    await this.ctx.storage.put(DOCUMENT_KEY, JSON.stringify(document));
  }
}
