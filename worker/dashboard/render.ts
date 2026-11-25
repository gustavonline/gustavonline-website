import { figtreeLatinWoff2 } from "./figtree-latin";
import { formatCompact, formatDate, formatDay, formatExact, formatInteger, formatLongDate, formatValue, formatWeekday, safeTimezone, type Unit } from "./format";
import type { Dashboard } from "./model";
import { summarize, type Delta, type PlatformCard, type PlatformDetails, type Reading, type Summary, type Trend } from "./summary";

const NO_DATA = "No data yet";

// Every word on the page is written here. Free text in the stored document (labels, notes, cadence) is
// left out, because documents saved before this version hold Danish copy.
export function renderDashboard(doc: Dashboard, options: { saved?: boolean; error?: string | null; now?: Date } = {}): string {
  const summary = summarize(doc, options.now ?? new Date());
  const status = options.error ? options.error : options.saved ? "Week saved." : "";

  return `<!DOCTYPE html>
<html lang="en">
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
      <p class="meta">${formatWeekday(summary.today)} ${formatLongDate(summary.today)} · week ${summary.week}</p>
      <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch to dark theme" aria-pressed="false">
        <span class="theme-toggle-icon" aria-hidden="true"></span>
      </button>
    </header>
    <main>
      ${status ? `<p class="status${options.error ? " error" : ""}" role="status">${escapeHtml(status)}</p>` : ""}
      <section aria-labelledby="overview">
        <h2 id="overview">Overview</h2>
        <div class="cards">${summary.cards.map(platformCard).join("")}</div>
      </section>
      <section aria-labelledby="details">
        <h2 id="details">Platform details</h2>
        <div class="panels">${summary.details.map(detailPanel).join("")}</div>
      </section>
      <div class="row">
        ${mondayReview(summary.review)}
        ${trendPanel(summary.trend)}
      </div>
    </main>
    <footer>${escapeHtml(footer(doc))}</footer>
  </div>
</body>
</html>`;
}

function platformCard(card: PlatformCard): string {
  return `<article class="card" data-platform="${card.key}">
    <h3>${escapeHtml(card.name)}</h3>
    ${card.readings.map((reading, index) => headline(reading, index === 0 ? card.goal : null)).join("")}
  </article>`;
}

function headline(reading: Reading, goal: PlatformCard["goal"]): string {
  const shown = reading.value === null
    ? `<p class="none">${NO_DATA}</p>`
    : `<p class="value">${number(reading.value, reading.unit)}</p>
      ${reading.delta ? `<p class="change${tone(reading.delta)}">${changeText(reading.delta)} <span>vs. previous week</span></p>` : ""}
      <p class="period">${escapeHtml(reading.period ?? "")}</p>
      ${goal ? `<div class="goal"><div class="bar"><i style="width:${Math.min(100, goal.percent)}%"></i></div><p>${formatInteger(goal.percent)}% of goal ${number(goal.target, "count")}</p></div>` : ""}`;
  return `<div class="headline"><p class="label">${escapeHtml(reading.label)}</p>${shown}</div>`;
}

function detailPanel(panel: PlatformDetails): string {
  const period = panel.period ? `<span class="period">${escapeHtml(panel.period)}${panel.partial ? " · partial week" : ""}</span>` : "";
  const body = panel.readings.length === 0
    ? `<div class="none-block"><p class="none">${NO_DATA}</p><p class="hint">${escapeHtml(panel.labels.join(" · "))}</p></div>`
    : `<dl>${panel.readings.map((reading) => `<div class="metric"><dt>${escapeHtml(reading.label)}${ownPeriod(reading, panel)}</dt><dd>${metricValue(reading)}</dd></div>`).join("")}</dl>`;
  return `<div class="panel"><article class="card" data-details="${panel.key}"><div class="card-top"><h3>${escapeHtml(panel.name)}</h3>${period}</div>${body}</article></div>`;
}

// A standing count can be newer than the week the rest of the panel shows.
function ownPeriod(reading: Reading, panel: PlatformDetails): string {
  return reading.period && reading.period !== panel.period ? ` <span class="own">${escapeHtml(reading.period)}</span>` : "";
}

