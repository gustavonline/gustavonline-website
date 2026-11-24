import { figtreeLatinWoff2 } from "./figtree-latin";
import {
  formatDaInteger,
  formatDaNumber,
  type Dashboard,
  type DashboardWeek,
  type SeriesPoint,
} from "./model";

const DAY_WORDS: Record<number, string> = {
  2: "to", 3: "tre", 4: "fire", 5: "fem", 6: "seks", 7: "syv", 8: "otte", 9: "ni", 10: "ti", 11: "elleve", 12: "tolv",
};

export function renderDashboard(doc: Dashboard, options: { saved?: boolean; error?: string | null } = {}): string {
  const activity = latestActivityWeek(doc);
  const logged = latestLoggedWeek(doc);
  const current = doc.weeks.find((week) => week.state === "current");
  const closed = [...doc.weeks].reverse().find((week) => week.state === "closed" && week.periodLabel);
  const formWeek = current ?? doc.weeks[doc.weeks.length - 1];
  const status = options.error ? options.error : options.saved ? "Ugen er gemt." : "";

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow, noarchive" />
  <title>gustavonline · Content dashboard</title>
  <script>${themeScript}</script>
  <style>${dashboardCss}</style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="titles">
        <div class="brand"><i></i>gustavonline</div>
        <h1>Content dashboard</h1>
      </div>
      <div class="meta">
        ${closed ? `${escapeHtml(`Uge ${closed.week} ${closed.stateLabel.toLowerCase()} · ${closed.periodLabel}`)}<br>` : ""}
        ${escapeHtml(`X-følgere nu er et øjebliksbillede, ${doc.xNow.label} · ${doc.timezone}`)}<br>
        ${current?.checkInLabel ? escapeHtml(`Uge ${current.week} udfyldes ${current.checkInLabel}`) : ""}
      </div>
      <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch to dark theme" aria-pressed="false">
        <span class="theme-toggle-icon" aria-hidden="true"></span>
      </button>
    </header>
    <main>
      <section class="kpis">
        ${heroCard(doc, activity)}
        ${activityCard("X visninger", activity, activity?.x?.impressions ?? null, activity ? `uge ${activity.week}` : "", activity?.x?.impressionsNote ?? null)}
        ${activityCard("X likes", activity, activity?.x?.likes ?? null, activity ? `Uge ${activity.week}` : "", null)}
        ${activityCard("X svar", activity, activity?.x?.replies ?? null, activity ? `Uge ${activity.week}` : "", null)}
        ${bookmarkCard(activity)}
      </section>
      <section class="row">
        <article class="card">
          <h2>Mål mod faktisk</h2>
          <div class="goal">
            ${followerGoal(doc)}
            ${logGoal(logged)}
            <div class="goal-item">
              <div class="goal-top"><span>Kadence (aftalt)</span><span>${escapeHtml(doc.cadence.label)}</span></div>
              <div class="bar"><i style="width:0%"></i></div>
              <div class="note">${escapeHtml(doc.cadence.note)}</div>
            </div>
          </div>
          <div class="weeks" aria-label="Ugentligt check-in">
            ${doc.weeks.map(weekChip).join("")}
          </div>
        </article>
        <article class="card">
          <h2>Følgerudvikling</h2>
          <div class="chart-box">${chart(doc.xSeries)}</div>
        </article>
      </section>
      <section class="row-3 channels">
        ${channelCard("LinkedIn", doc, "linkedin")}
        ${channelCard("Nyhedsbrev · Kit", doc, "newsletter")}
        ${channelCard("YouTube", doc, "youtube")}
      </section>
      <form method="post" action="/dashboard">
        <h2>Mandagslog</h2>
        <p>Udfyldes på kamera i mandagsreviewet. Kun disse fire tal gemmes her. Visninger, likes, svar, bogmærker, åbninger, klik og seertid sættes bagefter i samme datakilde.</p>
        <p class="status${options.error ? " error" : ""}" role="status" data-status>${escapeHtml(status)}</p>
        <div class="fields">
          <div><label for="week">Uge</label><input id="week" name="week" inputmode="numeric" autocomplete="off" value="${formWeek ? String(formWeek.week) : ""}" /></div>
          <div><label for="xFollowers">X-følgere</label><input id="xFollowers" name="xFollowers" inputmode="numeric" autocomplete="off" placeholder="—" /></div>
          <div><label for="linkedinFollowers">LI-følgere</label><input id="linkedinFollowers" name="linkedinFollowers" inputmode="numeric" autocomplete="off" placeholder="—" /></div>
          <div><label for="newsletterSubscribers">NB-abonnenter</label><input id="newsletterSubscribers" name="newsletterSubscribers" inputmode="numeric" autocomplete="off" placeholder="—" /></div>
          <div><label for="youtubeSubscribers">YT-abonnenter</label><input id="youtubeSubscribers" name="youtubeSubscribers" inputmode="numeric" autocomplete="off" placeholder="—" /></div>
        </div>
        ${formWeek ? `<input type="hidden" name="year" value="${formWeek.year}" />` : ""}
        <button type="submit">Gem ugen</button>
      </form>
    </main>
    <footer>${escapeHtml(footer(doc, activity))}</footer>
  </div>
  <script>${formScript}</script>
</body>
</html>`;
}

function heroCard(doc: Dashboard, activity: DashboardWeek | undefined): string {
  const delta = doc.xNow.followers - doc.baseline.followers;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  const deltaText = delta === 0
    ? `uændret siden baseline ${doc.baseline.label} (${formatDaInteger(doc.baseline.followers)})`
    : `${sign}${formatDaInteger(Math.abs(delta))} siden baseline ${doc.baseline.label} (${formatDaInteger(doc.baseline.followers)})`;
  return `<article class="card hero">
    <div class="label">X-følgere nu</div>
    <div class="value">${formatDaInteger(doc.xNow.followers)}</div>
    <div class="delta">${escapeHtml(deltaText)}</div>
    ${activity?.closingNote ? `<div class="note">${escapeHtml(activity.closingNote)}</div>` : ""}
  </article>`;
}

function activityCard(label: string, week: DashboardWeek | undefined, value: number | null, fallbackNote: string, note: string | null): string {
  if (!week || value === null) return emptyKpi(label);
  const shown = note ?? fallbackNote;
  return `<article class="card">
    <div class="label">${escapeHtml(label === "X visninger" ? `${label} · ${fallbackNote}` : label)}</div>
    <div class="value">${formatDaInteger(value)}</div>
    <div class="note">${escapeHtml(label === "X visninger" ? (note ?? fallbackNote) : shown)}</div>
  </article>`;
}

function emptyKpi(label: string): string {
  return `<article class="card empty"><div class="label">${escapeHtml(label)}</div><div class="value">Udfyldes</div></article>`;
}

function bookmarkCard(week: DashboardWeek | undefined): string {
  const bookmarks = week?.x?.bookmarks ?? null;
  const likes = week?.x?.likes ?? null;
  if (!week || bookmarks === null) return emptyKpi("X bogmærker");
  const note = likes !== null && likes > 0
    ? `${formatDaNumber((bookmarks / likes) * 100)} pr. 100 likes`
    : `Uge ${week.week}`;
  return `<article class="card"><div class="label">X bogmærker</div><div class="value">${formatDaInteger(bookmarks)}</div><div class="note">${escapeHtml(note)}</div></article>`;
}

function followerGoal(doc: Dashboard): string {
  const actual = doc.xNow.followers;
  const goal = doc.goals.xFollowers;
  const right = goal === null
    ? `${formatDaInteger(actual)} / ${formatDaInteger(doc.baseline.followers)} start`
    : `${formatDaInteger(actual)} / ${formatDaInteger(goal)}`;
  const width = goal === null
    ? (actual >= doc.baseline.followers ? 100 : doc.baseline.followers === 0 ? 0 : Math.min(100, Math.round((actual / doc.baseline.followers) * 100)))
    : (goal === 0 ? 0 : Math.min(100, Math.round((actual / goal) * 100)));
  return `<div class="goal-item">
    <div class="goal-top"><span>${goal === null ? "X-følgere siden baseline" : "X-følgere mod mål"}</span><span>${escapeHtml(right)}</span></div>
    <div class="bar"><i style="width:${width}%"></i></div>
    <div class="note">${escapeHtml(goalNote(doc))}</div>
  </div>`;
}

function goalNote(doc: Dashboard): string {
  if (doc.goals.xFollowers !== null) return `${formatDaInteger(doc.xNow.followers)} af målet ${formatDaInteger(doc.goals.xFollowers)}.`;
  const pending = "Intet følgermål er sat endnu — feltet nedenfor er til mandagsvideoen.";
  if (!doc.baseline.measuredOn || !doc.xNow.measuredOn || doc.baseline.followers === 0) return pending;
  const percent = Math.round(((doc.xNow.followers - doc.baseline.followers) / doc.baseline.followers) * 100);
  const days = calendarDays(doc.baseline.measuredOn, doc.xNow.measuredOn);
  const sign = percent > 0 ? "+" : percent < 0 ? "−" : "";
  return `${sign}${formatDaInteger(Math.abs(percent))} % ${daysPhrase(days)}. ${pending}`;
}

function logGoal(week: DashboardWeek | undefined): string {
  const channels = [
    ["X", week?.x?.followers],
    ["LI", week?.linkedin?.followers],
    ["nyhedsbrev", week?.newsletter?.subscribers],
    ["YouTube", week?.youtube?.subscribers],
  ] as const;
  const ready = channels.filter(([, value]) => typeof value === "number").map(([name]) => name);
  const missing = channels.filter(([, value]) => typeof value !== "number").map(([name]) => name);
  const text = ready.length === 0
    ? `${danishList(missing)} mangler`
    : missing.length === 0
      ? `${danishList(ready)} er udfyldt`
      : `${danishList(ready)} klar · ${danishList(missing)} mangler`;
  const width = Math.round((ready.length / channels.length) * 100);
  return `<div class="goal-item">
    <div class="goal-top"><span>Ugens log udfyldt</span><span>${escapeHtml(text)}</span></div>
    <div class="bar olive"><i style="width:${width}%"></i></div>
  </div>`;
}

function weekChip(week: DashboardWeek): string {
  const klass = week.state === "closed" ? " done" : week.state === "current" ? " now" : "";
  return `<div class="week${klass}"><b>Uge ${week.week}</b><span class="state">${escapeHtml(week.stateLabel)}</span></div>`;
}

function channelCard(label: string, doc: Dashboard, kind: "linkedin" | "newsletter" | "youtube"): string {
  const latest = latestChannelWeek(doc, kind);
  const goal = kind === "linkedin" ? doc.goals.linkedinFollowers : kind === "newsletter" ? doc.goals.newsletterSubscribers : doc.goals.youtubeSubscribers;
  const value = channelValue(latest, kind);
  if (value === null) {
    return `<article class="card empty"><div class="label">${escapeHtml(label)}</div><div class="value">Udfyldes</div><div class="note">${escapeHtml(emptyChannelNote(kind, goal))}</div></article>`;
  }
  return `<article class="card"><div class="label">${escapeHtml(label)}</div><div class="value">${formatDaInteger(value)}</div><div class="note">${escapeHtml(filledChannelNote(latest, kind, goal))}</div></article>`;
}

function emptyChannelNote(kind: "linkedin" | "newsletter" | "youtube", goal: number | null): string {
  const base = kind === "linkedin"
    ? "Følgere og ER i mandagsreviewet"
    : kind === "newsletter"
      ? "Abonnenter, åbnings- og klikrate. Kit MCP kræver betalt plan."
      : "Abonnenter, visninger og seertid · manuelt, ingen connector";
  return goal === null ? base : `${base} Mål ${formatDaInteger(goal)}.`;
}

function filledChannelNote(week: DashboardWeek | undefined, kind: "linkedin" | "newsletter" | "youtube", goal: number | null): string {
  const parts: string[] = [];
  if (kind === "linkedin") {
    parts.push("Følgere");
    if (typeof week?.linkedin?.impressions === "number") parts.push(`${formatDaInteger(week.linkedin.impressions)} visninger`);
  } else if (kind === "newsletter") {
    parts.push("Abonnenter");
    if (typeof week?.newsletter?.opens === "number") parts.push(`${formatDaInteger(week.newsletter.opens)} åbninger`);
    if (typeof week?.newsletter?.openRatePercent === "number") parts.push(`${formatDaNumber(week.newsletter.openRatePercent)} % åbning`);
    if (typeof week?.newsletter?.clicks === "number") parts.push(`${formatDaInteger(week.newsletter.clicks)} klik`);
  } else {
    parts.push("Abonnenter");
    if (typeof week?.youtube?.views === "number") parts.push(`${formatDaInteger(week.youtube.views)} visninger`);
    if (typeof week?.youtube?.watchTimeHours === "number") parts.push(`${formatDaNumber(week.youtube.watchTimeHours)} t seertid`);
  }
  if (goal !== null) parts.push(`mål ${formatDaInteger(goal)}`);
  return parts.join(" · ");
}

function channelValue(week: DashboardWeek | undefined, kind: "linkedin" | "newsletter" | "youtube"): number | null {
  if (kind === "linkedin") return week?.linkedin?.followers ?? null;
  if (kind === "newsletter") return week?.newsletter?.subscribers ?? null;
  return week?.youtube?.subscribers ?? null;
}

function chart(series: SeriesPoint[]): string {
  if (series.length === 0) return `<p class="note">Ingen måleserie endnu.</p>`;
  const left = 40;
  const right = 480;
  const yBase = 148;
  const yTop = 42;
  const values = series.map((point) => point.followers);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = series.map((point, index) => {
    const x = series.length === 1 ? (left + right) / 2 : left + (index * (right - left)) / (series.length - 1);
    const y = yBase - ((point.followers - min) / span) * (yBase - yTop);
    return { x, y, point };
  });
  const path = coords.map((item, index) => `${index === 0 ? "M" : "L"}${item.x.toFixed(1)},${item.y.toFixed(1)}`).join(" ");
  const dots = coords.map((item, index) => `<rect x="${(item.x - 3).toFixed(1)}" y="${(item.y - 3).toFixed(1)}" width="6" height="6" class="${index === coords.length - 1 ? "dot-last" : "dot"}"></rect>`).join("");
  const labels = coords.map((item) => `<text x="${item.x.toFixed(1)}" y="176" text-anchor="middle" class="chart-label">${escapeHtml(item.point.axisLabel)}</text>`).join("");
  const numbers = coords.map((item) => `<text x="${item.x.toFixed(1)}" y="${(item.y - 12).toFixed(1)}" text-anchor="middle" class="chart-value">${formatDaInteger(item.point.followers)}</text>`).join("");
  const label = `X-følgere ${danishList(series.map((point) => formatDaInteger(point.followers)))}`;
  return `<svg viewBox="0 0 520 180" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(label)}"><line x1="40" y1="160" x2="480" y2="160" class="axis"></line><path d="${path}" class="line"></path>${dots}${labels}${numbers}</svg>`;
}

