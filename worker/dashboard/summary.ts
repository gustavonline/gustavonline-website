import { addDays, dayNumber, formatDate, formatDay, formatDayNear, isoWeek, mondayOf, todayIn, weekMonday, type Unit } from "./format";
import { nowMonday, type Dashboard, type DashboardGoals, type DashboardWeek } from "./model";

interface Metric {
  label: string;
  unit: Unit;
  // A level is a standing count, such as followers. Everything else is a total for one week.
  level?: boolean;
  read: (week: DashboardWeek) => number | null;
}

interface Platform {
  key: string;
  name: string;
  goal: keyof DashboardGoals;
  level: Metric;
  reach: Metric | null;
  details: Metric[];
}

export interface Delta {
  amount: number;
  percent: number | null;
  unit: Unit;
}

export interface Reading {
  label: string;
  unit: Unit;
  value: number | null;
  delta: Delta | null;
  period: string | null;
  // Monday of the week the number belongs to.
  monday: string | null;
}

// The current X count, with the day it stands for on the trend.
interface XReading extends Reading {
  day: string | null;
  dayLabel: string | null;
}

export interface PlatformCard {
  key: string;
  name: string;
  readings: Reading[];
  goal: { target: number; percent: number } | null;
}

export interface PlatformDetails {
  key: string;
  name: string;
  period: string | null;
  monday: string | null;
  labels: string[];
  readings: Reading[];
}

export interface ReviewRow {
  label: string;
  unit: Unit;
  value: number | null;
  previous: number | null;
  delta: Delta | null;
}

export interface Summary {
  today: string;
  week: number;
  cards: PlatformCard[];
  details: PlatformDetails[];
  trend: Trend;
  review: {
    monday: string;
    sunday: string;
    week: number;
    previousWeek: number;
    partial: boolean;
    previousPartial: boolean;
    platforms: Array<{ name: string; rows: ReviewRow[] | null }>;
  };
}

interface XCount {
  value: number | null;
  monday: string | null;
  measuredOn: string | null;
}

interface Clock {
  today: string;
  monday: string;
}

const PLATFORMS: Platform[] = [
  {
    key: "x",
    name: "X",
    goal: "xFollowers",
    level: { label: "Followers", unit: "count", level: true, read: (week) => week.x?.followers ?? null },
    reach: { label: "Views / impressions", unit: "count", read: (week) => week.x?.impressions ?? null },
    details: [
      { label: "Views / impressions", unit: "count", read: (week) => week.x?.impressions ?? null },
      { label: "Likes", unit: "count", read: (week) => week.x?.likes ?? null },
      { label: "Replies", unit: "count", read: (week) => week.x?.replies ?? null },
      { label: "Reposts", unit: "count", read: (week) => week.x?.reposts ?? null },
      { label: "Bookmarks", unit: "count", read: (week) => week.x?.bookmarks ?? null },
      { label: "Bookmarks per 100 likes", unit: "decimal", read: bookmarksPerHundredLikes },
    ],
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    goal: "linkedinFollowers",
    level: { label: "Followers", unit: "count", level: true, read: (week) => week.linkedin?.followers ?? null },
    reach: { label: "Impressions", unit: "count", read: (week) => week.linkedin?.impressions ?? null },
    details: [
      { label: "Impressions", unit: "count", read: (week) => week.linkedin?.impressions ?? null },
      { label: "Reactions", unit: "count", read: (week) => week.linkedin?.reactions ?? null },
      { label: "Comments", unit: "count", read: (week) => week.linkedin?.comments ?? null },
      { label: "Reposts", unit: "count", read: (week) => week.linkedin?.reposts ?? null },
    ],
  },
  {
    key: "youtube",
    name: "YouTube",
    goal: "youtubeSubscribers",
    level: { label: "Subscribers", unit: "count", level: true, read: (week) => week.youtube?.subscribers ?? null },
    reach: { label: "Views", unit: "count", read: (week) => week.youtube?.views ?? null },
    details: [
      { label: "Views", unit: "count", read: (week) => week.youtube?.views ?? null },
      { label: "Watch time", unit: "hours", read: (week) => week.youtube?.watchTimeHours ?? null },
      { label: "Likes", unit: "count", read: (week) => week.youtube?.likes ?? null },
      { label: "Comments", unit: "count", read: (week) => week.youtube?.comments ?? null },
      { label: "Subscribers gained", unit: "count", read: (week) => week.youtube?.subscribersGained ?? null },
    ],
  },
  {
    key: "newsletter",
    name: "Newsletter (Kit)",
    goal: "newsletterSubscribers",
    level: { label: "Subscribers", unit: "count", level: true, read: (week) => week.newsletter?.subscribers ?? null },
    reach: null,
    details: [
      { label: "Subscribers", unit: "count", level: true, read: (week) => week.newsletter?.subscribers ?? null },
      { label: "Open rate", unit: "percent", read: (week) => week.newsletter?.openRatePercent ?? null },
      { label: "Click rate", unit: "percent", read: (week) => week.newsletter?.clickRatePercent ?? null },
      { label: "Opens", unit: "count", read: (week) => week.newsletter?.opens ?? null },
      { label: "Clicks", unit: "count", read: (week) => week.newsletter?.clicks ?? null },
    ],
  },
];