function metricValue(reading: Reading): string {
  if (reading.value === null) return `<span class="none">${NO_DATA}</span>`;
  const change = reading.delta ? `<span class="change${tone(reading.delta)}">${changeText(reading.delta)}</span>` : "";
  return `${change}<b>${number(reading.value, reading.unit)}</b>`;
}

function mondayReview(review: Summary["review"]): string {
  const span = `${formatWeekday(review.monday)} ${formatDay(review.monday)} – ${formatWeekday(review.sunday)} ${formatDate(review.sunday)}`;
  return `<section class="card review" aria-labelledby="review">
    <h2 id="review">Monday review — week of ${formatLongDate(review.monday)}</h2>
    <p class="sub">${span} · week ${review.week}${review.partial ? " · partial week" : ""}</p>
    <table>
      <thead><tr><th scope="col">Metric</th><th scope="col">Week ${review.week}</th><th scope="col">Week ${review.previousWeek}</th><th scope="col">Change</th></tr></thead>
      ${review.platforms.map(reviewGroup).join("")}
    </table>
  </section>`;
}

function reviewGroup(platform: Summary["review"]["platforms"][number]): string {
  const name = escapeHtml(platform.name);
  if (!platform.rows) return `<tbody><tr class="group"><th scope="rowgroup">${name}</th><td colspan="3"><span class="none">${NO_DATA}</span></td></tr></tbody>`;
  return `<tbody><tr class="group"><th scope="rowgroup" colspan="4">${name}</th></tr>${platform.rows.map((row) => `<tr>
    <th scope="row">${escapeHtml(row.label)}</th>
    <td>${row.value === null ? `<span class="none">${NO_DATA}</span>` : `<b>${number(row.value, row.unit)}</b>`}</td>
    <td>${row.previous === null ? blank() : number(row.previous, row.unit)}</td>
    <td>${row.delta ? `<span class="change${tone(row.delta)}">${changeText(row.delta)}</span>` : blank()}</td>
  </tr>`).join("")}</tbody>`;
}

function blank(): string {
  return `<span class="blank" aria-label="${NO_DATA}">–</span>`;
}

function trendPanel(trend: Trend): string {
  const since = trend.since
    ? `<p class="sub">${trend.since.amount === 0 ? "No change" : signedNumber(trend.since.amount, "count")} since ${trend.since.from} (${formatCompact(trend.since.start)})</p>`
    : "";
  return `<section class="card trend" aria-labelledby="trend">
    <h2 id="trend">X followers over time</h2>
    ${since}
    ${trend.points.length === 0 ? `<p class="none">${NO_DATA}</p>` : chart(trend)}
  </section>`;
}

function chart({ points }: Trend): string {
  const values = points.map((point) => point.followers);
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const labelled = labelledPoints(points.map((point) => point.position));
  const placed = points.map((point, index) => ({
    ...point,
    left: (point.position * 100).toFixed(2),
    top: ((1 - (point.followers - min) / span) * 100).toFixed(2),
    edge: points.length === 1 ? "" : index === 0 ? " start" : index === points.length - 1 ? " end" : point.followers < points[index + 1].followers ? " before" : " after",
    labelled: labelled.has(index),
    last: index === points.length - 1,
  }));
  const line = placed.map((point) => `${point.left},${point.top}`).join(" ");
  const described = points.map((point) => `${formatInteger(point.followers)}${point.label ? ` on ${point.label}` : ""}`).join(", ");
  return `<div class="chart" role="img" aria-label="${escapeHtml(`X followers: ${described}`)}">
      <div class="plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${line}" class="line"></polyline></svg>
        ${placed.map((point) => `<i class="dot${point.last ? " last" : ""}" style="left:${point.left}%;top:${point.top}%"></i>${point.labelled ? `<span class="point${point.edge}" style="left:${point.left}%;top:${point.top}%">${formatCompact(point.followers)}</span>` : ""}`).join("")}
      </div>
      <div class="axis">${placed.map((point) => point.labelled && point.label ? `<span class="${point.edge.trim()}" style="left:${point.left}%">${point.label}</span>` : "").join("")}</div>
    </div>`;
}

