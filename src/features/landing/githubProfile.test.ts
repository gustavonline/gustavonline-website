import { describe, expect, it } from "vitest";

import { contributionGrid, parseGithubProfile, preferProfile, selectedProjects } from "./githubProfile";
import { resolveMore, resolveWork } from "./selectedWork";

/*
 * SYNTHETIC TEST FIXTURE — invented values for behaviour tests only.
 * This is not real GitHub activity and is never shipped as site data.
 */
type RawProject = { owner: string; repo: string; name: string; url: string; description: string; commits: number; isPublic: boolean; icon?: string; status?: string; category?: string; readme?: unknown };

const rawProjects = (): RawProject[] => [
  { owner: "onlinesourdough", repo: "onlinesourdough/AIOS-Plugin", name: "AIOS", url: "https://github.com/onlinesourdough/AIOS-Plugin", description: "Synthetic.", commits: 4, isPublic: true },
  { owner: "arcitai", repo: "arcitai/factory", name: "Factory", url: "https://github.com/arcitai/factory", description: "Synthetic.", commits: 7, isPublic: true },
  { owner: "gustavonline", repo: "gustavonline/hidden-tool", name: "Hidden", url: "https://github.com/gustavonline/hidden-tool", description: "Synthetic private.", commits: 9, isPublic: false },
  { owner: "gustavonline", repo: "gustavonline/sample-app", name: "Sample App", url: "https://github.com/gustavonline/sample-app", description: "A synthetic public description.", commits: 1, isPublic: true },
];

const syntheticProfile = () => ({
  schemaVersion: 1,
  generatedAt: "2026-10-18T08:00:00Z",
  sourceReadme: "https://github.com/gustavonline/gustavonline/blob/main/README.md",
  sourceRevision: "synthetic-fixture",
  windowDays: 30,
  projects: rawProjects(),
  contributions: {
    from: "2026-10-04",
    to: "2026-10-15",
    total: 6,
    weeks: [
      // 2026-10-04 is a Sunday (weekday 0).
      { days: [{ date: "2026-10-04", weekday: 0, count: 0, level: 0 }, { date: "2026-10-05", weekday: 1, count: 3, level: 2 }] },
      { days: [{ date: "2026-10-11", weekday: 0, count: 1, level: 1 }, { date: "2026-10-14", weekday: 3, count: 2, level: 4 }] },
      { days: [{ date: "2026-10-15", weekday: 4, count: 0, level: 0 }] },
    ],
  },
});

describe("profile validation", () => {
  it("accepts the documented schema", () => {
    const profile = parseGithubProfile(syntheticProfile());
    // The private entry is dropped at parse time.
    expect(profile?.projects).toHaveLength(3);
    expect(profile?.contributions?.weeks).toHaveLength(3);
  });

  it("rejects a wrong schema version or a foreign source README", () => {
    expect(parseGithubProfile({ ...syntheticProfile(), schemaVersion: 4 })).toBeNull();
    expect(parseGithubProfile({ ...syntheticProfile(), sourceReadme: "https://example.com/README.md" })).toBeNull();
    expect(parseGithubProfile("not json object")).toBeNull();
  });

  it("drops projects with a foreign owner, a non-GitHub or mismatched URL, or a negative count", () => {
    const raw = syntheticProfile();
    raw.projects = [
      { ...raw.projects[0], owner: "someone-else", repo: "someone-else/x", url: "https://github.com/someone-else/x" },
      { ...raw.projects[1], url: "http://github.com/arcitai/factory" },
      { ...raw.projects[1], url: "https://evil.example/arcitai/factory" },
      { ...raw.projects[1], commits: -1 },
      raw.projects[3],
    ];
    expect(parseGithubProfile(raw)?.projects.map((project) => project.repo)).toEqual(["gustavonline/sample-app"]);
  });

  it("keeps only local asset icons, no external URLs", () => {
    const raw = syntheticProfile();
    raw.projects = [
      { ...raw.projects[0], icon: "/assets/project-marks/aios.svg" },
      { ...raw.projects[1], icon: "javascript:alert(1)" },
      { ...raw.projects[3], icon: "https://raw.githubusercontent.com/gustavonline/x/icon.svg" },
    ];
    const projects = parseGithubProfile(raw)?.projects ?? [];
    expect(projects[0].icon).toBe("/assets/project-marks/aios.svg");
    expect(projects[1].icon).toBeUndefined();
    expect(projects[2].icon).toBeUndefined();
  });

  it("refuses contributions with an out-of-range level, a wrong weekday or a date outside the range", () => {
    for (const day of [
      { date: "2026-10-05", weekday: 1, count: 1, level: 5 },
      { date: "2026-10-05", weekday: 2, count: 1, level: 1 },
      { date: "2026-10-20", weekday: 2, count: 1, level: 1 },
      { date: "2026-02-30", weekday: 1, count: 1, level: 1 },
    ]) {
      const raw = syntheticProfile();
      raw.contributions.weeks[0].days[1] = day;
      expect(parseGithubProfile(raw)?.contributions).toBeNull();
    }
  });
});

