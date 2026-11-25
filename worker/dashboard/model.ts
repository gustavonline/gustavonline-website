import seedJson from "../../content/dashboard/content-kpis.json" with { type: "json" };

export class DashboardInputError extends Error {}
export class DashboardDataError extends Error {}

export type WeekState = "empty" | "closed" | "current" | "upcoming";

export interface XMetrics {
  followers: number | null;
  impressions: number | null;
  impressionsNote: string | null;
  likes: number | null;
  replies: number | null;
  bookmarks: number | null;
}

export interface LinkedInMetrics {
  followers: number | null;
  impressions: number | null;
}

export interface NewsletterMetrics {
  subscribers: number | null;
  opens: number | null;
  openRatePercent: number | null;
  clicks: number | null;
}

export interface YouTubeMetrics {
  subscribers: number | null;
  views: number | null;
  watchTimeHours: number | null;
}

export interface DashboardWeek {
  year: number;
  week: number;
  state: WeekState;
  stateLabel: string;
  periodLabel: string | null;
  footerPeriod: string | null;
  checkInLabel: string | null;
  closingNote: string | null;
  x: XMetrics | null;
  linkedin: LinkedInMetrics | null;
  newsletter: NewsletterMetrics | null;
  youtube: YouTubeMetrics | null;
}

export interface SeriesPoint {
  followers: number;
  measuredOn: string | null;
  axisLabel: string;
}

export interface DashboardGoals {
  xFollowers: number | null;
  linkedinFollowers: number | null;
  newsletterSubscribers: number | null;
  youtubeSubscribers: number | null;
}

export interface Dashboard {
  timezone: string;
  baseline: { followers: number; measuredOn: string | null; label: string };
  xNow: {
    followers: number;
    measuredOn: string | null;
    label: string;
    partOfDay: string | null;
    source: { year: number; week: number } | null;
  };
  xSeries: SeriesPoint[];
  goals: DashboardGoals;
  cadence: { label: string; note: string };
  sourceNote: string;
  weeks: DashboardWeek[];
}

export interface MondayUpdate {
  year?: number;
  week: number;
  xFollowers?: number;
  linkedinFollowers?: number;
  newsletterSubscribers?: number;
  youtubeSubscribers?: number;
}

export interface MetricsPatch {
  year?: number;
  week?: number;
  state?: WeekState;
  stateLabel?: string;
  periodLabel?: string | null;
  footerPeriod?: string | null;
  checkInLabel?: string | null;
  closingNote?: string | null;
  x?: Partial<XMetrics> | null;
  linkedin?: Partial<LinkedInMetrics> | null;
  newsletter?: Partial<NewsletterMetrics> | null;
  youtube?: Partial<YouTubeMetrics> | null;
  goals?: Partial<DashboardGoals>;
  xNow?: Partial<Dashboard["xNow"]>;
  baseline?: Partial<Dashboard["baseline"]>;
  xSeries?: SeriesPoint[];
  cadence?: { label: string; note: string };
  sourceNote?: string;
}