// First and last are always labelled; the ones between only where the text has room.
function labelledPoints(positions: number[]): Set<number> {
  const gap = 0.2;
  const last = positions.length - 1;
  const shown = new Set([0, last]);
  let previous = positions[0];
  for (let index = 1; index < last; index += 1) {
    if (positions[index] - previous < gap || positions[last] - positions[index] < gap) continue;
    shown.add(index);
    previous = positions[index];
  }
  return shown;
}

function footer(doc: Dashboard): string {
  const measured = doc.xNow.measuredOn ? ` X followers were last counted publicly on ${formatDate(doc.xNow.measuredOn)}.` : "";
  return `Weeks run Monday to Sunday, ${safeTimezone(doc.timezone)}.${measured} Only counted numbers are shown. Changes are left out when a week is still running or only partly counted.`;
}

function number(value: number, unit: Unit): string {
  return `<span title="${formatExact(value, unit)}">${formatValue(value, unit)}</span>`;
}

function changeText(delta: Delta): string {
  if (Math.round(delta.amount * 10) === 0) return "No change";
  const amount = signedNumber(delta.amount, delta.unit);
  return delta.percent === null ? amount : `${amount} (${delta.percent > 0 ? "+" : ""}${formatInteger(delta.percent)}%)`;
}

function signedNumber(value: number, unit: Unit): string {
  const text = unit === "percent" ? `${formatCompact(value)} pts` : formatValue(value, unit);
  return value > 0 ? `+${text}` : text;
}