export function summarize(doc: Dashboard, now: Date): Summary {
  const today = todayIn(doc.timezone, now);
  const clock = { today, monday: mondayOf(today) };
  const x = xFollowers(doc, PLATFORMS[0].level, clock);
  return {
    today,
    week: isoWeek(today).week,
    cards: PLATFORMS.map((platform) => platformCard(doc, platform, clock, platform.key === "x" ? x : levelReading(doc, platform.level, clock))),
    details: PLATFORMS.map((platform) => platformDetails(doc, platform, clock)),
    trend: followerTrend(doc, x, clock),
    review: review(doc, clock),
  };
}

function platformCard(doc: Dashboard, platform: Platform, clock: Clock, level: Reading): PlatformCard {
  const target = doc.goals[platform.goal];
  return {
    key: platform.key,
    name: platform.name,
    readings: platform.reach ? [level, weekTotal(doc, platform.reach, clock)] : [level],
    goal: target && level.value !== null ? { target, percent: Math.round((level.value / target) * 100) } : null,
  };
}

function platformDetails(doc: Dashboard, platform: Platform, clock: Clock): PlatformDetails {
  const totals = platform.details.filter((metric) => !metric.level);
  const week = latestWeek(doc, clock, (item) => totals.some((metric) => metric.read(item) !== null));
  const readings = platform.details.map((metric) => {
    if (metric.level) return levelReading(doc, metric, clock);
    return {
      label: metric.label,
      unit: metric.unit,
      value: week ? metric.read(week) : null,
      delta: week ? totalDelta(doc, week, metric, clock) : null,
      period: null,
      monday: week ? mondayFor(week) : null,
    };
  });
  return {
    key: platform.key,
    name: platform.name,
    period: week ? totalLabel(week, clock) : null,
    monday: week ? mondayFor(week) : null,
    labels: platform.details.map((metric) => metric.label),
    readings: readings.some((reading) => reading.value !== null) ? readings : [],
  };
}

// The review always covers the Mon–Sun week before the current one, whatever day it is opened.
function review(doc: Dashboard, clock: Clock): Summary["review"] {
  const monday = addDays(clock.monday, -7);
  const previousMonday = addDays(monday, -7);
  const week = findWeek(doc, monday);
  const before = findWeek(doc, previousMonday);
  return {
    monday,
    sunday: addDays(monday, 6),
    week: isoWeek(monday).week,
    previousWeek: isoWeek(previousMonday).week,
    partial: week?.partial ?? false,
    previousPartial: before?.partial ?? false,
    platforms: PLATFORMS.map((platform) => {
      const rows = [platform.level, ...(platform.reach ? [platform.reach] : [])].map((metric) => ({
        label: metric.label,
        unit: metric.unit,
        value: week ? metric.read(week) : null,
        previous: before ? metric.read(before) : null,
        delta: !week ? null : metric.level ? levelDelta(doc, metric, metric.read(week), monday) : totalDelta(doc, week, metric, clock),
      }));
      return { name: platform.name, rows: rows.some((row) => row.value !== null) ? rows : null };
    }),
  };
}

function levelReading(doc: Dashboard, metric: Metric, clock: Clock): Reading {
  const week = latestWeek(doc, clock, (item) => metric.read(item) !== null);
  const value = week ? metric.read(week) : null;
  return {
    label: metric.label,
    unit: metric.unit,
    value,
    delta: week ? levelDelta(doc, metric, value, mondayFor(week)) : null,
    period: week ? weekLabel(mondayFor(week), clock, "This week") : null,
    monday: week ? mondayFor(week) : null,
  };
}

// The X count can come from a recorded week, the current snapshot or the follower series; the newest one
// counts. Writes keep the snapshot in step with the weeks, so it wins when both are from the same week.
function xFollowers(doc: Dashboard, metric: Metric, clock: Clock): XReading {
  const week = latestWeek(doc, clock, (item) => metric.read(item) !== null);
  const { measuredOn, followers } = doc.xNow;
  const snapshot = nowMonday(doc);
  const started = measuredOn ? measuredOn <= clock.today : !snapshot || snapshot <= clock.monday;
  const point = datedSeries(doc, clock).pop();

  let count: XCount = { value: week ? metric.read(week) : null, monday: week ? mondayFor(week) : null, measuredOn: null };
  if (started && (!count.monday || (snapshot && snapshot >= count.monday))) count = { value: followers, monday: snapshot, measuredOn };
  const day = countDay(count, clock);
  if (point && (!day || point.day > day)) count = { value: point.followers, monday: mondayOf(point.day), measuredOn: point.day };

  const { value, monday } = count;
  return {
    label: metric.label,
    unit: metric.unit,
    value,
    delta: monday ? levelDelta(doc, metric, value, monday) : null,
    period: count.measuredOn ? `As of ${formatDayNear(count.measuredOn, clock.today)}` : monday ? weekLabel(monday, clock, "This week") : null,
    monday,
    day: countDay(count, clock),
    dayLabel: count.measuredOn ? formatDay(count.measuredOn) : monday ? `Week ${isoWeek(monday).week}` : null,
  };
}

