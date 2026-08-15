import { Link } from "@tanstack/react-router";

import { siteData } from "../../../site-data";
import { useWriting } from "../hooks/useWriting";

export function WritingSection() {
  const writingQuery = useWriting();
  const posts = writingQuery.data ?? [];

  if (!writingQuery.isPending && !writingQuery.isError && posts.length === 0) {
    return null;
  }

  return (
    <section className="writing-section" aria-labelledby="notes-title">
      <div className="notes-heading">
        <p className="section-label" id="notes-title">
          {writingQuery.isFetching ? siteData.writing.loadingLabel : siteData.writing.label}
        </p>
        <Link to="/newsletter">Archive <span aria-hidden="true">→</span></Link>
      </div>

      {writingQuery.isError ? (
        <div className="notes-state" role="status">
          <strong>The notes could not be reached.</strong>
          <p>Please try again later. No local entries are shown as published.</p>
        </div>
      ) : (
        <div className="note-list">
          {posts.map((post) => (
            <a href={post.url} key={`${post.url}-${post.title}`}>
              <span>{post.date}</span>
              <strong>{post.title}</strong>
              <p>{post.summary}</p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
