# Codex Papers Automation

This is the operating instruction for the recurring Codex automation that helps run `gustavonline` notes/newsletter from Notion.

## Goal

Gustav should only have to open Notion, create a new page in `PapersDB`, write the title/body, and leave. Codex handles metadata, publishing state, and a short report.

## Sources

- Notion page: `https://app.notion.com/p/37f2e04d50d180f38957f69858347b95`
- Papers data source: `collection://23fa9322-f9ee-4ffc-8c5a-a44a88b281e9`
- Subscribers data source: `collection://871559d8-1ebf-40c0-a951-fdbc00881606`
- Main writing view: `Write`

## PapersDB Schema

Human-facing field:

- `Title`

Automation/system fields:

- `Status`: `Draft`, `Ready`, `Published`, `Archived`
- `Publish date`
- `Slug`
- `Summary`
- `Tags`: `AI`, `IT architecture`, `client work`, `templates`, `life`
- `Send as newsletter`
- `Kit broadcast id`
- `Public URL`
- `Last processed`

## Daily Behavior

Run once per day.

1. Query `PapersDB` for pages where `Last processed` is empty, or `Status` is empty, or `Status = Draft`.
2. Read the page title and page body.
3. Skip empty pages with no meaningful body content.
4. If `Status` is empty, set `Status = Draft`.
5. If the page has a meaningful body, fill missing metadata:
   - `Slug`: lowercase URL-safe slug from title.
   - `Summary`: one concise sentence.
   - `Tags`: 1-3 relevant tags from the allowed tag set.
   - `Publish date`: today, unless the content clearly indicates another intended date.
6. If the page is coherent enough to publish, set `Status = Ready`.
7. Do not set `Status = Published` until the publishing flow has been tested.
8. Do not send email automatically.
9. Set `Last processed` to the current date/time after changes.
10. Return a short report:
    - pages processed
    - pages moved to `Ready`
    - pages skipped
    - anything Gustav should review

## Newsletter Rule

Version one is conservative:

- Codex may set `Send as newsletter = true` only when the note reads like a complete email/newsletter.
- Codex must not create or send Kit broadcasts automatically yet.
- When Kit is connected, Codex can prepare a Kit draft only after this repo contains the final Kit workflow instructions.

## Publishing Rule

Cloudflare exposes only notes where:

- `Status = Published`

Later, after the flow is trusted:

- Codex may move `Ready` to `Published` when Gustav explicitly asks for it or when the automation policy is changed.

## Suggested Automation Prompt

```txt
Use the instructions in docs/codex-papers-automation.md.

Check the gustavonline Notion PapersDB.
Process new or draft papers conservatively:
- fill missing metadata
- set coherent drafts to Ready
- do not publish
- do not send email
- report what changed
```

