import { Fragment } from "react";

// Matches the profile updater's deliberately small README attribution format.
// Everything else stays React text, including HTML and unsupported link syntax.
const githubAttribution = /(?<!!)\[([^\[\]\r\n]+)\]\((https:\/\/github\.com\/[A-Za-z0-9-]+(?:\/[A-Za-z0-9_.-]+)?\/?)\)/g;

export function StoryParagraph({ text }: { text: string }) {
  const parts = [];
  let cursor = 0;
  for (const match of text.matchAll(githubAttribution)) {
    parts.push(<Fragment key={match.index}>
      {text.slice(cursor, match.index)}
      <a href={match[2]} target="_blank" rel="noopener noreferrer">{match[1]}</a>
    </Fragment>);
    cursor = match.index + match[0].length;
  }
  return <p>{parts}{text.slice(cursor)}</p>;
}
