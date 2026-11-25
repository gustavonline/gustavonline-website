import { addDays, dayNumber, formatDate, formatDay, formatDayNear, isoWeek, mondayOf, todayIn, weekMonday, type Unit } from "./format";
import type { Dashboard, DashboardGoals, DashboardWeek } from "./model";

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
  partial: boolean;
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
    platforms: Array<{ name: string; rows: ReviewRow[] | null }>;
  };
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
  const cards = PLATFORMS.map((platform) => platformCard(doc, platform, clock));
  return {
    today,
    week: isoWeek(today).week,
    cards,
    details: PLATFORMS.map((platform) => platformDetails(doc, platform, clock)),
    trend: followerTrend(doc, cards[0].readings[0].value ?? doc.xNow.followers),
    review: review(doc, clock),
  };
}

function platformCard(doc: Dashboard, platform: Platform, clock: Clock): PlatformCard {
  const level = platform.key === "x" ? xFollowers(doc, platform.level, clock) : levelReading(doc, platform.level, clock);
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
    };
  });
  return {
    key: platform.key,
    name: platform.name,
    period: week ? weekLabel(week, clock) : null,
    partial: week?.partial ?? false,
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
    period: week ? weekLabel(week, clock, "This week") : null,
  };
}

// X also has a dated snapshot that can be newer than any recorded week.
function xFollowers(doc: Dashboard, metric: Metric, clock: Clock): Reading {
  const recorded = levelReading(doc, metric, clock);
  const week = latestWeek(doc, clock, (item) => metric.read(item) !== null);
  const { measuredOn, source, followers } = doc.xNow;
  const monday = source ? weekMonday(source.year, source.week) : measuredOn ? mondayOf(measuredOn) : null;
  if (week) {
    const recordedMonday = mondayFor(week);
    if (!monday || monday < recordedMonday) return recorded;
    // A finished week's number was counted after a snapshot taken during that week.
    if (monday === recordedMonday && !(measuredOn && !source && monday === clock.monday)) return recorded;
  }
  return {
    label: metric.label,
    unit: metric.unit,
    value: followers,
    delta: monday ? levelDelta(doc, metric, followers, monday) : null,
    period: measuredOn ? `As of ${formatDayNear(measuredOn, clock.today)}` : monday ? `Week of ${formatDayNear(monday, clock.today)}` : null,
  };
}

function weekTotal(doc: Dashboard, metric: Metric, clock: Clock): Reading {
  const week = latestWeek(doc, clock, (item) => metric.read(item) !== null);
  return {
    label: metric.label,
    unit: metric.unit,
    value: week ? metric.read(week) : null,
    delta: week ? totalDelta(doc, week, metric, clock) : null,
    period: week ? weekLabel(week, clock) : null,
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

function weekLabel(week: DashboardWeek, clock: Clock, running = "This week so far"): string {
  const monday = mondayFor(week);
  return monday === clock.monday ? running : `Week of ${formatDayNear(monday, clock.today)}`;
}

function bookmarksPerHundredLikes(week: DashboardWeek): number | null {
  const bookmarks = week.x?.bookmarks ?? null;
  const likes = week.x?.likes ?? null;
  return bookmarks === null || likes === null || likes === 0 ? null : (bookmarks / likes) * 100;
}

export interface Trend {
  points: Array<{ followers: number; day: string | null; label: string | null; position: number }>;
  since: { amount: number; from: string; start: number } | null;
}

function followerTrend(doc: Dashboard, followers: number): Trend {
  const { baseline, xNow } = doc;
  const dated = doc.xSeries.length > 0 && doc.xSeries.every((point) => point.measuredOn !== null);
  const series = doc.xSeries.map((point) => ({ followers: point.followers, day: point.measuredOn }));
  if (dated) {
    series.sort((a, b) => (a.day as string).localeCompare(b.day as string));
    const last = series[series.length - 1].day as string;
    if (xNow.measuredOn && xNow.measuredOn > last) series.push({ followers: xNow.followers, day: xNow.measuredOn });
  }
  const first = dated ? dayNumber(series[0].day as string) : 0;
  const span = dated ? dayNumber(series[series.length - 1].day as string) - first : series.length - 1;
  const points = series.map((point, index) => ({
    ...point,
    label: point.day ? formatDay(point.day) : null,
    position: span === 0 ? 0.5 : ((dated ? dayNumber(point.day as string) - first : index) / span),
  }));
  return {
    points,
    since: baseline.measuredOn
      ? { amount: followers - baseline.followers, from: formatDate(baseline.measuredOn), start: baseline.followers }
      : null,
  };
}