function footer(doc: Dashboard, activity: DashboardWeek | undefined): string {
  const when = [doc.xNow.label, doc.xNow.partOfDay].filter(Boolean).join(" ");
  const x = activity?.x;
  const period = activity?.footerPeriod ?? activity?.periodLabel;
  const periodText = period ? (period.endsWith(".") ? period : `${period}.`) : "";
  const measured = x && periodText && x.followers !== null && x.impressions !== null && x.likes !== null && x.replies !== null && x.bookmarks !== null
    ? ` Uge ${activity.week} i Ugetal: ${formatDaInteger(x.followers)} følgere, ${formatDaInteger(x.impressions)} visninger, ${formatDaInteger(x.likes)} likes, ${formatDaInteger(x.replies)} svar, ${formatDaInteger(x.bookmarks)} bogmærker, periode ${periodText}`
    : "";
  const source = doc.sourceNote ? ` ${doc.sourceNote}` : "";
  return `Tal: offentligt X-følgertal ${formatDaInteger(doc.xNow.followers)} målt ${when}, ${doc.timezone}.${measured}${source}`;
}

function latestActivityWeek(doc: Dashboard): DashboardWeek | undefined {
  return [...doc.weeks].reverse().find((week) => week.x && [week.x.impressions, week.x.likes, week.x.replies, week.x.bookmarks].some((value) => typeof value === "number"));
}

