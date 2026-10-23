import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { PanelsTopLeft } from "lucide-react";

import { siteData } from "../../../site-data";
import type { GithubProfile } from "../githubProfile";
import { nextTabIndex } from "../hooks/projectTabs";
import { resolveMore, resolveWork, type MoreItem, type WorkItem } from "../selectedWork";
import { StoryParagraph } from "./StoryParagraph";

const MORE_ID = "more";

/*
 * "Current work": the focus projects as tabs (real project icons and names),
 * plus a fourth "More projects" tab holding a quiet directory of the remaining
 * projects. Both follow the GitHub profile projection, including its bundled snapshot.
 * All panels overlap in one grid, so switching never changes the section height.
 * Focus panels share two aligned rows (subgrid); the More panel
 * spans a final flexible row, so a longer list adds space only below, never inside a
 * focus case. Inactive panels are invisible and inert. `data-brand` is internal: it
 * opens the related mark in the hero field.
 */
export function SelectedWork({ profile }: { profile: GithubProfile | null }) {
  const { title, moreTitle } = siteData.selectedWork;
  const items = resolveWork(profile);
  const more = resolveMore(profile);
  const tabIds = [...items.map((item) => item.id), ...(more.length ? [MORE_ID] : [])];
  const [chosen, setChosen] = useState(0);
  const active = Math.min(chosen, Math.max(0, tabIds.length - 1));
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const sectionRef = useRef<HTMLElement>(null);

  // Direct links to #selected-work land on the section once it has rendered.
  useEffect(() => {
    if (window.location.hash !== "#selected-work") return;
    const frame = window.requestAnimationFrame(() => sectionRef.current?.scrollIntoView());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = nextTabIndex(active, event.key, tabIds.length);
    if (next === null) return;
    event.preventDefault();
    setChosen(next);
    tabs.current[next]?.focus();
  };

  const tabProps = (index: number) => ({
    ref: (element: HTMLButtonElement | null) => {
      tabs.current[index] = element;
    },
    className: "work-tab",
    type: "button" as const,
    role: "tab",
    id: `work-tab-${tabIds[index]}`,
    "aria-selected": index === active,
    "aria-controls": `work-panel-${tabIds[index]}`,
    tabIndex: index === active ? 0 : -1,
    onClick: () => setChosen(index),
  });

  return (
    <section ref={sectionRef} id="selected-work" className="selected-work" aria-labelledby="selected-work-title">
      <header className="selected-work-heading">
        <h2 id="selected-work-title">{title}</h2>
      </header>
      <div className={`work-tablist work-tablist-${tabIds.length}`} role="tablist" aria-label="Projects" onKeyDown={onKeyDown}>
        {items.map((item, index) => (
          <button key={item.id} {...tabProps(index)} data-brand={item.brand} aria-label={item.title === "The Onlinesourdough Method" ? "The Onlinesourdough Method (OSM)" : item.title} title={item.title}>
            <ProjectIcon icon={item.icon} monogram={item.monogram} />
            <span className="work-tab-title">
              {(item.title === "The Onlinesourdough Method" ? "OSM" : item.title).split(/(?<=[a-z])(?=[A-Z])/).map((part, index) => (
                <Fragment key={index}>
                  {index > 0 && <wbr />}
                  {part}
                </Fragment>
              ))}
            </span>
          </button>
        ))}
        {more.length > 0 && (
          <button key={MORE_ID} {...tabProps(items.length)} className="work-tab work-tab-more">
            <span className="work-icon work-more-icon" aria-hidden="true"><PanelsTopLeft size={19} strokeWidth={1.65} /></span>
            <span className="work-tab-title">{moreTitle}</span>
          </button>
        )}
      </div>
      <div className="work-panels">
        {items.map((item, index) => (
          <ProjectPanel key={item.id} item={item} active={index === active} />
        ))}
        {more.length > 0 && <MorePanel items={more} active={active === items.length} />}
      </div>
    </section>
  );
}

/** The real project icon, or a quiet monogram tile when none is known or the asset fails to load. */
function ProjectIcon({ icon, monogram }: { icon?: string; monogram: string }) {
  const [failed, setFailed] = useState(false);
  if (icon && !failed) return <img className="work-icon" src={icon} alt="" onError={() => setFailed(true)} />;
  return (
    <span className="work-icon work-monogram" aria-hidden="true">
      {monogram}
    </span>
  );
}

function ProjectPanel({ item, active }: { item: WorkItem; active: boolean }) {
  return (
    <div
      className={`work-panel${active ? " is-active" : ""}`}
      role="tabpanel"
      id={`work-panel-${item.id}`}
      aria-labelledby={`work-tab-${item.id}`}
      inert={!active}
      tabIndex={active ? 0 : -1}
      data-brand={item.brand}
    >
      <div className="work-copy">
        {item.paragraphs.map((paragraph, index) => <StoryParagraph key={index} text={paragraph} />)}
      </div>
      <a className="work-source" href={item.source.href} target="_blank" rel="noopener noreferrer">
        {item.source.label} <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}

/** A quiet directory: one link row each with name, faint leader, optional short note and arrow. */
function MorePanel({ items, active }: { items: MoreItem[]; active: boolean }) {
  return (
    <div
      className={`work-panel work-panel-more${active ? " is-active" : ""}`}
      role="tabpanel"
      id={`work-panel-${MORE_ID}`}
      aria-labelledby={`work-tab-${MORE_ID}`}
      inert={!active}
      tabIndex={active ? 0 : -1}
    >
      <ul className="work-directory">
        {items.map((item) => (
          <li key={item.id} data-brand={item.brand}>
            <a href={item.href} target="_blank" rel="noopener noreferrer">
              <span className="work-directory-name">{item.title}</span>
              <span className="work-directory-leader" aria-hidden="true" />
              {item.note && <span className="work-directory-note">{item.note}</span>}
              <span className="work-directory-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