describe("contribution grid", () => {
  const contributions = parseGithubProfile(syntheticProfile())!.contributions!;

  it("places each real day at its week column and weekday row; absent days stay empty", () => {
    const grid = contributionGrid(contributions, 60)!;
    expect(grid.columns).toBe(3);
    expect(grid.levels[0 * 7 + 1]).toBe(2);
    expect(grid.levels[1 * 7 + 3]).toBe(4);
    expect(grid.levels[1 * 7 + 6]).toBe(-1);
    expect(grid.levels[2 * 7 + 5]).toBe(-1);
    expect(grid.from).toBe("2026-10-04");
    expect(grid.to).toBe("2026-10-15");
    expect(grid.total).toBe(6);
  });

  it("keeps the most recent contiguous weeks when fewer columns fit, and reports that range", () => {
    const grid = contributionGrid(contributions, 2)!;
    expect(grid.columns).toBe(2);
    expect(grid.levels[0 * 7 + 3]).toBe(4);
    expect(grid.from).toBe("2026-10-11");
    expect(grid.total).toBe(3);
  });

  it("never invents cells when there is no data", () => {
    expect(contributionGrid({ ...contributions, weeks: [] }, 10)).toBeNull();
    expect(contributionGrid(contributions, 0)).toBeNull();
    expect(contributionGrid(contributions, -1)).toBeNull();
  });
});

describe("selected projects", () => {
  it("takes one public project per owner in the fixed owner order", () => {
    const profile = parseGithubProfile(syntheticProfile())!;
    expect(selectedProjects(profile).map((project) => project.repo)).toEqual([
      "arcitai/factory",
      "onlinesourdough/AIOS-Plugin",
      "gustavonline/sample-app",
    ]);
  });

  it("uses the projection for every repository, with one uniform Explore label", () => {
    const work = resolveWork(parseGithubProfile(syntheticProfile()));
    expect(work.map((item) => item.title)).toEqual(["Factory", "AIOS", "Sample App"]);
    expect(work[0].paragraphs).toEqual(["Synthetic."]);
    expect(work[2].paragraphs).toEqual(["A synthetic public description."]);
    // Commit counts stay internal: no visible activity line for unknown projects.
    expect(JSON.stringify(work[2])).not.toMatch(/commit/i);
    expect(work[2].source?.href).toBe("https://github.com/gustavonline/sample-app");
    expect(work.map((item) => item.source.label)).toEqual(["Explore Factory", "Explore AIOS", "Explore Sample App"]);
    expect(work.map((item) => item.brand)).toEqual(["arcitai", "onlinesourdough", "gustav"]);
  });

  it("has no independent catalog without data and follows a project's current name", () => {
    expect(resolveWork(null)).toEqual([]);
    const raw = syntheticProfile();
    raw.projects[3] = {
      owner: "gustavonline",
      repo: "gustavonline/codex-claude-bridge",
      name: "Renamed Bridge",
      url: "https://github.com/gustavonline/codex-claude-bridge",
      description: "Synthetic.",
      commits: 2,
      isPublic: true,
    };
    const bridge = resolveWork(parseGithubProfile(raw))[2];
    expect(bridge.title).toBe("Renamed Bridge");
    expect(bridge.source?.href).toBe("https://github.com/gustavonline/codex-claude-bridge");
    expect(bridge.source.label).toBe("Explore Renamed Bridge");
  });
});

/* SYNTHETIC TEST FIXTURE (schema 2) — invented values, not real activity. */
const project = (repo: string, extra: Partial<RawProject> = {}): RawProject => ({
  owner: repo.split("/")[0],
  repo,
  name: repo.split("/")[1],
  url: `https://github.com/${repo}`,
  description: "Synthetic.",
  commits: 1,
  isPublic: true,
  ...extra,
});

const syntheticV2 = () => ({
  ...syntheticProfile(),
  schemaVersion: 2,
  readmeSha256: "synthetic",
  projects: [project("arcitai/factory"), project("arcitai/agentic-powerbi-system"), project("onlinesourdough/AIOS-Plugin")],
  moreProjects: [
    project("gustavonline/pi-desktop", { status: "Community handoff", category: "community" }),
    project("arcitai/factory"),
    project("gustavonline/hidden", { isPublic: false }),
    project("someone/else"),
    project("gustavonline/youtube-content", { category: "resources", status: "Resources", icon: "https://example.com/x.svg" }),
    project("gustavonline/pi-desktop"),
  ],
});