const WEEK_STATES = new Set<WeekState>(["empty", "closed", "current", "upcoming"]);
const MONTHS = ["jan.", "feb.", "mar.", "apr.", "maj", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."];
const COUNT_MAX = 1_000_000_000_000;

export function seedDashboard(): Dashboard {
  return parseDashboard(seedJson);
}

export function parseDashboard(input: unknown): Dashboard {
  try {
    return parseDashboardInner(input);
  } catch (error) {
    if (error instanceof DashboardDataError) throw error;
    throw new DashboardDataError("Dashboard-data er ugyldig.");
  }
}

export function parseMonday(input: unknown): MondayUpdate {
  const record = expectRecord(input, "Monday-loggen");
  rejectUnknown(record, ["week", "year", "xFollowers", "linkedinFollowers", "newsletterSubscribers", "youtubeSubscribers"]);
  const week = requireWeek(record.week);
  const year = record.year === undefined ? undefined : requireYear(record.year);
  const update: MondayUpdate = { week, year };
  const fields = [
    ["xFollowers", "X-følgere"],
    ["linkedinFollowers", "LI-følgere"],
    ["newsletterSubscribers", "NB-abonnenter"],
    ["youtubeSubscribers", "YT-abonnenter"],
  ] as const;
  for (const [key, label] of fields) {
    if (record[key] === undefined || record[key] === null || record[key] === "") continue;
    update[key] = requireCount(record[key], label);
  }
  if (update.xFollowers === undefined && update.linkedinFollowers === undefined && update.newsletterSubscribers === undefined && update.youtubeSubscribers === undefined) {
    throw new DashboardInputError("Mindst ét tal skal udfyldes.");
  }
  return update;
}

export function mondayFromForm(form: URLSearchParams): unknown {
  const body: Record<string, unknown> = {};
  const week = form.get("week")?.trim();
  const year = form.get("year")?.trim();
  if (week) body.week = Number(week);
  if (year) body.year = Number(year);
  for (const key of ["xFollowers", "linkedinFollowers", "newsletterSubscribers", "youtubeSubscribers"]) {
    const raw = form.get(key)?.trim();
    if (raw) body[key] = Number(raw);
  }
  return body;
}

export function parseMetrics(input: unknown): MetricsPatch {
  const record = expectRecord(input, "Opdateringen");
  rejectUnknown(record, [
    "year", "week", "state", "stateLabel", "periodLabel", "footerPeriod", "checkInLabel", "closingNote",
    "x", "linkedin", "newsletter", "youtube", "goals", "xNow", "baseline", "xSeries", "cadence", "sourceNote",
  ]);
  const patch: MetricsPatch = {};
  if (record.year !== undefined) patch.year = requireYear(record.year);
  if (record.week !== undefined) patch.week = requireWeek(record.week);
  if (record.state !== undefined) patch.state = requireState(record.state);
  if (record.stateLabel !== undefined) patch.stateLabel = requireText(record.stateLabel, "Teksten", 80);
  if (record.periodLabel !== undefined) patch.periodLabel = optionalText(record.periodLabel, "Perioden");
  if (record.footerPeriod !== undefined) patch.footerPeriod = optionalText(record.footerPeriod, "Perioden");
  if (record.checkInLabel !== undefined) patch.checkInLabel = optionalText(record.checkInLabel, "Check-in");
  if (record.closingNote !== undefined) patch.closingNote = optionalText(record.closingNote, "Noten");
  if (record.x !== undefined) patch.x = record.x === null ? null : parseX(record.x);
  if (record.linkedin !== undefined) patch.linkedin = record.linkedin === null ? null : parseLinkedIn(record.linkedin);
  if (record.newsletter !== undefined) patch.newsletter = record.newsletter === null ? null : parseNewsletter(record.newsletter);
  if (record.youtube !== undefined) patch.youtube = record.youtube === null ? null : parseYouTube(record.youtube);
  if (record.goals !== undefined) patch.goals = parseGoals(record.goals);
  if (record.xNow !== undefined) patch.xNow = parseXNow(record.xNow);
  if (record.baseline !== undefined) patch.baseline = parseBaseline(record.baseline);
  if (record.xSeries !== undefined) patch.xSeries = parseSeries(record.xSeries);
  if (record.cadence !== undefined) patch.cadence = parseCadence(record.cadence);
  if (record.sourceNote !== undefined) patch.sourceNote = requireText(record.sourceNote, "Kildenoten", 500);
  const weekScoped = patch.x !== undefined || patch.linkedin !== undefined || patch.newsletter !== undefined || patch.youtube !== undefined
    || patch.state !== undefined || patch.stateLabel !== undefined || patch.periodLabel !== undefined || patch.footerPeriod !== undefined
    || patch.checkInLabel !== undefined || patch.closingNote !== undefined;
  if (weekScoped && patch.week === undefined) throw new DashboardInputError("Uge mangler.");
  if (Object.keys(patch).length === 0) throw new DashboardInputError("Opdateringen er tom.");
  return patch;
}

export function applyMonday(doc: Dashboard, update: MondayUpdate): Dashboard {
  const next = structuredClone(doc);
  const year = resolveYear(next, update.week, update.year);
  const week = ensureWeek(next, year, update.week);
  if (update.xFollowers !== undefined) week.x = { ...(week.x ?? emptyX()), followers: update.xFollowers };
  if (update.linkedinFollowers !== undefined) week.linkedin = { ...(week.linkedin ?? emptyLinkedIn()), followers: update.linkedinFollowers };
  if (update.newsletterSubscribers !== undefined) week.newsletter = { ...(week.newsletter ?? emptyNewsletter()), subscribers: update.newsletterSubscribers };
  if (update.youtubeSubscribers !== undefined) week.youtube = { ...(week.youtube ?? emptyYouTube()), subscribers: update.youtubeSubscribers };
  if (week.state !== "closed") {
    week.state = "closed";
    week.stateLabel = "Lukket";
  }
  if (update.xFollowers !== undefined && shouldReplaceNow(next, year, update.week)) {
    next.xNow = {
      followers: update.xFollowers,
      measuredOn: null,
      label: `Uge ${update.week}`,
      partOfDay: null,
      source: { year, week: update.week },
    };
  }
  return next;
}

export function applyMetrics(doc: Dashboard, patch: MetricsPatch): Dashboard {
  const next = structuredClone(doc);
  if (patch.goals) next.goals = { ...next.goals, ...patch.goals };
  if (patch.baseline) next.baseline = { ...next.baseline, ...patch.baseline };
  if (patch.xNow) next.xNow = { ...next.xNow, ...normalizeXNow(patch.xNow, next.xNow) };
  if (patch.xSeries) next.xSeries = patch.xSeries;
  if (patch.cadence) next.cadence = patch.cadence;
  if (patch.sourceNote !== undefined) next.sourceNote = patch.sourceNote;
  if (patch.week !== undefined) {
    const year = resolveYear(next, patch.week, patch.year);
    const week = ensureWeek(next, year, patch.week);
    if (patch.state) week.state = patch.state;
    if (patch.stateLabel !== undefined) week.stateLabel = patch.stateLabel;
    if (patch.periodLabel !== undefined) week.periodLabel = patch.periodLabel;
    if (patch.footerPeriod !== undefined) week.footerPeriod = patch.footerPeriod;
    if (patch.checkInLabel !== undefined) week.checkInLabel = patch.checkInLabel;
    if (patch.closingNote !== undefined) week.closingNote = patch.closingNote;
    if (patch.x === null) week.x = null;
    else if (patch.x) week.x = { ...(week.x ?? emptyX()), ...patch.x };
    if (patch.linkedin === null) week.linkedin = null;
    else if (patch.linkedin) week.linkedin = { ...(week.linkedin ?? emptyLinkedIn()), ...patch.linkedin };
    if (patch.newsletter === null) week.newsletter = null;
    else if (patch.newsletter) week.newsletter = { ...(week.newsletter ?? emptyNewsletter()), ...patch.newsletter };
    if (patch.youtube === null) week.youtube = null;
    else if (patch.youtube) week.youtube = { ...(week.youtube ?? emptyYouTube()), ...patch.youtube };
  }
  return next;
}

export function resolveYear(doc: Dashboard, week: number, year?: number): number {
  if (year !== undefined) return year;
  const matches = doc.weeks.filter((item) => item.week === week);
  if (matches.length === 1) return matches[0].year;
  const current = doc.weeks.find((item) => item.state === "current");
  if (matches.length === 0 && current) return current.year;
  throw new DashboardInputError("År mangler.");
}

export function isoWeek(date: string): { year: number; week: number } {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  const weekday = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((value.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { year: value.getUTCFullYear(), week };
}

export function danishAxisLabel(measuredOn: string, followers: number): string {
  const [, month, day] = measuredOn.split("-").map(Number);
  return `${day}. ${MONTHS[month - 1]} · ${formatDaInteger(followers)}`;
}

export function formatDaInteger(value: number): string {
  const sign = value < 0 ? "−" : "";
  return sign + Math.abs(Math.trunc(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatDaNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return formatDaInteger(rounded);
  const sign = rounded < 0 ? "−" : "";
  const [whole, fraction] = Math.abs(rounded).toFixed(1).split(".");
  return `${sign}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${fraction}`;
}

function parseDashboardInner(input: unknown): Dashboard {
  const record = dataRecord(input);
  const baseline = dataRecord(record.baseline);
  const xNow = dataRecord(record.xNow);
  const goals = dataRecord(record.goals ?? {});
  const cadence = dataRecord(record.cadence);
  const weeks = Array.isArray(record.weeks) ? record.weeks.map(parseStoredWeek) : fail();
  if (weeks.length > 104) fail();
  const seen = new Set<string>();
  for (const week of weeks) {
    const key = `${week.year}-${week.week}`;
    if (seen.has(key)) fail();
    seen.add(key);
  }
  weeks.sort((a, b) => a.year - b.year || a.week - b.week);
  const series = Array.isArray(record.xSeries) ? record.xSeries.map(parseStoredPoint) : fail();
  return {
    timezone: dataText(record.timezone, 80),
    baseline: {
      followers: dataCount(baseline.followers),
      measuredOn: dataDate(baseline.measuredOn),
      label: dataText(baseline.label, 80),
    },
    xNow: {
      followers: dataCount(xNow.followers),
      measuredOn: dataDate(xNow.measuredOn),
      label: dataText(xNow.label, 80),
      partOfDay: xNow.partOfDay == null ? null : dataText(xNow.partOfDay, 40),
      source: parseSource(xNow.source),
    },
    xSeries: series,
    goals: {
      xFollowers: dataOptionalCount(goals.xFollowers),
      linkedinFollowers: dataOptionalCount(goals.linkedinFollowers),
      newsletterSubscribers: dataOptionalCount(goals.newsletterSubscribers),
      youtubeSubscribers: dataOptionalCount(goals.youtubeSubscribers),
    },
    cadence: { label: dataText(cadence.label, 160), note: dataText(cadence.note, 300) },
    sourceNote: record.sourceNote == null ? "" : dataNote(record.sourceNote),
    weeks,
  };
}

function parseStoredWeek(input: unknown): DashboardWeek {
  const record = dataRecord(input);
  return {
    year: dataYear(record.year),
    week: dataWeek(record.week),
    state: requireState(record.state),
    stateLabel: dataText(record.stateLabel, 80),
    periodLabel: record.periodLabel == null ? null : dataText(record.periodLabel, 80),
    footerPeriod: record.footerPeriod == null ? null : dataText(record.footerPeriod, 80),
    checkInLabel: record.checkInLabel == null ? null : dataText(record.checkInLabel, 80),
    closingNote: record.closingNote == null ? null : dataText(record.closingNote, 200),
    x: record.x == null ? null : storedX(record.x),
    linkedin: record.linkedin == null ? null : storedLinkedIn(record.linkedin),
    newsletter: record.newsletter == null ? null : storedNewsletter(record.newsletter),
    youtube: record.youtube == null ? null : storedYouTube(record.youtube),
  };
}

function parseStoredPoint(input: unknown): SeriesPoint {
  const record = dataRecord(input);
  const followers = dataCount(record.followers);
  const measuredOn = dataDate(record.measuredOn);
  const axisLabel = record.axisLabel == null
    ? (measuredOn ? danishAxisLabel(measuredOn, followers) : formatDaInteger(followers))
    : dataText(record.axisLabel, 80);
  return { followers, measuredOn, axisLabel };
}

function storedX(input: unknown): XMetrics {
  const record = dataRecord(input);
  return {
    followers: dataOptionalCount(record.followers),
    impressions: dataOptionalCount(record.impressions),
    impressionsNote: record.impressionsNote == null ? null : dataText(record.impressionsNote, 120),
    likes: dataOptionalCount(record.likes),
    replies: dataOptionalCount(record.replies),
    bookmarks: dataOptionalCount(record.bookmarks),
  };
}

function storedLinkedIn(input: unknown): LinkedInMetrics {
  const record = dataRecord(input);
  return { followers: dataOptionalCount(record.followers), impressions: dataOptionalCount(record.impressions) };
}

function storedNewsletter(input: unknown): NewsletterMetrics {
  const record = dataRecord(input);
  return {
    subscribers: dataOptionalCount(record.subscribers),
    opens: dataOptionalCount(record.opens),
    openRatePercent: dataOptionalDecimal(record.openRatePercent, 100),
    clicks: dataOptionalCount(record.clicks),
  };
}

function storedYouTube(input: unknown): YouTubeMetrics {
  const record = dataRecord(input);
  return {
    subscribers: dataOptionalCount(record.subscribers),
    views: dataOptionalCount(record.views),
    watchTimeHours: dataOptionalDecimal(record.watchTimeHours, 1_000_000),
  };
}

function assignPresent(record: Record<string, unknown>, key: string, value: unknown, target: Record<string, unknown>) {
  if (key in record) target[key] = value ?? null;
}

function parseX(input: unknown): Partial<XMetrics> {
  const record = expectRecord(input, "X");
  rejectUnknown(record, ["followers", "impressions", "impressionsNote", "likes", "replies", "bookmarks"]);
  const next: Record<string, unknown> = {};
  assignPresent(record, "followers", optionalCount(record.followers, "X-følgere"), next);
  assignPresent(record, "impressions", optionalCount(record.impressions, "X-visninger"), next);
  assignPresent(record, "impressionsNote", record.impressionsNote === undefined ? undefined : optionalText(record.impressionsNote, "Noten"), next);
  assignPresent(record, "likes", optionalCount(record.likes, "X-likes"), next);
  assignPresent(record, "replies", optionalCount(record.replies, "X-svar"), next);
  assignPresent(record, "bookmarks", optionalCount(record.bookmarks, "X-bogmærker"), next);
  return next as Partial<XMetrics>;
}

function parseLinkedIn(input: unknown): Partial<LinkedInMetrics> {
  const record = expectRecord(input, "LinkedIn");
  rejectUnknown(record, ["followers", "impressions"]);
  const next: Record<string, unknown> = {};
  assignPresent(record, "followers", optionalCount(record.followers, "LI-følgere"), next);
  assignPresent(record, "impressions", optionalCount(record.impressions, "LI-visninger"), next);
  return next as Partial<LinkedInMetrics>;
}

function parseNewsletter(input: unknown): Partial<NewsletterMetrics> {
  const record = expectRecord(input, "Nyhedsbrevet");
  rejectUnknown(record, ["subscribers", "opens", "openRatePercent", "clicks"]);
  const next: Record<string, unknown> = {};
  assignPresent(record, "subscribers", optionalCount(record.subscribers, "NB-abonnenter"), next);
  assignPresent(record, "opens", optionalCount(record.opens, "Åbninger"), next);
  assignPresent(record, "openRatePercent", optionalDecimal(record.openRatePercent, "Åbningsraten", 100), next);
  assignPresent(record, "clicks", optionalCount(record.clicks, "Klik"), next);
  return next as Partial<NewsletterMetrics>;
}

function parseYouTube(input: unknown): Partial<YouTubeMetrics> {
  const record = expectRecord(input, "YouTube");
  rejectUnknown(record, ["subscribers", "views", "watchTimeHours"]);
  const next: Record<string, unknown> = {};
  assignPresent(record, "subscribers", optionalCount(record.subscribers, "YT-abonnenter"), next);
  assignPresent(record, "views", optionalCount(record.views, "Visninger"), next);
  assignPresent(record, "watchTimeHours", optionalDecimal(record.watchTimeHours, "Seertiden", 1_000_000), next);
  return next as Partial<YouTubeMetrics>;
}

function parseGoals(input: unknown): Partial<DashboardGoals> {
  const record = expectRecord(input, "Målene");
  rejectUnknown(record, ["xFollowers", "linkedinFollowers", "newsletterSubscribers", "youtubeSubscribers"]);
  const next: Record<string, unknown> = {};
  assignPresent(record, "xFollowers", optionalCount(record.xFollowers, "X-målet"), next);
  assignPresent(record, "linkedinFollowers", optionalCount(record.linkedinFollowers, "LI-målet"), next);
  assignPresent(record, "newsletterSubscribers", optionalCount(record.newsletterSubscribers, "NB-målet"), next);
  assignPresent(record, "youtubeSubscribers", optionalCount(record.youtubeSubscribers, "YT-målet"), next);
  return next as Partial<DashboardGoals>;
}

function parseXNow(input: unknown): Partial<Dashboard["xNow"]> {
  const record = expectRecord(input, "X-følgere nu");
  rejectUnknown(record, ["followers", "measuredOn", "label", "partOfDay", "source"]);
  const next: Partial<Dashboard["xNow"]> = {};
  if (record.followers !== undefined) next.followers = requireCount(record.followers, "X-følgere");
  if (record.measuredOn !== undefined) next.measuredOn = record.measuredOn === null ? null : requireDate(record.measuredOn);
  if (record.label !== undefined) next.label = requireText(record.label, "Etiketten", 80);
  if (record.partOfDay !== undefined) next.partOfDay = optionalText(record.partOfDay, "Tidspunktet");
  if (record.source !== undefined) next.source = record.source === null ? null : requireSource(record.source);
  return next;
}

function parseBaseline(input: unknown): Partial<Dashboard["baseline"]> {
  const record = expectRecord(input, "Baseline");
  rejectUnknown(record, ["followers", "measuredOn", "label"]);
  const next: Partial<Dashboard["baseline"]> = {};
  if (record.followers !== undefined) next.followers = requireCount(record.followers, "Baseline");
  if (record.measuredOn !== undefined) next.measuredOn = record.measuredOn === null ? null : requireDate(record.measuredOn);
  if (record.label !== undefined) next.label = requireText(record.label, "Etiketten", 80);
  return next;
}

function parseSeries(input: unknown): SeriesPoint[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 36) {
    throw new DashboardInputError("Følgerserien skal have mellem 1 og 36 punkter.");
  }
  return input.map((item) => {
    const record = expectRecord(item, "Serien");
    rejectUnknown(record, ["followers", "measuredOn", "axisLabel"]);
    const followers = requireCount(record.followers, "Serien");
    const measuredOn = record.measuredOn == null ? null : requireDate(record.measuredOn);
    const axisLabel = record.axisLabel == null
      ? (measuredOn ? danishAxisLabel(measuredOn, followers) : formatDaInteger(followers))
      : requireText(record.axisLabel, "Etiketten", 80);
    return { followers, measuredOn, axisLabel };
  });
}

function parseCadence(input: unknown): { label: string; note: string } {
  const record = expectRecord(input, "Kadencen");
  rejectUnknown(record, ["label", "note"]);
  return { label: requireText(record.label, "Kadencen", 160), note: requireText(record.note, "Noten", 300) };
}

function ensureWeek(doc: Dashboard, year: number, weekNumber: number): DashboardWeek {
  const existing = doc.weeks.find((item) => item.year === year && item.week === weekNumber);
  if (existing) return existing;
  if (doc.weeks.length >= 104) throw new DashboardInputError("Der er ikke plads til flere uger.");
  const created = emptyWeek(year, weekNumber);
  doc.weeks.push(created);
  doc.weeks.sort((a, b) => a.year - b.year || a.week - b.week);
  return created;
}

function shouldReplaceNow(doc: Dashboard, year: number, week: number): boolean {
  const incoming = year * 100 + week;
  if (doc.xNow.source) return incoming >= doc.xNow.source.year * 100 + doc.xNow.source.week;
  if (doc.xNow.measuredOn) {
    const current = isoWeek(doc.xNow.measuredOn);
    return incoming >= current.year * 100 + current.week;
  }
  return true;
}

function normalizeXNow(patch: Partial<Dashboard["xNow"]>, current: Dashboard["xNow"]): Dashboard["xNow"] {
  return {
    followers: patch.followers ?? current.followers,
    measuredOn: patch.measuredOn === undefined ? current.measuredOn : patch.measuredOn,
    label: patch.label ?? current.label,
    partOfDay: patch.partOfDay === undefined ? current.partOfDay : patch.partOfDay,
    source: patch.source === undefined ? current.source : patch.source,
  };
}

function emptyWeek(year: number, week: number): DashboardWeek {
  return {
    year, week, state: "closed", stateLabel: "Lukket",
    periodLabel: null, footerPeriod: null, checkInLabel: null, closingNote: null,
    x: null, linkedin: null, newsletter: null, youtube: null,
  };
}

function emptyX(): XMetrics {
  return { followers: null, impressions: null, impressionsNote: null, likes: null, replies: null, bookmarks: null };
}
function emptyLinkedIn(): LinkedInMetrics {
  return { followers: null, impressions: null };
}
function emptyNewsletter(): NewsletterMetrics {
  return { subscribers: null, opens: null, openRatePercent: null, clicks: null };
}
function emptyYouTube(): YouTubeMetrics {
  return { subscribers: null, views: null, watchTimeHours: null };
}

function parseSource(input: unknown): { year: number; week: number } | null {
  if (input == null) return null;
  const record = dataRecord(input);
  return { year: dataYear(record.year), week: dataWeek(record.week) };
}

function requireSource(input: unknown): { year: number; week: number } {
  const record = expectRecord(input, "Kilden");
  return { year: requireYear(record.year), week: requireWeek(record.week) };
}

function expectRecord(input: unknown, label: string): Record<string, unknown> {
  if (!isRecord(input)) throw new DashboardInputError(`${label} skal være et objekt.`);
  return input;
}

function rejectUnknown(record: Record<string, unknown>, allowed: string[]) {
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) throw new DashboardInputError(`Ukendt felt: ${key}.`);
  }
}

function requireWeek(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 53) {
    throw new DashboardInputError("Uge skal være et helt tal fra 1 til 53.");
  }
  return value;
}

function requireYear(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 2020 || value > 2100) {
    throw new DashboardInputError("År skal være et helt tal fra 2020 til 2100.");
  }
  return value;
}

