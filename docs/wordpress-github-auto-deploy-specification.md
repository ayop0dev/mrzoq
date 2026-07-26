# WordPress to GitHub Auto-Deploy Specification

## 1. Objective

When a publicly visible WordPress item on `https://blog.mrzoq.com` is created, updated, unpublished, restored, or deleted, the Astro frontend at `https://mrzoq.com` must reflect that change within one automated deployment cycle, without any manual "Redeploy" click and without any manual `git push`.

Success is defined as: a qualifying WordPress change results in exactly one new commit on `main`, which Hostinger's existing auto-deploy-on-push behavior picks up, runs `npm run build`, and produces a fresh Astro build that reflects the current WordPress REST API state.

Non-qualifying WordPress changes (autosaves, revisions, draft-only edits, unrelated settings) must produce zero commits and zero deployments.

## 2. Fixed Architecture

| Item | Value |
|---|---|
| Public frontend | `https://mrzoq.com` |
| CMS backend | `https://blog.mrzoq.com` |
| Frontend framework | Astro |
| Astro output mode | `static` (verified: `astro.config.mjs`, `output: 'static'`, no adapter) |
| Hosting platform | Hostinger Node.js Web App |
| Git repository | GitHub |
| Deployment branch | `main` |
| Deployment trigger (existing) | Hostinger runs an automatic deployment after every push to `main` |
| Build command (existing) | `npm run build` |
| Output directory (existing) | `dist` |
| Content fetch behavior (verified) | Every Astro build fetches fresh content directly from the live WordPress REST API (`src/lib/wordpress.js`); no cache layer exists |
| Content storage | WordPress content is not stored in Git |
| Verified manual path | Clicking Hostinger "Redeploy" successfully fetches newly published WordPress content |
| Missing component | An automatic WordPress → GitHub push trigger |
| Excluded platforms | Netlify, Cloudflare — not used anywhere in this stack |

## 3. Scope

**Will create:**

- One lightweight custom WordPress plugin (event detection + GitHub dispatch client).
- One GitHub Actions workflow (`workflow_dispatch`-triggered, audit + commit + push).
- One Git-tracked JSONL audit log (`automation/wordpress-sync-log.jsonl`).
- Required GitHub secrets/configuration and WordPress-side configuration constants.

**Will not create:**

