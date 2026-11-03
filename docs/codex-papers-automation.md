# Content and newsletter workflow

The original PapersDB is now the unified Content source. This document describes
editorial routing; it does not create or enable a scheduled editorial job.
The owner's existing context-maintenance job reads Content and does not author,
publish, send email or synchronize subscribers.

## Sources and ownership

- Content source: `collection://ba101532-8866-4388-9597-1d07465e495b`.
- `Type = Source`: own or external reference material; preserve provenance and review status.
- `Type = Content`: an idea or production, with source relations and production links.
- `Type = Edition`: an independently edited channel version, related to its parent production.
- Knowledge owns maintained business context, voice and selected configuration.
- Kit owns live email sending and unsubscribe operations. A separate Subscribers
  database may mirror the list; it is not part of Content or this Worker.

The existing newsletter draft retains its original page identity and body.
`PapersDB` and `NOTION_PAPERS_DATA_SOURCE_ID` are historical/compatibility names,
not instructions to create another database.

## Authorized editorial work

Use the owner's chosen content workflow and current voice/configuration. A quick
capture can remain incomplete. Prepare metadata or a revised draft only within
the current task's authority; preserve human originals and source relationships.
An editorial review can mark a piece Ready, but Ready does not mean Published.

Choose a real channel edition and destination before publishing. Set Publish date
when the piece is actually published, not when it is captured or summarized.
Record the actual public URL and connect the edition to its production. Sending
an email is a separate action; neither Channels = Newsletter nor Send as
newsletter grants send authority. This task enables no automatic publishing,
Kit broadcast creation or sending.

## Website feed

`GET /posts` returns public metadata only for records with all of:

- Status = Published;
- Type = Content or Edition;
- Channels includes Website;
- an explicit HTTPS Public URL pointing to the published destination.

The adapter applies both a Notion query filter and an output eligibility check.
It excludes sources, drafts and newsletter-only editions and returns only title,
summary, publication date and public URL. The Worker does not render article
bodies or manufacture `/notes/:slug` pages. A provider access error is an
unavailable response, rather than a successful empty collection.

Production verification must confirm the selected Notion connection can query
Content. Do not publish an unfinished issue or send mail to exercise the feed.
The archive can legitimately be empty until public pieces exist.