describe("schema 2", () => {
  it("shows the focus projects exactly in the projection's order, even two from one owner", () => {
    const profile = parseGithubProfile(syntheticV2())!;
    expect(selectedProjects(profile).map((item) => item.repo)).toEqual(["arcitai/factory", "arcitai/agentic-powerbi-system", "onlinesourdough/AIOS-Plugin"]);
    expect(resolveWork(profile).map((item) => item.brand)).toEqual(["arcitai", "arcitai", "onlinesourdough"]);
  });

  it("keeps more projects in order, without focus duplicates, private, invalid or repeated entries", () => {
    const more = resolveMore(parseGithubProfile(syntheticV2()));
    expect(more.map((item) => item.title)).toEqual(["pi-desktop", "youtube-content"]);
    // A handed-off project reads as open to maintainers, not as actively maintained;
    // default statuses ("Resources", "Open source") add no note; rows carry no description.
    expect(more[0].note).toBe("Open to maintainers");
    expect(more[1].note).toBeUndefined();
    expect(Object.keys(more[0]).sort()).toEqual(["brand", "href", "id", "note", "title"]);
  });

  it("maps the same days onto the same date grid as schema 1", () => {
    const v1 = contributionGrid(parseGithubProfile(syntheticProfile())!.contributions!, 60)!;
    const v2 = contributionGrid(parseGithubProfile(syntheticV2())!.contributions!, 60)!;
    expect(Array.from(v2.levels)).toEqual(Array.from(v1.levels));
    expect([v2.from, v2.to, v2.total]).toEqual([v1.from, v1.to, v1.total]);
  });

  it("never lets an older remote schema 1 replace a valid schema 2 snapshot, even if generated later", () => {
    const snapshot = parseGithubProfile(syntheticV2())!;
    const olderSchema = parseGithubProfile({ ...syntheticProfile(), generatedAt: "2026-12-01T00:00:00Z" })!;
    expect(preferProfile(snapshot, olderSchema)).toBe(snapshot);
    const newerV2 = parseGithubProfile({ ...syntheticV2(), generatedAt: "2026-12-01T00:00:00Z" })!;
    expect(preferProfile(snapshot, newerV2)).toBe(newerV2);
    expect(preferProfile(snapshot, null)).toBe(snapshot);
  });

  it("shows no more projects for schema 1 or without data", () => {
    expect(resolveMore(parseGithubProfile(syntheticProfile()))).toEqual([]);
    expect(resolveMore(null)).toEqual([]);
  });
});

describe("project README prose (schema 3)", () => {
  const source = () => ({
    section: "Why I built this", revision: "a".repeat(40), sha256: "b".repeat(64),
    url: `https://github.com/arcitai/factory/blob/${"a".repeat(40)}/README.md#why-i-built-this`,
    paragraphs: ["My reason for building it.", "The technical approach."],
  });
  const profile = () => ({ ...syntheticV2(), schemaVersion: 3, projects: [project("arcitai/factory", { readme: source() }), ...syntheticV2().projects.slice(1)] });

  it("renders README paragraphs in order without status, role or result fields", () => {
    const parsed = parseGithubProfile(profile())!;
    const item = resolveWork(parsed)[0];
    expect(item.paragraphs).toEqual(source().paragraphs);
    expect(item.source.label).toBe("Explore factory");
    expect(Object.keys(item)).not.toContain("status");
    expect(Object.keys(item)).not.toContain("facts");
    expect(selectedProjects(parsed)).toHaveLength(3);
    const newerLegacy = parseGithubProfile({ ...syntheticV2(), generatedAt: "2027-01-01T00:00:00Z" });
    expect(preferProfile(parsed, newerLegacy)).toBe(parsed);
  });

  it("rejects foreign provenance, malformed or oversized prose, and never exposes a private story", () => {
    for (const patch of [{ url: "https://example.com/README.md" }, { revision: "unknown" }, { paragraphs: [] }, { paragraphs: [null] }, { paragraphs: ["x".repeat(301)] }, { paragraphs: ["A", "B", "C", "D", "E"] }]) {
      const raw = profile();
      raw.projects[0].readme = { ...source(), ...patch };
      expect(parseGithubProfile(raw)?.projects.some((p) => p.repo === "arcitai/factory")).toBe(false);
    }
    const raw = profile();
    raw.projects[0].isPublic = false;
    expect(resolveWork(parseGithubProfile(raw)).some((p) => p.title === "factory")).toBe(false);
  });

  it("accepts an explicitly labelled local preview, without pretending it is an immutable GitHub source", () => {
    const raw = profile();
    raw.projects[0].readme = { ...source(), revision: "local-preview", url: "https://github.com/arcitai/factory/blob/main/README.md#why-i-built-this" };
    expect(parseGithubProfile(raw)?.projects[0].readme?.revision).toBe("local-preview");
    raw.projects[0].readme = { ...source(), revision: "local-preview" };
    expect(parseGithubProfile(raw)?.projects.some((p) => p.repo === "arcitai/factory")).toBe(false);
  });
});