- No SSR.
- No Astro adapter.
- No Netlify integration.
- No Cloudflare integration.
- No Hostinger private API integration (Hostinger's own push-triggered auto-deploy is used as-is).
- No mirroring of WordPress content into Git — the audit log stores metadata only, never article content.
- No empty commits.
- No changes to the existing Astro WordPress client (`src/lib/wordpress.js` or any page under `src/pages`) unless acceptance testing (Section 17) reveals a blocker.

## 4. Triggering Events

**Must request a deployment:**

- Publishing a new supported item (Section 5).
- Updating an already published supported item.
- Changing a published item's status to draft, private, pending, or trash.
- Restoring and republishing an item.
- Permanently deleting an item that was publicly available.
- Changing a featured image used by the frontend.
- Changing categories or tags rendered by the frontend.
- Changing SEO metadata consumed by Astro.
- Changing ACF fields consumed by Astro.

**Must not request a deployment:**

- Autosaves.
- Revisions.
- Draft-to-draft updates.
- Unpublished content that has never been public.
- Unrelated WordPress settings (permalinks, general options, users, plugins, themes).
- Unsupported post types (anything outside Section 5).

**Verified-fact correction:** the SEO plugin field actually read by the codebase is Yoast SEO's `yoast_head_json` (`src/lib/wordpress.js:71`, `:504-511`), not Rank Math. No reference to Rank Math exists anywhere in the repository. This item is carried into Section 18 as an open question rather than assumed.

## 5. Supported Post Types

Inspected directly in `src/lib/wordpress.js` and every file under `src/pages` that imports from it. These are the only three post types consumed by the frontend; no other endpoint is called anywhere in the repository.

| Post type | REST endpoint | Astro consumer(s) | Included in auto-deploy trigger |
|---|---|---|---|
| Post (core) | `/wp-json/wp/v2/posts` | `src/pages/blog/index.astro` (`getPosts`); `src/pages/blog/[slug].astro` (`getStaticPaths` → `getAllPublishedPosts`, `getPostBySlug`) | Yes |
| Service (custom post type, REST base `services`) | `/wp-json/wp/v2/services` | `src/pages/services.astro` (`getServices`) | Yes |
| Portfolio (custom post type, REST base `portfolio`) | `/wp-json/wp/v2/portfolio` | `src/pages/portfolio/index.astro` (`getPortfolio`); `src/pages/portfolio/[slug].astro` (`getStaticPaths` → `getPortfolio`, `getPortfolioItemBySlug`) | Yes |

Verified per-type nuances (affects which sub-events in Section 4 actually change rendered output today):

- **SEO metadata (`yoast_head_json`)**: read into `Article.seo` for posts (`mapPostToArticle`, `wordpress.js:350`), but `src/pages/blog/[slug].astro` never reads `post.seo` — title/description/canonical are built manually from `post.title`/`post.excerpt`/`post.canonical`. `extractSeo()` is called only in `src/pages/portfolio/[slug].astro:32`. It is not called in `services.astro`. **Effective today: Yoast metadata changes only visibly affect the Portfolio single page.**
- **ACF fields**: `WpService` and `WpPortfolioItem` both declare an `acf` property (`wordpress.js:129`, `:141`). Only `services.astro:44-45` actually reads `s.acf?.why` / `s.acf?.short_label`. No file reads `item.acf` for portfolio. **Effective today: ACF field changes only visibly affect the Services page.** `WpPost` has no `acf` property at all — ACF is not applicable to blog posts.

## 6. WordPress Plugin Responsibilities

- Detect qualifying public-content changes on the three supported post types (Section 5) only.
- Exclude autosaves and revisions at detection time (before any network call is made).
- Collect the final event data only after WordPress has finished saving post fields and taxonomy/meta associations for that request (not mid-save).
- Debounce related changes to the same post into a single deployment request (Section 12).
- Call the GitHub `workflow_dispatch` REST endpoint with the inputs defined in Section 8.
- Authenticate the outbound call using a securely stored, narrowly scoped credential (Section 11).
- Log the outcome (success or failure, HTTP status, timestamp) to a local, non-public WordPress log — never to a location reachable by anonymous visitors.
- Never expose the credential in HTML output, REST responses, JavaScript, or publicly readable files.

Implementation code is out of scope for this document.

## 7. GitHub Workflow Responsibilities

- Trigger exclusively on `workflow_dispatch` (never on `push`, `schedule`, or any event that could be produced by its own commit).
- Accept and validate the inputs defined in Section 8; fail the run immediately on invalid input.
- Check out `main` at the start of the run.
- Append exactly one JSON object, as one line, to `automation/wordpress-sync-log.jsonl`.
- Create exactly one commit containing that log change.
- Push the commit to `main`.
- Prevent workflow recursion (Section 14).
- Serialize simultaneous sync jobs so no two runs push to `main` concurrently (Section 12).
- Fail clearly and visibly (non-zero exit, readable error in the run summary) when input validation, the commit step, or the push step fails.

## 8. Workflow Inputs

`workflow_dispatch` inputs, supplied by the WordPress plugin on every dispatch call.

| Input | Type | Required | Allowed values | Max length | Fallback behavior |
|---|---|---|---|---|---|
| `event` | string | Required | `publish`, `update`, `unpublish`, `trash`, `delete`, `restore`, `metadata_update` | 32 | None — missing or unrecognized value fails validation |
| `post_id` | string (numeric) | Required | Positive integer as string | 20 | None — missing or non-numeric value fails validation |
| `post_type` | string | Required | `post`, `service`, `portfolio` | 32 | None — any other value fails validation |
| `slug` | string | Required | URL-safe slug (may be percent-encoded for non-Latin slugs) | 200 | None — empty value fails validation |
| `status` | string | Required | `publish`, `draft`, `private`, `pending`, `trash` | 20 | None — missing or unrecognized value fails validation |
| `modified_at` | string | Required | ISO 8601 UTC timestamp | 32 | None — missing or unparseable value fails validation |
| `source` | string | Required | `wordpress-plugin` | 32 | Defaults to `wordpress-plugin` if omitted, since only one sender exists |
| `request_id` | string | Optional | UUID v4 | 36 | If omitted, the workflow generates one from the GitHub Actions run ID for log traceability |

## 9. Audit Log Format

Path: `automation/wordpress-sync-log.jsonl` (no conflicting existing convention found in the repository).

One JSON object per line (JSONL). Schema:

| Field | Type | Description |
|---|---|---|
| `timestamp` | string (ISO 8601 UTC) | Time the workflow appended the record |
| `source` | string | Always `wordpress-plugin` |
| `event` | string | One of the values in Section 8 |
| `post_id` | number | WordPress post ID |
| `post_type` | string | `post`, `service`, or `portfolio` |
| `slug` | string | WordPress slug at time of event |
| `status` | string | WordPress post status at time of event |
| `modified_at` | string (ISO 8601 UTC) | WordPress `modified`/`modified_gmt` value |
| `workflow_run_id` | string | GitHub Actions run ID that produced this record |

Example (single valid line):

```json
{"timestamp":"2026-07-26T10:15:32Z","source":"wordpress-plugin","event":"publish","post_id":23,"post_type":"post","slug":"how-ai-understands-websites","status":"publish","modified_at":"2026-07-23T18:05:31Z","workflow_run_id":"9871234560"}
```

The log must contain metadata only. It must never contain article body content, secrets, tokens, or personal user data.

## 10. Automated Commit Format

All automated commit messages begin with `[wp-sync]`.

| Event | Commit message format |
|---|---|
| Publish | `[wp-sync] publish: {post_type} {slug} (#{post_id})` |
| Update | `[wp-sync] update: {post_type} {slug} (#{post_id})` |
| Unpublish | `[wp-sync] unpublish: {post_type} {slug} (#{post_id})` |
| Trash | `[wp-sync] trash: {post_type} {slug} (#{post_id})` |
| Delete | `[wp-sync] delete: {post_type} {slug} (#{post_id})` |
| Restore | `[wp-sync] restore: {post_type} {slug} (#{post_id})` |
| Metadata update | `[wp-sync] metadata: {post_type} {slug} (#{post_id})` |

Git author identity for every automated commit:

```
name:  wp-sync-bot
email: 41898282+github-actions[bot]@users.noreply.github.com
```

This uses the standard GitHub Actions bot identity convention so the commit is unambiguously attributable to automation, never to a human contributor (e.g. `ayop0dev`).

## 11. Authentication and Secrets

**GitHub side:**

- The workflow's own push to `main` uses the default `GITHUB_TOKEN` provided to the run, scoped in the workflow file to `permissions: contents: write` only. No externally issued token is needed for the push step.
- The WordPress plugin needs a separate credential only to call the `workflow_dispatch` REST endpoint. Minimum required permission: a fine-grained personal access token scoped to this one repository only, with repository permission **Actions: Read and write** (required to dispatch a workflow run) and no other permission enabled.

**WordPress credential requirements:**

- Limited to the `mrzoq` repository only (fine-grained token, not a repo-wide or org-wide classic token).
- No permissions beyond dispatching the workflow.
- Stored server-side only.
- Never committed to Git.
- Never exposed to Astro or browser JavaScript (Astro build has no dependency on this credential at all — it belongs entirely to the WordPress side).
- Never printed in WordPress logs, GitHub Actions logs, or the audit log.

**Expected WordPress-side configuration (names only, no values):**

| Name | Purpose |
|---|---|
| `MRZOQ_GH_DISPATCH_TOKEN` | Fine-grained GitHub token used to call `workflow_dispatch` |
| `MRZOQ_GH_OWNER_REPO` | Target repository in `owner/repo` form |
| `MRZOQ_GH_WORKFLOW_ID` | Workflow filename or numeric ID to dispatch |
| `MRZOQ_GH_REF` | Branch to dispatch against (`main`) |

Preferred storage: `wp-config.php` constants (`define(...)`), not the `wp_options` table — constants are not exposed through any WordPress REST field, admin settings export, or plugin data export path, whereas options rows can be.

## 12. Debounce and Duplicate Prevention

**WordPress-side debounce (primary mechanism):**
On each qualifying event for a given `post_id`, the plugin schedules a single deferred dispatch call a short fixed interval later (e.g. 60–120 seconds), first canceling/rescheduling any previously pending scheduled call for that same `post_id`. Only the last state within the debounce window is ever dispatched. This collapses autosave-adjacent rapid edits and multi-field saves (title, then image, then category, in the same edit session) into one request per post.

**GitHub Actions concurrency control (secondary mechanism):**
The workflow declares a single concurrency group (e.g. `concurrency: group: wp-sync`) with `cancel-in-progress: false`. This serializes runs so that no two runs check out, commit, and push to `main` at the same moment — later runs wait for the current run's push to complete rather than racing it. This is independent of, and does not replace, the WordPress-side debounce: it protects against two *different* posts being edited at nearly the same time, which the per-post debounce above does not collapse.

**Duplicate event handling (tertiary mechanism):**
Before appending a new log line, the workflow compares the incoming `(post_id, event, modified_at)` tuple against the last line in the audit log for that `post_id`. An exact match is treated as a duplicate (e.g. a webhook retry) and the run exits without creating a commit.

**Explicit constraint:** none of the above may depend on visitor traffic reaching `blog.mrzoq.com`. WordPress's default pseudo-cron (`wp-cron.php`) only executes on incoming page requests, and this site's traffic pattern is not guaranteed to trigger it promptly. Whether Hostinger's WordPress hosting runs a real system cron job for `wp-cron.php` independent of visitor traffic cannot be confirmed from this repository and is carried into Section 18 as an open question. Until confirmed, the debounce interval must be treated as best-effort, not guaranteed-timed.

## 13. Failure Handling and Logs

| Failure | Visible in | Behavior |
|---|---|---|
| GitHub API authentication fails | WordPress local log only | Plugin logs HTTP 401/403 and stops; no workflow run is ever created |
| GitHub rejects the workflow dispatch (e.g. bad ref, unknown workflow) | WordPress local log only | Plugin logs the rejection response; no workflow run is created, so nothing appears in GitHub Actions |
| Workflow input is invalid | GitHub Actions run | Run fails at the validation step with a readable error; no commit is attempted |
| Audit log cannot be updated (e.g. malformed existing file) | GitHub Actions run | Run fails before the commit step; no commit or push occurs |
| Git cannot push because `main` changed | GitHub Actions run | Push step fails with a non-fast-forward error; the concurrency group (Section 12) makes this rare, and it can only occur if something outside this pipeline (e.g. a manual developer commit) pushes to `main` at the same moment |
| Hostinger deployment fails | Hostinger deployment log only | Not visible to WordPress or to GitHub Actions — this pipeline has no integration with Hostinger's deployment status |
| WordPress REST API is unavailable during the Astro build | Hostinger build log (if Hostinger surfaces build stdout/stderr) | Handled by existing code: `apiFetch()` (`src/lib/wordpress.js:169-201`) already times out after 8 seconds and returns an empty result rather than throwing, so the build itself still succeeds; affected pages render their existing empty states |

No component in this design can confirm that a Hostinger deployment actually succeeded. WordPress only knows that it successfully called GitHub; GitHub Actions only knows that it successfully pushed a commit. Hostinger deployment outcome is visible exclusively in the Hostinger dashboard/deployment log, because no supported Hostinger deployment-status callback exists in this stack.

## 14. Loop Prevention

Guarantee chain:

1. WordPress triggers GitHub via `workflow_dispatch` only (never via a mechanism that could originate from Git activity).
2. GitHub Actions pushes exactly one audit commit to `main`.
3. Hostinger's existing push-triggered auto-deploy runs the build.
4. The workflow's trigger type is `workflow_dispatch` exclusively — it has no `on: push` trigger, so its own commit to `main` cannot start a new run of itself.
5. The audit commit modifies only `automation/wordpress-sync-log.jsonl` inside the Git repository. It does not touch `blog.mrzoq.com` in any way, so no WordPress hook (`save_post`, `transition_post_status`, or otherwise) can fire as a result of it.

This closes the loop: WordPress → GitHub → Hostinger is one-directional, with no path back into WordPress and no path from the workflow's own commit back into itself.

## 15. Required Files

Listed for future implementation; none of these are created by this document.

- `wp-content/plugins/mrzoq-wp-sync/mrzoq-wp-sync.php` — plugin bootstrap (headers, hook registration).
- `wp-content/plugins/mrzoq-wp-sync/includes/` — supporting classes (event detection, debounce scheduling, GitHub dispatch client, local logger).
- `.github/workflows/wp-sync.yml` — the `workflow_dispatch` workflow described in Sections 7–10.
- `automation/wordpress-sync-log.jsonl` — the audit log described in Section 9.
- `automation/README.md` (optional) — example configuration/secret names for future maintainers, no real values.

## 16. Implementation Order

1. Create the GitHub workflow (`.github/workflows/wp-sync.yml`), accepting the inputs in Section 8, writing the log format in Section 9, and using the commit format in Section 10.
2. Configure repository permissions (`contents: write` for `GITHUB_TOKEN`) and the concurrency group from Section 12.
3. Test the workflow manually via the GitHub UI/API `workflow_dispatch` call, with hand-entered inputs, before any WordPress code exists.
4. Confirm the resulting audit commit actually triggers a Hostinger deployment end-to-end.
5. Create the WordPress plugin (event detection, debounce, GitHub dispatch call, local logging).
6. Configure secrets: the fine-grained GitHub token and repository/workflow identifiers in WordPress (Section 11).
7. Test each qualifying event from Section 4 individually against the real WordPress instance.
8. Verify the corresponding change is visible on `mrzoq.com` after deployment.
9. Update `architecture/PROJECT_STATE.md` and any other existing documentation only after step 8 is verified successful — not before, and not as part of this specification.

## 17. Acceptance Tests

| # | Action | Expected WP trigger count | Expected GitHub commit count | Expected Hostinger deployment count | Expected public result on mrzoq.com |
|---|---|---|---|---|---|
| 1 | Publish a new post | 1 | 1 | 1 | New post appears at `/blog/{slug}` and in the listing |
| 2 | Update published article body | 1 | 1 | 1 | Updated content appears on the existing post page |
| 3 | Update SEO title/description (Yoast) | 1 | 1 | 1 | No visible change on blog posts today (Section 5); visible on Portfolio single pages only |
| 4 | Change featured image | 1 | 1 | 1 | New image appears on the post/portfolio page |
| 5 | Change category or tag | 1 | 1 | 1 | Updated terms appear on the post page |
| 6 | Save a draft (never published) | 0 | 0 | 0 | No change |
| 7 | Trigger an autosave | 0 | 0 | 0 | No change |
| 8 | Create a revision | 0 | 0 | 0 | No change |
| 9 | Unpublish an article (publish → draft/private) | 1 | 1 | 1 | Post page returns 404 / removed from listing after deploy |
| 10 | Trash an article | 1 | 1 | 1 | Post page removed after deploy |
| 11 | Restore and publish an article | 1 | 1 | 1 | Post page reappears after deploy |
| 12 | Two rapid updates to one article (within debounce window) | 2 (detected), 1 (dispatched) | 1 | 1 | Reflects only the final state of the two edits |
| 13 | Simultaneous updates to two different articles | 2 (detected and dispatched — debounce is per-post) | 2 (serialized by concurrency group) | 2 (subject to Hostinger's own handling of rapid consecutive pushes — not controlled by this design) | Both articles' final states reflected |
| 14 | GitHub authentication failure | 1 (attempted) | 0 | 0 | No change; visible only in WordPress local log |
| 15 | Astro build failure after a valid audit commit | 1 | 1 | 1 attempted, reported failed in Hostinger | `mrzoq.com` remains on its last successfully deployed build (dependent on Hostinger's standard behavior of not replacing a live deployment with a failed build — not independently verified for this Hostinger plan) |

## 18. Explicit Decisions and Open Questions

**Explicit decisions (confirmed defaults, not left undefined):**

- Trigger type is `workflow_dispatch` only — never `push`, `schedule`, or `repository_dispatch`.
- Debounce is per-`post_id`, implemented on the WordPress side; concurrency serialization is implemented on the GitHub Actions side; these are two distinct layers, not one.
- Automated commits use the `github-actions[bot]` identity, never a human author.
- The audit log is metadata-only and is the single source of truth for what was synced and when.
- No component in this design attempts to confirm Hostinger deployment success back to WordPress or GitHub.

**Open questions (cannot be answered from this repository):**

- Whether Hostinger reliably runs WP-Cron independent of site traffic, or whether a real system cron entry for `wp-cron.php` needs to be configured separately — this determines whether the debounce timing in Section 12 is guaranteed or best-effort.
- Where the WordPress plugin code will be maintained (a separate private repository, a subdirectory of this repository, or directly on the WordPress instance without version control).
- Whether production credentials (Section 11) will be stored as `wp-config.php` constants or as Hostinger-provided environment variables for the WordPress application — both are supported by the design, but the actual mechanism depends on how Hostinger exposes configuration to this specific WordPress instance.
- Whether `blog.mrzoq.com` is actually running Yoast SEO, Rank Math, both, or neither in production — the codebase only reads Yoast's `yoast_head_json` field (Section 4), which conflicts with this task's original assumption of Rank Math and needs to be confirmed against the live WordPress installation.
