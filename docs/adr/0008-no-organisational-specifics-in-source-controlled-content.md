# No organisational specifics in source-controlled content

## Context

The ideas workbench (`data/ideas/`) holds pre-drafting material that often
originates from day-job engineering work. Idea pages render only behind the
admin login — but the *files* are committed to this repository, and repo
visibility is not an access-control mechanism: clones, forks, CI logs, and
git history all outlive any rendering restriction. A workbench file that
cites employer repo names, ticket IDs, internal article/spec identifiers,
commit SHAs, or colleague names has published them regardless of what the
website shows.

This became concrete when survey-generated backlog material landed with
exact employer repo names, ticket prefixes, internal knowledge-base article
IDs, and colleague attribution embedded in evidence pointers. Sanitising
the working tree alone was insufficient — the specifics survived in branch
history, which required rewriting.

## Decision

**Organisational specifics are excluded from every source-controlled file
in this repository, including `data/ideas/`.** Rendering visibility
(admin-only, draft, unlisted) grants no exemption; the test is "is it in
git", not "is it on the site".

Excluded:

- Employer/org repository names and branch names
- Ticket / issue identifiers and internal tracker prefixes
- Internal system, spec, and knowledge-base article identifiers
- Commit SHAs from organisational repositories
- Colleague names and attribution for org work
- Internal URLs, hostnames, and org account identifiers

Permitted:

- Generic descriptors ("the frontend monorepo", "the data platform repo",
  "a colleague led X") — description, not identification
- Technology names, cloud services, and open-source project references
- Rounded magnitudes for internal figures, decided per post
- Personal-project repo names (they are the author's own)

Detailed evidence trails (exact repos, paths, commits) live **outside this
repository** — in the research session, private notes, or re-mined on
demand when drafting. Idea files say *where to look*, not *what it's
called*.

Naming employer systems in a **published post** remains a per-post decision
requiring explicit sign-off (the virtual-monorepo post is the deliberate
precedent), made at drafting time — never inherited by default from
workbench material.

## Consequences

- Workbench evidence pointers are deliberately vaguer; each promoted idea
  carries a "re-mine the evidence privately" step in its checklist.
- If organisational specifics land in a commit by mistake, sanitising the
  file is not enough — the branch history must be rewritten (or the branch
  squashed) before merge, since the specifics live in every commit that
  contained them.
- Agents working in this repo must apply this policy to generated content
  *before* committing, not as a cleanup pass.