function countDay(count: XCount, clock: Clock): string | null {
  return count.measuredOn ?? (count.monday ? weekDay(count.monday, clock) : null);
}

function datedSeries(doc: Dashboard, clock: Clock): Array<{ day: string; followers: number }> {
  return doc.xSeries
    .flatMap((point) => point.measuredOn && point.measuredOn <= clock.today ? [{ day: point.measuredOn, followers: point.followers }] : [])
    .sort((a, b) => a.day.localeCompare(b.day));
}

// A weekly count stands at the end of its week, or today while the week is running.
function weekDay(monday: string, clock: Clock): string {
  const sunday = addDays(monday, 6);
  return sunday < clock.today ? sunday : clock.today;
}

function weekTotal(doc: Dashboard, metric: Metric, clock: Clock): Reading {
  const week = latestWeek(doc, clock, (item) => metric.read(item) !== null);
  return {
    label: metric.label,
    unit: metric.unit,
    value: week ? metric.read(week) : null,
    delta: week ? totalDelta(doc, week, metric, clock) : null,
    period: week ? totalLabel(week, clock) : null,
    monday: week ? mondayFor(week) : null,
  };
}

function levelDelta(doc: Dashboard, metric: Metric, value: number | null, monday: string): Delta | null {
  const before = findWeek(doc, addDays(monday, -7));
  return difference(value, before ? metric.read(before) : null, metric.unit);
}

// Comparing a running or partly counted week with a full one would show a drop that did not happen.
function totalDelta(doc: Dashboard, week: DashboardWeek, metric: Metric, clock: Clock): Delta | null {
  const monday = mondayFor(week);
  const before = findWeek(doc, addDays(monday, -7));
  if (!before || before.partial || week.partial || monday >= clock.monday) return null;
  return difference(metric.read(week), metric.read(before), metric.unit);
}

function difference(value: number | null, previous: number | null, unit: Unit): Delta | null {
  if (value === null || previous === null) return null;
  const amount = value - previous;
  const percent = previous > 0 && (unit === "count" || unit === "hours") ? Math.round((amount / previous) * 100) : null;
  return { amount, percent, unit };
}

function latestWeek(doc: Dashboard, clock: Clock, matches: (week: DashboardWeek) => boolean): DashboardWeek | undefined {
  return [...doc.weeks].reverse().find((week) => mondayFor(week) <= clock.monday && matches(week));
}

function findWeek(doc: Dashboard, monday: string): DashboardWeek | undefined {
  const { year, week } = isoWeek(monday);
  return doc.weeks.find((item) => item.year === year && item.week === week);
}

function mondayFor(week: DashboardWeek): string {
  return weekMonday(week.year, week.week);
}

function totalLabel(week: DashboardWeek, clock: Clock): string {
  return `${weekLabel(mondayFor(week), clock, "This week so far")}${week.partial ? " · partial week" : ""}`;
}

function weekLabel(monday: string, clock: Clock, running: string): string {
  return monday === clock.monday ? running : `Week of ${formatDayNear(monday, clock.today)}`;
}

function bookmarksPerHundredLikes(week: DashboardWeek): number | null {
  const bookmarks = week.x?.bookmarks ?? null;
  const likes = week.x?.likes ?? null;
  return bookmarks === null || likes === null || likes === 0 ? null : (bookmarks / likes) * 100;
}

export interface Trend {
  points: Array<{ followers: number; day: string; label: string; position: number }>;
  since: { amount: number; from: string; start: number } | null;
}

// Ends at the count on the X card. Weekly counts fill in after the last dated point.
function followerTrend(doc: Dashboard, x: XReading, clock: Clock): Trend {
  const { baseline } = doc;
  const series = datedSeries(doc, clock).map((point) => ({ ...point, label: formatDay(point.day) }));
  const last = series[series.length - 1]?.day ?? "";
  const weeks = doc.weeks.flatMap((week) => {
    const followers = week.x?.followers ?? null;
    const day = weekDay(mondayFor(week), clock);
    return followers === null || mondayFor(week) > clock.monday || day <= last ? [] : [{ day, followers, label: `Week ${week.week}` }];
  });
  const end = x.day;
  const points = end === null || x.value === null
    ? series
    : [...[...series, ...weeks].filter((point) => point.day < end), { day: end, followers: x.value, label: x.dayLabel ?? "" }];
  const first = points.length > 0 ? dayNumber(points[0].day) : 0;
  const span = points.length > 0 ? dayNumber(points[points.length - 1].day) - first : 0;
  return {
    points: points.map((point) => ({ ...point, position: span === 0 ? 0.5 : (dayNumber(point.day) - first) / span })),
    since: baseline.measuredOn && x.value !== null
      ? { amount: x.value - baseline.followers, from: formatDate(baseline.measuredOn), start: baseline.followers }
      : null,
  };
}