function latestLoggedWeek(doc: Dashboard): DashboardWeek | undefined {
  return [...doc.weeks].reverse().find((week) => [week.x?.followers, week.linkedin?.followers, week.newsletter?.subscribers, week.youtube?.subscribers].some((value) => typeof value === "number"));
}

function latestChannelWeek(doc: Dashboard, kind: "linkedin" | "newsletter" | "youtube"): DashboardWeek | undefined {
  return [...doc.weeks].reverse().find((week) => channelValue(week, kind) !== null || channelDetail(week, kind));
}

function channelDetail(week: DashboardWeek, kind: "linkedin" | "newsletter" | "youtube"): boolean {
  if (kind === "linkedin") return typeof week.linkedin?.impressions === "number";
  if (kind === "newsletter") return [week.newsletter?.opens, week.newsletter?.openRatePercent, week.newsletter?.clicks].some((value) => typeof value === "number");
  return [week.youtube?.views, week.youtube?.watchTimeHours].some((value) => typeof value === "number");
}

function calendarDays(start: string, end: string): number {
  const [a, b, c] = start.split("-").map(Number);
  const [d, e, f] = end.split("-").map(Number);
  return Math.round((Date.UTC(d, e - 1, f) - Date.UTC(a, b - 1, c)) / 86_400_000);
}

