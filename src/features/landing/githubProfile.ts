/*
 * The GitHub profile projection (public/data/github-profile.json), generated from
 * the canonical gustavonline/gustavonline README. Everything here is pure: it
 * validates untrusted JSON, maps real contribution days onto the field grid and
 * returns the projects in the order the projection gives. The website never ranks
 * repositories. Schema 3 also carries prose from each configured project README.
 */

export const projectOwners = ["arcitai", "onlinesourdough", "gustavonline"] as const;
export type ProjectOwner = (typeof projectOwners)[number];
export const projectCategories = ["tools", "community", "resources"] as const;
export type ProjectCategory = (typeof projectCategories)[number];
export const projectStatuses = ["Community maintained", "Community handoff", "Resources", "In development", "Open source", "Public preview"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export type ProjectReadme = {
  section: string;
  url: string;
  revision: string;
  sha256: string;
  paragraphs: string[];
};

export type ProfileProject = {
  owner: ProjectOwner;
  repo: string;
  name: string;
  url: string;
  description: string;
  commits: number;
  isPublic: boolean;
  icon?: string;
  category?: ProjectCategory;
  status?: ProjectStatus;
  readme?: ProjectReadme;
};

export type ContributionDay = { date: string; weekday: number; count: number; level: number };
export type Contributions = { from: string; to: string; total: number; weeks: { days: ContributionDay[] }[] };

export type GithubProfile = {
  schemaVersion: 1 | 2 | 3;
  generatedAt: string;
  windowDays: number;
  /** Schema 2: the focus projects in their intended order. Schema 1: candidates, one per owner. Public only, deduplicated. */
  projects: ProfileProject[];
  /** Schema 2 only: the remaining curated public projects, without focus duplicates. */
  moreProjects: ProfileProject[];
  contributions: Contributions | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0;
const isText = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const isOwner = (value: unknown): value is ProjectOwner => projectOwners.some((owner) => owner === value);
const REPO_PART = /^[A-Za-z0-9_.-]{1,100}$/;
const oneOf = <T extends string>(values: readonly T[], value: unknown) => values.find((item) => item === value);

/** A real calendar date in YYYY-MM-DD form, as a UTC timestamp. */
function dayStamp(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const stamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(stamp) || new Date(stamp).toISOString().slice(0, 10) !== value ? null : stamp;
}

/** Local site assets only; no external icon URLs. */
function safeIcon(value: unknown) {
  if (typeof value !== "string") return undefined;
  return /^\/assets\/[A-Za-z0-9/_.-]+\.(svg|png|jpe?g|webp)$/.test(value) && !value.includes("..") ? value : undefined;
}

function parseProjectReadme(value: unknown, repo: string): ProjectReadme | undefined {
  if (!isRecord(value) || value.section !== "Why I built this") return undefined;
  if (typeof value.revision !== "string" || !/^(?:[a-f0-9]{40}|local-preview)$/.test(value.revision)) return undefined;
  const ref = value.revision === "local-preview" ? "main" : value.revision;
  if (value.url !== `https://github.com/${repo}/blob/${ref}/README.md#why-i-built-this`) return undefined;
  if (typeof value.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(value.sha256)) return undefined;
  if (!Array.isArray(value.paragraphs) || value.paragraphs.length < 1 || value.paragraphs.length > 4) return undefined;
  if (!value.paragraphs.every((p) => isText(p, 1000)) || !isText(value.paragraphs[0], 300) || value.paragraphs.join("").length > 3000) return undefined;
  return { section: value.section, url: value.url, revision: value.revision, sha256: value.sha256, paragraphs: value.paragraphs.map((p: string) => p.trim()) };
}

function parseProject(value: unknown): ProfileProject | null {
  if (!isRecord(value) || !isOwner(value.owner) || typeof value.repo !== "string") return null;
  const [owner, name, ...rest] = value.repo.split("/");
  if (rest.length || owner !== value.owner || !REPO_PART.test(name ?? "")) return null;
  // Only HTTPS links to exactly this repository on github.com.
  if (value.url !== `https://github.com/${value.repo}`) return null;
  if (!isText(value.name, 80) || !isText(value.description, 300) || !isCount(value.commits) || typeof value.isPublic !== "boolean") return null;
  const readme = parseProjectReadme(value.readme, value.repo);
  if (value.readme !== undefined && !readme) return null;
  return {
    owner: value.owner,
    repo: value.repo,
    name: value.name.trim(),
    url: value.url,
    description: value.description.trim(),
    commits: value.commits,
    isPublic: value.isPublic,
    icon: safeIcon(value.icon),
    category: oneOf(projectCategories, value.category),
    status: oneOf(projectStatuses, value.status),
    readme,
  };
}

/** Valid, public, first occurrence only (case-insensitive repo), keeping the given order. */
function parseProjectList(value: unknown, exclude: Set<string>) {
  const result: ProfileProject[] = [];
  for (const entry of Array.isArray(value) ? value : []) {
    const project = parseProject(entry);
    const key = project?.repo.toLowerCase();
    if (!project || !key || !project.isPublic || exclude.has(key)) continue;
    exclude.add(key);
    result.push(project);
  }
  return result;
}

function parseContributions(value: unknown): Contributions | null {
  if (!isRecord(value) || !isCount(value.total) || !Array.isArray(value.weeks) || value.weeks.length > 60) return null;
  const from = dayStamp(value.from);
  const to = dayStamp(value.to);
  if (from === null || to === null || from > to) return null;
  const weeks: Contributions["weeks"] = [];
  for (const week of value.weeks) {
    if (!isRecord(week) || !Array.isArray(week.days) || week.days.length > 7) return null;
    const days: ContributionDay[] = [];
    for (const day of week.days) {
      if (!isRecord(day)) return null;
      const stamp = dayStamp(day.date);
      const weekday = day.weekday;
      if (stamp === null || stamp < from || stamp > to) return null;
      if (typeof weekday !== "number" || new Date(stamp).getUTCDay() !== weekday) return null;
      if (!isCount(day.count) || !isCount(day.level) || day.level > 4) return null;
      days.push({ date: day.date as string, weekday, count: day.count, level: day.level });
    }
    weeks.push({ days });
  }
  return { from: value.from as string, to: value.to as string, total: value.total, weeks };
}

/**
 * Validates untrusted profile JSON (schemas 1–3). A wrong schema or source returns
 * null; an invalid, private or duplicate project is dropped on its own; invalid
 * contributions become null so the field shows no activity rather than guessed activity.
 */
export function parseGithubProfile(value: unknown): GithubProfile | null {
  if (!isRecord(value) || (value.schemaVersion !== 1 && value.schemaVersion !== 2 && value.schemaVersion !== 3)) return null;
  if (typeof value.generatedAt !== "string" || Number.isNaN(Date.parse(value.generatedAt))) return null;
  if (typeof value.sourceReadme !== "string" || !value.sourceReadme.startsWith("https://github.com/gustavonline/gustavonline/")) return null;
  if (!isCount(value.windowDays) || value.windowDays === 0 || !Array.isArray(value.projects)) return null;
  const seen = new Set<string>();
  const projects = parseProjectList(value.projects, seen);
  const moreProjects = value.schemaVersion >= 2 ? parseProjectList(value.moreProjects, seen) : [];
  return {
    schemaVersion: value.schemaVersion,
    generatedAt: value.generatedAt,
    windowDays: value.windowDays,
    projects,
    moreProjects,
    contributions: parseContributions(value.contributions),
  };
}

/**
 * Chooses between the bundled snapshot and a refreshed remote copy: a newer schema
 * always wins, so older remote data never replaces a snapshot with README prose;
 * within one schema, the copy generated at the same time or later wins.
 */
export function preferProfile(snapshot: GithubProfile | null, remote: GithubProfile | null) {
  if (!remote) return snapshot;
  if (!snapshot) return remote;
  if (remote.schemaVersion !== snapshot.schemaVersion) return remote.schemaVersion > snapshot.schemaVersion ? remote : snapshot;
  return Date.parse(remote.generatedAt) >= Date.parse(snapshot.generatedAt) ? remote : snapshot;
}

export type ContributionGrid = {
  /** Weeks shown (oldest first); each column holds weekday rows 0 (Sunday) to 6. */
  columns: number;
  /** Level per cell at `column * 7 + weekday`; -1 where the data has no day. */
  levels: Int8Array;
  from: string;
  to: string;
  total: number;
};

/**
 * Maps real contribution days onto a weeks × 7 grid. If fewer columns fit, it
 * keeps the most recent contiguous weeks and reports the range actually shown.
 * Days are never repeated, invented or reordered to fill space.
 */
export function contributionGrid(contributions: Contributions, maxColumns: number): ContributionGrid | null {
  if (!Number.isFinite(maxColumns) || maxColumns < 1) return null;
  const weeks = contributions.weeks.slice(-Math.max(0, Math.floor(maxColumns)));
  const days = weeks.flatMap((week) => week.days);
  if (!days.length) return null;
  const levels = new Int8Array(weeks.length * 7).fill(-1);
  weeks.forEach((week, column) => week.days.forEach((day) => (levels[column * 7 + day.weekday] = day.level)));
  const dates = days.map((day) => day.date).sort();
  return {
    columns: weeks.length,
    levels,
    from: dates[0],
    to: dates[dates.length - 1],
    total: days.reduce((sum, day) => sum + day.count, 0),
  };
}

/**
 * The focus projects. Schemas 2–3: the first three, exactly in the projection's order
 * (two projects may share an owner). Schema 1 (legacy): one per owner in owner order.
 */
export function selectedProjects(profile: GithubProfile) {
  if (profile.schemaVersion >= 2) return profile.projects.slice(0, 3);
  return projectOwners
    .map((owner) => profile.projects.find((project) => project.owner === owner))
    .filter((project): project is ProfileProject => project !== undefined);
}