function requireCount(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > COUNT_MAX) {
    throw new DashboardInputError(`${label} skal være et helt tal fra 0 og op.`);
  }
  return value;
}

function optionalCount(value: unknown, label: string): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireCount(value, label);
}

function optionalDecimal(value: unknown, label: string, max: number): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) {
    throw new DashboardInputError(`${label} skal være et tal fra 0 til ${formatDaInteger(max)}.`);
  }
  return Math.round(value * 100) / 100;
}

function requireState(value: unknown): WeekState {
  if (typeof value !== "string" || !WEEK_STATES.has(value as WeekState)) throw new DashboardInputError("Ugestatus er ugyldig.");
  return value as WeekState;
}

function requireText(value: unknown, label: string, max: number): string {
  if (typeof value !== "string") throw new DashboardInputError(`${label} skal være tekst.`);
  const text = value.trim();
  if (!text || text.length > max) throw new DashboardInputError(`${label} er for lang eller tom.`);
  return text;
}

function optionalText(value: unknown, label: string): string | null {
  if (value === null) return null;
  return requireText(value, label, 200);
}

function requireDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new DashboardInputError("Datoen skal være ÅÅÅÅ-MM-DD.");
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dataRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) fail();
  return value;
}

function dataText(value: unknown, max: number): string {
  if (typeof value !== "string" || value.trim() === "" || value.length > max) fail();
  return value.trim();
}

function dataNote(value: unknown): string {
  if (typeof value !== "string" || value.length > 500) fail();
  return value.trim();
}

function dataCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > COUNT_MAX) fail();
  return value;
}

function dataOptionalCount(value: unknown): number | null {
  if (value == null) return null;
  return dataCount(value);
}

function dataOptionalDecimal(value: unknown, max: number): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) fail();
  return value;
}

function dataDate(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail();
  return value;
}

function dataYear(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 2020 || value > 2100) fail();
  return value;
}

function dataWeek(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 53) fail();
  return value;
}

function fail(): never {
  throw new DashboardDataError("Dashboard-data er ugyldig.");
}