function daysPhrase(days: number): string {
  if (days <= 0) return "i dag";
  if (days === 1) return "på én dag";
  return `på ${DAY_WORDS[days] ?? String(days)} dage`;
}

function danishList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} og ${items[items.length - 1]}`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

const themeScript = `(function () {
  var key = "gustavonline-theme";
  var requested = new URLSearchParams(location.search).get("theme");
  var theme = requested === "light" || requested === "dark" ? requested : null;
  if (!theme) {
    try {
      var saved = localStorage.getItem(key);
      if (saved === "dark" || saved === "light") theme = saved;
    } catch (e) {}
  }
  if (!theme) theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(key, theme); } catch (e) {}
  document.addEventListener("DOMContentLoaded", function () {
    var button = document.querySelector("[data-theme-toggle]");
    if (!button) return;
    var apply = function (next) {
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem(key, next); } catch (e) {}
      button.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
      button.setAttribute("aria-label", next === "light" ? "Switch to dark theme" : "Switch to light theme");
    };
    apply(document.documentElement.dataset.theme || "light");
    button.addEventListener("click", function () {
      apply(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });
  });
})();`;

const formScript = `(function () {
  var form = document.querySelector("form");
  if (!form) return;
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var status = form.querySelector("[data-status]");
    var data = new FormData(form);
    var body = {};
    ["week", "year", "xFollowers", "linkedinFollowers", "newsletterSubscribers", "youtubeSubscribers"].forEach(function (key) {
      var raw = String(data.get(key) || "").trim();
      if (!raw || raw === "—") return;
      if (!/^\\d+$/.test(raw)) { body[key] = raw; return; }
      body[key] = Number(raw);
    });
    if (status) status.textContent = "Gemmer…";
    fetch("/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body)
    }).then(function (response) {
      if (response.ok) { location.replace("/dashboard?saved=1"); return; }
      return response.json().then(function (payload) {
        if (status) status.textContent = (payload && payload.error) || "Kunne ikke gemmes.";
      });
    }).catch(function () {
      if (status) status.textContent = "Kunne ikke gemmes. Prøv igen.";
    });
  });
})();`;

const dashboardCss = `
@font-face{font-family:Figtree;src:url(data:font/woff2;base64,${figtreeLatinWoff2}) format("woff2");font-weight:300 900;font-style:normal;font-display:swap}
:root{color-scheme:light;--bg:#f5f6f5;--panel:#ffffff;--text:#1f1f1f;--muted:#717171;--faint:#dddfdd;--brand-orange:#ee7f3c;--link:var(--brand-orange);--accent:#616850;--font:Figtree,Arial,sans-serif}
:root[data-theme="dark"]{color-scheme:dark;--bg:#20201d;--panel:#262622;--text:#f3f0ea;--muted:#aba69c;--faint:#3b3933;--link:var(--brand-orange);--accent:#a5ab91}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--text);font-family:var(--font);font-synthesis:none;-webkit-font-smoothing:antialiased}
.wrap{max-width:1120px;margin:0 auto;padding:0 40px 48px}
header{display:flex;align-items:flex-end;gap:16px;padding:28px 0 20px;margin-bottom:28px;border-bottom:1px solid var(--faint)}
.titles{min-width:0}
.brand{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;letter-spacing:-0.035em;margin-bottom:8px}
.brand i{width:8px;height:8px;background:var(--brand-orange);border-radius:50%;display:inline-block;flex:none}
h1{font-size:34px;font-weight:500;letter-spacing:-0.025em;line-height:1.15}
.meta{margin-left:auto;color:var(--muted);font-size:13px;line-height:1.55;text-align:right}
.theme-toggle{width:44px;height:44px;display:grid;place-items:center;padding:0;border:0;border-radius:0;background:transparent;color:var(--muted);cursor:pointer}
.theme-toggle:hover,.theme-toggle:focus-visible{color:var(--brand-orange)}
.theme-toggle:focus-visible{outline:2px solid var(--brand-orange);outline-offset:0}
.theme-toggle-icon{display:block;width:17px;height:17px;border-radius:999px;box-shadow:inset -6px -4px 0 0 currentColor}
:root[data-theme="dark"] .theme-toggle-icon{background:currentColor;box-shadow:0 -8px 0 -6px currentColor,0 8px 0 -6px currentColor,8px 0 0 -6px currentColor,-8px 0 0 -6px currentColor,6px 6px 0 -6px currentColor,-6px -6px 0 -6px currentColor,6px -6px 0 -6px currentColor,-6px 6px 0 -6px currentColor}
.kpis{display:grid;grid-template-columns:1.25fr 1fr 1fr 1fr 1fr;gap:10px;margin-bottom:10px}
.card{background:var(--panel);border:1px solid var(--faint);border-radius:3px;padding:16px 16px 14px}
.card .label{font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);font-weight:700}
.card .value{font-size:36px;font-weight:500;letter-spacing:-0.03em;margin:8px 0 2px;line-height:1;font-variant-numeric:tabular-nums}
.card.hero .value{font-size:44px}
.card .delta{font-size:13px;color:var(--accent);font-weight:500}
.card .note,.goal .note{font-size:12px;color:var(--muted);margin-top:6px;line-height:1.45}
.card.empty .value{color:var(--muted);font-size:22px;font-weight:400;letter-spacing:-0.02em}
.row{display:grid;grid-template-columns:1.1fr 0.9fr;gap:10px;margin-bottom:10px}
.row-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px}
h2{font-size:15px;font-weight:500;letter-spacing:-0.02em;margin-bottom:14px}
.goal{display:flex;flex-direction:column;gap:14px}
.goal-top{display:flex;justify-content:space-between;gap:12px;font-size:13px;margin-bottom:6px}
.goal-top span:last-child{color:var(--muted);text-align:right}
.bar{height:4px;background:var(--faint);overflow:hidden}
.bar>i{display:block;height:100%;background:var(--text)}
.bar.olive>i{background:var(--accent)}
.weeks{display:flex;gap:8px;margin-top:20px;flex-wrap:wrap}
.week{flex:1;min-width:120px;text-align:left;border:1px solid var(--faint);border-radius:3px;padding:10px 12px;background:var(--panel);font-size:12px;color:var(--muted)}
.week b{display:block;font-size:13px;font-weight:500;color:var(--text);margin-bottom:3px;letter-spacing:-0.02em}
.week.done{border-left:3px solid var(--brand-orange);padding-left:10px}
.week.done .state{color:var(--accent)}
.week.now{border-color:var(--text)}
.chart-box{height:176px}
svg{width:100%;height:100%;overflow:visible}
.axis{stroke:var(--faint);stroke-width:1}
.line{fill:none;stroke:var(--text);stroke-width:1.5;stroke-linejoin:miter}
.dot{fill:var(--text)}
.dot-last{fill:var(--brand-orange)}
.chart-label{fill:var(--muted);font-size:11px;font-family:Figtree,Arial,sans-serif}
.chart-value{fill:var(--text);font-size:12px;font-weight:500;font-family:Figtree,Arial,sans-serif}
form{background:var(--panel);border:1px solid var(--faint);border-left:3px solid var(--brand-orange);border-radius:3px;padding:18px 20px 16px}
form h2{margin-bottom:4px}
form p{color:var(--muted);font-size:13px;line-height:1.5;margin-bottom:16px}
form .status:empty{display:none}
form .status{color:var(--accent);margin-bottom:12px}
form .status.error{color:var(--text)}
.fields{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:var(--muted);font-weight:700;margin-bottom:6px}
input{width:100%;border:1px solid var(--faint);border-radius:3px;min-height:44px;padding:0 12px;font:inherit;font-size:16px;background:var(--panel);color:var(--text);outline:none}
input:focus{border-color:var(--brand-orange)}
button[type="submit"]{margin-top:14px;background:var(--text);color:var(--bg);border:1px solid var(--text);border-radius:3px;min-height:44px;padding:0 18px;font-family:var(--font);font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer}
button[type="submit"]:focus-visible,.theme-toggle:focus-visible,input:focus-visible{outline:2px solid var(--link);outline-offset:3px}
footer{margin-top:22px;padding-top:16px;border-top:1px solid var(--faint);color:var(--muted);font-size:12px;line-height:1.55}
@media(max-width:980px){
  .kpis,.row,.row-3,.fields{grid-template-columns:1fr 1fr}
  .kpis .hero,.row .card:first-child{grid-column:1 / -1}
}
@media(max-width:640px){
  .wrap{padding:0 20px 32px}
  header{flex-direction:column;align-items:stretch}
  .meta{margin-left:0;text-align:left}
  .theme-toggle{align-self:flex-end}
  h1{font-size:30px}
  .kpis,.row,.row-3,.fields{grid-template-columns:1fr}
}
`;