function tone(delta: Delta): string {
  return Math.round(delta.amount * 10) > 0 ? " up" : "";
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
.theme-toggle{margin:0 -13px -8px 0;width:44px;height:44px;display:grid;place-items:center;padding:0;border:0;border-radius:0;background:transparent;color:var(--muted);cursor:pointer}
.theme-toggle:hover,.theme-toggle:focus-visible{color:var(--brand-orange)}
.theme-toggle:focus-visible{outline:2px solid var(--brand-orange);outline-offset:0}
.theme-toggle-icon{display:block;width:17px;height:17px;border-radius:999px;box-shadow:inset -6px -4px 0 0 currentColor}
:root[data-theme="dark"] .theme-toggle-icon{background:currentColor;box-shadow:0 -8px 0 -6px currentColor,0 8px 0 -6px currentColor,8px 0 0 -6px currentColor,-8px 0 0 -6px currentColor,6px 6px 0 -6px currentColor,-6px -6px 0 -6px currentColor,6px -6px 0 -6px currentColor,-6px 6px 0 -6px currentColor}
main{display:grid;gap:36px}
.status{padding:12px 16px;border:1px solid var(--faint);border-radius:3px;background:var(--panel);color:var(--accent);font-size:14px}
.status.error{color:var(--text)}
h2{font-size:18px;font-weight:500;letter-spacing:-0.02em;line-height:1.3;margin-bottom:14px}
h3{font-size:15px;font-weight:600;letter-spacing:-0.02em;line-height:1.3}
.card{min-width:0;background:var(--panel);border:1px solid var(--faint);border-radius:3px;padding:18px 20px}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.cards .card{display:grid;grid-row:span 3;grid-template-rows:subgrid;row-gap:0}
.panels{columns:2;column-gap:12px;margin-bottom:-12px}
.panel{break-inside:avoid;padding-bottom:12px}
.row{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:12px}
.headline{margin-top:14px;padding-top:14px;border-top:1px solid var(--faint)}
.label{font-size:13px;color:var(--muted);line-height:1.4}
.value{font-size:34px;font-weight:500;letter-spacing:-0.03em;line-height:1.1;margin:4px 0 6px;font-variant-numeric:tabular-nums}
.change{font-size:13px;line-height:1.45;color:var(--muted);font-variant-numeric:tabular-nums}
.change.up{color:var(--accent);font-weight:500}
.change>span{color:var(--muted);font-weight:400}
.period{font-size:13px;line-height:1.45;color:var(--muted)}
.none{font-size:14px;line-height:1.45;color:var(--muted)}
.headline .none{margin-top:8px}
.blank{color:var(--muted)}
.goal{margin-top:10px;font-size:13px;color:var(--muted)}
.bar{height:4px;background:var(--faint);overflow:hidden;margin-bottom:6px}
.bar>i{display:block;height:100%;background:var(--text)}
.card-top{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:10px}
.metric{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:9px 0;border-top:1px solid var(--faint);font-size:14px;line-height:1.4}
.metric:last-child{padding-bottom:0}
dt{color:var(--muted)}
.own{display:block;font-size:13px}
dd{display:flex;align-items:baseline;justify-content:flex-end;gap:10px;text-align:right}
dd b{min-width:58px}
dd b,td b{font-size:15px;font-weight:500;font-variant-numeric:tabular-nums}
.none-block{border-top:1px solid var(--faint);padding-top:12px}
.hint{margin-top:4px;font-size:13px;line-height:1.5;color:var(--muted)}
.row h2{margin-bottom:2px}
.sub{font-size:13px;line-height:1.5;color:var(--muted);margin-bottom:12px}
table{width:100%;border-collapse:collapse;font-size:14px;line-height:1.4;font-variant-numeric:tabular-nums}
th,td{padding:8px 0 8px 12px;text-align:right;font-weight:400;border-top:1px solid var(--faint);vertical-align:baseline}
th:first-child{padding-left:0;text-align:left}
thead th{white-space:nowrap;font-size:13px;color:var(--muted);border-top:0}
tbody th[scope="row"]{color:var(--muted)}
.group th{font-weight:600;letter-spacing:-0.02em}
.trend{display:flex;flex-direction:column}
.chart{flex:1;display:flex;flex-direction:column;min-height:200px;padding-top:26px}
.plot{position:relative;flex:1;min-height:140px;max-height:300px;margin:0 4px}
.plot svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.line{fill:none;stroke:var(--text);stroke-width:1.5;vector-effect:non-scaling-stroke}
.dot{position:absolute;width:6px;height:6px;margin:-3px 0 0 -3px;background:var(--text)}
.dot.last{background:var(--brand-orange)}
.point{position:absolute;transform:translate(-50%,-26px);font-size:13px;font-weight:500;line-height:1.3;font-variant-numeric:tabular-nums}
.axis{position:relative;height:30px;margin:14px 4px 0;border-top:1px solid var(--faint);font-size:13px;color:var(--muted)}
.axis span{position:absolute;top:8px;transform:translateX(-50%);white-space:nowrap}
.point.before{transform:translate(-85%,-26px)}
.point.after{transform:translate(-15%,-26px)}
.point.start{transform:translate(0,-26px)}
.point.end{transform:translate(-100%,-26px)}
.axis .start{transform:none}
.axis .end{transform:translateX(-100%)}
footer{margin-top:28px;padding-top:16px;border-top:1px solid var(--faint);color:var(--muted);font-size:13px;line-height:1.55}
@media(max-width:980px){
  .cards{grid-template-columns:repeat(2,minmax(0,1fr))}
  .row{grid-template-columns:minmax(0,1fr)}
}
@media(max-width:640px){
  .wrap{padding:0 20px 32px}
  main{gap:28px}
  header{flex-wrap:wrap;align-items:flex-start;gap:8px 16px;padding:20px 0 16px;margin-bottom:22px}
  .titles{flex:1}
  .meta{order:3;width:100%;margin-left:0;text-align:left}
  h1{font-size:30px}
  .cards{grid-template-columns:minmax(0,1fr)}
  .panels{columns:1}
  .cards .card{grid-row:auto;grid-template:auto auto / repeat(2,minmax(0,1fr));column-gap:20px}
  .cards h3{grid-column:1 / -1}
  .headline:nth-child(2):last-child{grid-column:1 / -1}
  .card{padding:16px}
  th,td{padding-left:8px}
}
`;
