# Content and newsletter workflow

Write with Gustav and Lumi in the existing Notion Content database. Source rows
preserve reference material, Content rows represent productions, and Edition
rows are edited channel versions. Preserve originals, provenance and relations.
Ready is not Published; publication requires the owner's editorial approval.

The Worker renders explicitly published newsletter editions and prepares private,
unscheduled Kit drafts every 15 minutes. It never authors or publishes editions
and never sends a broadcast. No general editorial job or subscriber-to-Notion
sync is added. Kit owns sending and unsubscribe operations.

Follow the [Worker workflow and release instructions](../worker/README.md) for
properties, eligibility, supported blocks, duplicate recovery and checks. Set
Edition + Newsletter format, Title, Summary, a unique Slug, its exact
`https://gustavonline.com/notes/<slug>` Public URL, a due Publish date and Published
status. These editions appear in The Bookshelf without requiring a Website
channel. Other website content retains the explicit Website channel boundary.

`Send as newsletter` requests only a Kit draft after web publication. The Worker
records `Kit broadcast id`; Gustav reviews and sends in Kit. Changes after draft
creation are reconciled manually so automation cannot overwrite editorial edits
or send twice. Existing drafts, including ones with the checkbox set, stay private.

Source: `collection://ba101532-8866-4388-9597-1d07465e495b`. PapersDB and
NOTION_PAPERS_DATA_SOURCE_ID are compatibility names, not instructions to create
another database. Context maintenance gains no publication or send authority.
