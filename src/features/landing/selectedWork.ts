import { ownerBrands, type MarkBrand } from "./components/brandMarks";
import { selectedProjects, type GithubProfile, type ProfileProject, type ProjectStatus } from "./githubProfile";

/** What one focus tab and its panel show. Unknown projects get facts from the projection only. */
export type WorkItem = {
  id: string;
  brand: MarkBrand;
  title: string;
  icon?: string;
  monogram: string;
  paragraphs: string[];
  source: { label: string; href: string };
};

/** One row in the "More projects" directory: name, an optional short note and a link. Nothing else. */
export type MoreItem = {
  id: string;
  brand: MarkBrand;
  title: string;
  note?: string;
  href: string;
};

/** Human notes for the More list. Statuses that are the list's default ("Open source", "Resources") show nothing. */
const moreNotes: Partial<Record<ProjectStatus, string>> = {
  "Community handoff": "Open to maintainers",
  "Community maintained": "Community maintained",
  "In development": "In development",
  "Public preview": "Public preview",
};

const itemId = (repo: string) => repo.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const monogram = (name: string) => name.trim().charAt(0).toUpperCase() || "?";
/** Project README prose when available, otherwise its profile summary. */
function fromProject(project: ProfileProject): WorkItem {
  return {
    id: itemId(project.repo),
    brand: ownerBrands[project.owner],
    title: project.name,
    icon: project.icon,
    monogram: monogram(project.name),
    paragraphs: project.readme?.paragraphs ?? [project.description],
    source: { label: `Explore ${project.name}`, href: project.url },
  };
}

/** Selection, names and prose all follow the same validated projection. */
export function resolveWork(profile: GithubProfile | null): WorkItem[] {
  return profile ? selectedProjects(profile).map(fromProject) : [];
}

/**
 * "More projects": every valid public entry the projection lists, in its order, as a
 * name and link with an optional human note. Descriptions stay in the README.
 */
export function resolveMore(profile: GithubProfile | null): MoreItem[] {
  return (profile?.moreProjects ?? []).map((project) => ({
    id: itemId(project.repo),
    brand: ownerBrands[project.owner],
    title: project.name,
    note: project.status ? moreNotes[project.status] : undefined,
    href: project.url,
  }));
}
