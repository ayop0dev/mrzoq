# WordPress to GitHub Auto-Deploy Specification

## 1. Objective

When a publicly visible WordPress item on `https://blog.mrzoq.com` is created, updated, unpublished, restored, or deleted, the Astro frontend at `https://mrzoq.com` must reflect that change within one automated deployment cycle, without any manual "Redeploy" click and without any manual `git push`.

Success is defined by three guarantees:

1. A qualifying WordPress change (or a batch of related changes) results in exactly one overwrite of the deployment trigger file (`automation/wordpress-deploy-trigger.json`) and exactly one new commit on `main`, which Hostinger's existing auto-deploy-on-push behavior picks up, runs `npm run build`, and produces a fresh Astro build reflecting current WordPress content.
2. The production build never publishes incomplete or broken content: if a required WordPress fetch fails, times out, or returns an invalid response during the build, the build must fail rather than deploy silently with missing sections.
3. All public-facing SEO metadata rendered by Astro (canonical URL, Open Graph, Twitter, schema fields) resolves to `mrzoq.com`, sourced from Rank Math, never exposing `blog.mrzoq.com` as the canonical content domain.

Non-qualifying WordPress changes (autosaves, revisions, draft-only edits, unrelated settings) must produce zero trigger-file changes and zero commits.

## 2. Fixed Architecture

| Item | Value |
|---|---|
| Public frontend | `https://mrzoq.com` |
| CMS backend (private origin) | `https://blog.mrzoq.com` |
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
| WordPress SEO plugin (fixed fact) | Rank Math, with Headless CMS Support enabled |
| Current SEO code (verified, to be replaced) | `src/lib/wordpress.js` reads Yoast's `yoast_head_json` field; `blog/[slug].astro` builds most SEO fields manually and applies neither Yoast nor Rank Math output today |
| Verified manual path | Clicking Hostinger "Redeploy" successfully fetches newly published WordPress content |
| Missing component | An automatic WordPress → GitHub push trigger, a fail-closed production build, and Rank Math-sourced public SEO metadata |
| Excluded platforms | Netlify, Cloudflare — not used anywhere in this stack |

## 3. Deployment Lifecycle

This section documents the exact runtime sequence from a qualifying WordPress content change to a live update on `mrzoq.com`. Later sections define each step in detail.

1. A qualifying public-content change occurs in WordPress.
2. The WordPress plugin records the event in its pending queue.
3. The Hostinger system cron flushes the queue.
4. The plugin sends one GitHub `workflow_dispatch` request containing the batch.
5. GitHub Actions validates the batch.
6. The workflow overwrites `automation/wordpress-deploy-trigger.json` with the latest batch metadata.
7. The workflow creates one `[wp-sync]` commit and pushes it to `main`.
8. Hostinger detects the push and runs `npm run build`.
9. Astro fetches fresh WordPress and Rank Math data.
10. A successful build updates `mrzoq.com`.
11. A failed required CMS fetch fails the build and must not silently deploy incomplete content.

Compact flow:

```
WordPress
→ pending queue
→ cron flush
→ GitHub workflow_dispatch
→ trigger-file update
→ commit and push
→ Hostinger auto-deploy
→ Astro build
→ fresh WordPress and Rank Math fetch
→ mrzoq.com
```

## 4. Scope

**Will create:**

- One lightweight custom WordPress plugin (event detection, pending-change queue, flush trigger, GitHub dispatch client).
- One GitHub Actions workflow (`workflow_dispatch`-triggered, batch validation, trigger-file overwrite, commit, push).
- One Git-tracked deployment trigger file (`automation/wordpress-deploy-trigger.json`), overwritten with the latest batch's metadata on every deployment — not a permanent audit log (Section 10).
- Fail-closed WordPress fetch validation in the Astro production build: a modification to the existing `src/lib/wordpress.js` client so a required request failure, timeout, invalid JSON, unexpected HTTP status, or invalid response shape fails the build instead of returning an empty result.
- Rank Math head-data fetch and rendering for Astro detail routes: a build-time call to Rank Math's Headless CMS REST endpoint, keyed by the public `mrzoq.com` URL, rendered into the page `<head>`.
- Required secrets and configuration for the above (GitHub side and WordPress side).

**Will not create:**

- No SSR.
- No Astro adapter.
- No Netlify integration.
- No Cloudflare integration.
- No Hostinger private API integration (Hostinger's own push-triggered auto-deploy is used as-is); no use of unsupported or private Hostinger hPanel requests as a substitute (Section 19).
- No use of Git as a permanent event-audit store. Permanent operational history lives in the WordPress plugin's database log, GitHub Actions run history, and Hostinger deployment logs (Section 10), not in Git.
- No mirroring of WordPress content into Git — the trigger file stores metadata only, never article content.
- No empty commits.
- No creation of a per-item public Astro route for Service content (verified: only `src/pages/services.astro` exists today, no `services/[slug].astro`); if per-service SEO becomes required, creating that route is a separate scope decision, not covered here.
- No other changes to the existing Astro WordPress client beyond the two explicitly listed above (fail-closed fetch validation, Rank Math head-data fetch) unless later testing reveals an additional blocker.

## 5. Triggering Events

**Must request a deployment:**

- Publishing a new supported item (Section 6).
- Updating an already published supported item.
- Changing a published item's status to draft, private, pending, or trash.
- Restoring and republishing an item.
- Permanently deleting an item that was publicly available.
- Changing a featured image used by the frontend.
- Changing categories or tags rendered by the frontend.
- Changing Rank Math SEO metadata consumed by Astro.
- Changing ACF fields consumed by Astro.

**Must not request a deployment:**

- Autosaves.
- Revisions.
- Draft-to-draft updates.
- Unpublished content that has never been public.
- Unrelated WordPress settings (permalinks, general options, users, plugins, themes).
- Unsupported post types (anything outside Section 6).

## 6. Supported Post Types

Inspected directly in `src/lib/wordpress.js` and every file under `src/pages` that imports from it. These are the only three post types consumed by the frontend; no other endpoint is called anywhere in the repository.

| Post type | REST endpoint | Astro consumer(s) | Included in auto-deploy trigger |
|---|---|---|---|
| Post (core) | `/wp-json/wp/v2/posts` | `src/pages/blog/index.astro` (`getPosts`); `src/pages/blog/[slug].astro` (`getStaticPaths` → `getAllPublishedPosts`, `getPostBySlug`) | Yes |
| Service (custom post type, REST base `services`) | `/wp-json/wp/v2/services` | `src/pages/services.astro` (`getServices`) | Yes |
| Portfolio (custom post type, REST base `portfolio`) | `/wp-json/wp/v2/portfolio` | `src/pages/portfolio/index.astro` (`getPortfolio`); `src/pages/portfolio/[slug].astro` (`getStaticPaths` → `getPortfolio`, `getPortfolioItemBySlug`) | Yes |

**Post-type key caveat (verification required before implementation):** the values above ("post", "services", "portfolio") are REST *base* names, observed from the endpoint paths. A custom post type's REST base is not guaranteed to equal its registered `post_type` key (the value `register_post_type()` was actually called with, and the value WordPress hook callbacks such as `save_post_{post_type}` key on). Section 9's `post_type` input values and any WordPress-side hook filtering by post type must be confirmed against the real `register_post_type()` slugs for Service and Portfolio before implementation, not assumed from the REST base. This is carried into Section 19.

### 6.1 Rank Math Headless SEO Integration

- **Enable** Rank Math's "Headless CMS Support" setting on `blog.mrzoq.com`, which exposes Rank Math's REST endpoint for retrieving head metadata for a given URL.
- **Fetch** Rank Math head data at Astro build time, requesting it with the *public* `mrzoq.com` URL for each item, not the private `blog.mrzoq.com` URL:
  - Blog post: `https://mrzoq.com/blog/{slug}`
  - Portfolio item: `https://mrzoq.com/portfolio/{slug}` (its actual public Astro route)
  - Service: no per-item public route exists today (verified in Section 4); Rank Math integration for Service post type is out of scope until a per-item route is created — carried to Section 19.
- **Render** the returned metadata into the page `<head>`: title, meta description, canonical URL, Open Graph tags (including `og:url` and image URLs where present), Twitter metadata, and schema fields (`url`, `mainEntityOfPage`, `@id`, breadcrumb URLs, and any other URL-bearing schema field).
- **Domain rule:** every one of the above fields must resolve to `mrzoq.com`. `blog.mrzoq.com` must never appear as the canonical public content domain in any rendered output. Where Rank Math's response contains its own idea of the canonical/host URL, the Astro build must override it with the public `mrzoq.com` route, not pass through Rank Math's raw value unmodified.
- **Consuming routes:** `src/pages/blog/[slug].astro` (post type "post") and `src/pages/portfolio/[slug].astro` (post type "portfolio"). `src/pages/blog/index.astro` and `src/pages/portfolio/index.astro` (listing pages) are out of scope — Rank Math's headless endpoint targets a single content URL, not a collection.
- **Fallback behavior:** when Rank Math returns no value for an optional field (e.g., no custom Open Graph image set), the route falls back to the existing manually-derived value already in use today (e.g., `post.featuredImage.url`, `post.excerpt`) rather than rendering an empty tag.
- **Required-field failure:** if Rank Math data is required for a route (i.e., the route has no non-Rank-Math fallback for a given field) and the request fails, times out, or returns an invalid shape, the build must fail per the production failure-safety rules (Section 14), not silently omit the field.
- **Yoast removal:** the existing `yoast_head_json` reads in `wordpress.js` and the manual SEO construction in `blog/[slug].astro` are replaced by this Rank Math integration during implementation, after Rank Math output is verified against the live site — not as part of this specification.

## 7. WordPress Plugin Responsibilities

- Detect qualifying public-content changes on the three supported post types (Section 6), filtered by their confirmed `post_type` keys (Section 6 caveat).
- Exclude autosaves and revisions at detection time (before any queue write).
- Collect the final event data only after WordPress has finished saving post fields and taxonomy/meta associations for that request (not mid-save).
- Enqueue each qualifying event into a server-side pending-change queue; do not call GitHub directly per event (Section 13).
- Retain the last known slug for each tracked post so a `delete` event (where WordPress no longer holds post data) can still report a slug; submit an empty `slug` only when genuinely unavailable, and only for the `delete` event.
- When the flush operation runs and the pending queue is non-empty, generate one new UUID v4 `request_id`, create a local batch record holding that `request_id`, `event_count`, and the queued events, and clear the pending queue so later events accumulate into the next batch, not this one. WordPress is the primary owner of deployment-request identity: the same `request_id` is reused for every retry of this batch, and a new `request_id` is never generated for a retry of an existing batch — only for a genuinely new batch (Section 13).
- Track each batch's state in the local database as one of: `pending`, `dispatching`, `dispatched`, or `failed`. Transition to `dispatching` immediately before calling GitHub, and to `dispatched` only after GitHub accepts the `workflow_dispatch` call, or to `failed` on a network or rejection error.
- A batch already marked `dispatched` must not be sent again automatically; it may only be resent if an explicit manual retry is requested. A batch marked `failed` may be retried using its existing `request_id`, without generating a new one.
- If reliable system cron cannot be confirmed for triggering the flush (Section 19), fall back to immediate per-event dispatch guarded by a short transient lock — duplicate suppression only, not batching (Section 13).
- Authenticate the outbound GitHub call and the inbound flush trigger using securely stored, narrowly scoped credentials (Section 12). Read all deployment configuration (GitHub dispatch token, repository owner/name, workflow ID, branch, queue-flush token) exclusively from `wp-config.php` constants or server-side environment variables; never store any of these values in `wp_options`, post meta, user meta, plugin settings rows, transients, or the local database log (Section 12).
- Store all local log entries (batch state transitions, enqueue events, flush attempts, flush results, dispatch failures, GitHub responses) in a dedicated database table (`{$wpdb->prefix}mrzoq_sync_log`) created on plugin activation. This table is not exposed through any REST route and is readable only through the WordPress admin under a capability check — never stored under a publicly web-accessible path such as `wp-content/uploads/`, and never containing configuration credential values. This table, together with the batch-state records, is the permanent, queryable operational log and the primary source of duplicate-control and retry state on the WordPress side (Section 10, Section 13).
- Expose only a boolean configuration-status indicator in the admin UI (e.g., "GitHub dispatch credential configured" / "GitHub dispatch credential missing") — never the configuration value itself, not even masked, and never via REST or diagnostics output.
- Never expose credentials in HTML output, REST responses, JavaScript, or publicly readable files.

Implementation code is out of scope for this document.

## 8. GitHub Workflow Responsibilities

- Trigger exclusively on `workflow_dispatch` (never on `push`, `schedule`, or any event producible by its own commit).
- Receive and validate one deployment batch per run, using the inputs defined in Section 9, including that `event_count` matches the number of elements parsed from `events_json` and that every element matches the per-event schema (Section 10); fail the run immediately on mismatch or malformed JSON.
- Check out `main` at the start of the run.
- Apply a final defensive duplicate check by comparing the incoming `request_id` against the `request_id` currently stored in `automation/wordpress-deploy-trigger.json` (read from `main` before overwriting). If they match, treat the run as a duplicate delivery of an already-processed batch and exit without overwriting the file or creating a commit. This check is a defensive safeguard against duplicate delivery or sender failure (e.g., a lost success acknowledgment causing WordPress to retry an already-dispatched batch) — it is **not** the primary source of deployment-request state, which is owned by WordPress's local batch-state tracking (Section 7, Section 13). It only catches a duplicate of the *most recent* batch, because the trigger file holds only the latest state — it does not scan historical batches. GitHub Actions run history provides operational evidence of past runs only; it is not consulted as a source of truth for duplicate control.
- Overwrite `automation/wordpress-deploy-trigger.json` with the current batch's metadata (Section 10).
- Create exactly one meaningful commit: the detailed single-event format when `event_count == 1`, or the multi-event format otherwise (Section 11). No empty commits are allowed — the trigger file's `timestamp`, `request_id`, and `workflow_run_id` differ on every processed batch, so a genuine content change is guaranteed whenever the duplicate check does not short-circuit the run.
- Push the commit to `main`, allowing Hostinger to detect the push and deploy.
- Prevent workflow recursion (Section 15).
- Serialize concurrent runs via a single concurrency group so no two runs push to `main` at the same time (Section 13).
- Fail clearly and visibly (non-zero exit, readable error in the run summary) when input validation, the trigger-file overwrite, the commit step, or the push step fails.

## 9. Workflow Inputs

`workflow_dispatch` inputs, supplied by the WordPress plugin's flush operation on every batch dispatch.

| Input | Type | Required | Allowed values | Max length | Fallback behavior |
|---|---|---|---|---|---|
| `source` | string | Required — no fallback | `wordpress-plugin` | 32 | None; missing value fails validation (single-sender system, so no fallback is defined) |
| `request_id` | string (UUID v4) | Required | UUID v4 | 36 | None — missing or malformed value fails validation |
| `event_count` | string (numeric) | Required | Positive integer as string; must equal the number of elements in `events_json` | 6 | None — mismatch fails validation |
| `events_json` | string (JSON array) | Required | JSON-encoded array of event objects, each matching the per-event schema in Section 10 | 20000 (practical `workflow_dispatch` input size limit) | None — empty array, malformed JSON, or a schema violation on any element fails validation |

Each element of `events_json` carries: `event` (`publish`, `update`, `unpublish`, `trash`, `delete`, `restore`, `metadata_update`), `post_id`, `post_type` (post-type key per Section 6 caveat), `slug` (empty string permitted only when `event` is `delete`), `status`, `modified_at` (ISO 8601 UTC).

## 10. Deployment Trigger File Format

Path: `automation/wordpress-deploy-trigger.json`.

This file is **overwritten in place** on every processed batch — it is not an append-only log and never accumulates history. It exists solely because Hostinger requires a real Git change and push to detect and trigger a deployment; it carries the latest batch's identifying metadata for the duplicate check in Section 8.

Schema (single JSON object):

| Field | Type | Description |
|---|---|---|
| `timestamp` | string (ISO 8601 UTC) | Time the workflow wrote this file |
| `source` | string | Always `wordpress-plugin` |
| `request_id` | string (UUID v4) | Identifies this batch; used for the duplicate check in Section 8 |
| `event_count` | number | Number of elements in `events` |
| `events` | array of objects | One entry per qualifying change included in this batch |
| `workflow_run_id` | string | GitHub Actions run ID that produced this state |

Each object inside `events`: `event`, `post_id` (number), `post_type` (string), `slug` (string; empty string permitted only for `delete`), `status` (string), `modified_at` (string, ISO 8601 UTC).

Example (full file content after a batch of two related changes):

```json
{
  "timestamp": "2026-07-26T10:16:32Z",
  "source": "wordpress-plugin",
  "request_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "event_count": 2,
  "events": [
    {
      "event": "publish",
      "post_id": 23,
      "post_type": "post",
      "slug": "how-ai-understands-websites",
      "status": "publish",
      "modified_at": "2026-07-23T18:05:31Z"
    },
    {
      "event": "update",
      "post_id": 21,
      "post_type": "post",
      "slug": "why-businesses-care-about-chatgpt-visibility",
      "status": "publish",
      "modified_at": "2026-07-23T17:59:14Z"
    }
  ],
  "workflow_run_id": "9871234560"
}
```

The file must:

- contain metadata only;
- contain only the latest deployment batch (never historical batches);
- never contain article body content;
- never contain credentials, tokens, or personal data;
- remain small and constant in size;
- provide a meaningful, non-empty repository change on every overwrite, so the resulting commit is never empty.

**This file is not a complete audit log and not a source of truth.** WordPress remains the content source of truth at all times. The permanent operational audit trail is:

- the WordPress plugin's local database log (event detection, queueing, flush attempts, GitHub responses) — Section 7;
- GitHub Actions run history (validation, trigger-file update, commit, and push, one run per batch) — Section 8;
- Hostinger deployment logs (build and deployment result).

**Note on Astro's build behavior:** the `events` array is descriptive metadata about what caused a given deployment; it is not read by the Astro build. Every build independently re-fetches the complete current WordPress and Rank Math state (Section 2), regardless of which specific events appear in the trigger file at that time.

## 11. Automated Commit Format

All automated commit messages begin with `[wp-sync]`.

| Batch shape | Commit message format |
|---|---|
| Multi-event batch (`event_count > 1`) | `[wp-sync] sync {event_count} WordPress changes` |
| Single-event batch (`event_count == 1`), by that event's `event` value: | |
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

This uses the standard GitHub Actions bot identity convention so the commit is unambiguously attributable to automation, never to a human contributor (e.g. `ayop0dev`). No empty commits are allowed under any circumstance (Section 8, Section 10).

## 12. Authentication and Secrets

**GitHub side:**

- The workflow's own push to `main` uses the default `GITHUB_TOKEN`, scoped in the workflow file to `permissions: contents: write` only. Before implementation, confirm whether branch protection rules or repository rulesets on `main` permit `GITHUB_TOKEN` to push directly; if they do not, either adjust the ruleset to allow the Actions bot or use a PAT with bypass permission instead of `GITHUB_TOKEN` for the push step (Section 17, Section 19).
- The WordPress plugin needs a separate credential only to call the `workflow_dispatch` REST endpoint. Minimum required permission: a fine-grained personal access token scoped to this one repository only, with repository permission **Actions: Read and write**, and no other permission enabled.

**WordPress credential requirements:**

- Limited to the `mrzoq` repository only (fine-grained token, not a repo-wide or org-wide classic token).
- No permissions beyond dispatching the workflow.
- Stored server-side only.
- Never committed to Git.
- Never exposed to Astro or browser JavaScript (Astro build has no dependency on this credential — it belongs entirely to the WordPress side).
- Never printed in WordPress logs, GitHub Actions logs, or the deployment trigger file.

**Credential isolation from the WordPress admin UI (mandatory for V1):**

- The GitHub dispatch credential and all deployment configuration belong to the deployment infrastructure, not to editable website content. They must never be editable, viewable, replaceable, or exportable from the WordPress admin UI.
- The plugin must not create an admin settings field for the token or for any of the other configuration values below.
- The plugin must not store any of these values in `wp_options`, post meta, user meta, plugin settings, transients, or the local database log.
- Every value must be supplied only through a `wp-config.php` constant or a server-side environment variable made available to PHP — no other storage mechanism is acceptable for V1.
- The plugin may show only a boolean configuration-status indicator per value (e.g., "GitHub dispatch credential configured" / "GitHub dispatch credential missing"). The value itself must never be displayed, partially masked, logged, returned by REST, or exposed in diagnostics.
- WordPress administrators must not be able to change the repository owner, repository name, workflow ID, branch, or token from the admin UI. Admin-editable configuration is explicitly deferred to a possible future architecture revision, not V1.

**Required WordPress-side configuration (names only, no values; `wp-config.php` constants or server environment variables only):**

| Name | Purpose |
|---|---|
| `MRZOQ_GH_DISPATCH_TOKEN` | Fine-grained GitHub token used to call `workflow_dispatch` |
| `MRZOQ_GH_OWNER_REPO` | Target repository in `owner/repo` form |
| `MRZOQ_GH_WORKFLOW_ID` | Workflow filename or numeric ID to dispatch |
| `MRZOQ_GH_REF` | Branch to dispatch against (`main`) |
| `MRZOQ_QUEUE_FLUSH_TOKEN` | Secret token required to invoke the protected queue-flush endpoint (Section 13) |

Storage is `wp-config.php` constants (`define(...)`) or server-side environment variables read by PHP — never the `wp_options` table or any other WordPress-managed storage listed above, all of which are admin-editable or exportable.

## 13. Debounce and Duplicate Prevention

Batching is **global**, not scoped to one `post_id` — every Astro build refreshes all supported content in one pass, so there is no benefit to isolating batches per post, and doing so would risk one deployment per post instead of one deployment for a cluster of unrelated edits.

**Default mechanism — pending queue plus real system cron:**

- The plugin records every qualifying event into a server-side pending queue (append-only on the WordPress side only, cleared on successful flush).
- A real Hostinger cron job calls a protected WordPress endpoint at a fixed interval to flush the queue: if the queue is non-empty, all pending events are packaged into one `workflow_dispatch` batch call (Section 9) and the queue is cleared; if empty, nothing happens.
- Default proposed interval: **1 minute**.
- This mechanism depends on Hostinger providing real, traffic-independent scheduled execution (e.g., its hPanel Cron Jobs feature) for the WordPress hosting environment — not WordPress's default pseudo-cron (`wp-cron.php`), which only runs on incoming page requests and cannot be relied on for a fixed 1-minute interval. Confirming this is available is a pre-implementation requirement (Section 19), not an assumption this design makes silently.

**Fallback mechanism — only if reliable system cron is unavailable:**

- Each qualifying event dispatches immediately, guarded by a short transient lock (e.g., 10–15 seconds) that suppresses exact duplicate calls from the same save operation.
- This fallback provides **duplicate suppression only, not true batching**: unrelated changes made seconds apart will still produce separate deployments. It is a degraded mode, used only when the default mechanism's cron dependency cannot be met.

**GitHub Actions concurrency control (independent of the above):**

- The workflow declares a single concurrency group (e.g., `concurrency: group: wp-sync`) with `cancel-in-progress: false`, serializing runs so no two runs check out, overwrite the trigger file, commit, and push to `main` at the same moment.

**Duplicate request handling:**

- WordPress is the primary owner of deployment-request identity and retry state (Section 7): each batch has one `request_id`, tracked through `pending` → `dispatching` → `dispatched`/`failed` in the local database. A batch already `dispatched` is never resent automatically; a `failed` batch may be retried using the same `request_id`, never a new one.
- GitHub's check — comparing the incoming `request_id` against the value currently stored in `automation/wordpress-deploy-trigger.json` (Section 8) — is a final defensive safeguard against duplicate delivery or sender failure (e.g., a lost success acknowledgment causing WordPress to retry an already-successful batch), not the primary duplicate-control mechanism. It does not depend on an append-only Git log, because none exists.
- GitHub Actions run history is operational evidence of past runs only; it is not consulted as a source of truth for duplicate control.

## 14. Failure Handling and Logs

| Failure | Visible in | Behavior |
|---|---|---|
| GitHub API authentication fails | WordPress local database log only | Plugin logs HTTP 401/403 and stops; no workflow run is ever created |
| GitHub rejects the workflow dispatch (e.g. bad ref, unknown workflow) | WordPress local database log only | Plugin logs the rejection response; no workflow run is created |
| Workflow input is invalid (schema mismatch, malformed `events_json`) | GitHub Actions run | Run fails at the validation step with a readable error; the trigger file is not overwritten and no commit is attempted |
| Duplicate `request_id` (matches the trigger file's current value) | GitHub Actions run | Run exits cleanly without overwriting the trigger file or creating a commit; logged in the run summary as a skipped duplicate. This is GitHub's secondary defensive check; WordPress's own `dispatched`-state guard (Section 7) is the primary prevention and should normally stop the resend before GitHub is ever called |
| Trigger file cannot be parsed or written (e.g. corrupted existing file) | GitHub Actions run | Run fails before the commit step; no commit or push occurs |
| Git cannot push because `main` changed | GitHub Actions run | Push step fails with a non-fast-forward error; the concurrency group (Section 13) makes this rare and it can only occur if something outside this pipeline pushes to `main` at the same moment |
| Pending queue cannot be written, or the flush endpoint call fails/is unauthorized | WordPress local database log only | Plugin logs the failure; queued events remain pending for the next flush attempt |
| A batch's GitHub dispatch network request fails | WordPress local database log only | Batch state set to `failed` with the same `request_id` retained; eligible for retry using that same `request_id` — a new `request_id` is never generated for the retry |
| A batch already marked `dispatched` is requested to resend without an explicit manual retry | WordPress local database log only | Plugin blocks the resend before any GitHub call is made; nothing is sent to GitHub |
| A required deployment configuration constant (Section 12) is missing or empty | WordPress admin (boolean status only) and WordPress local database log | Plugin cannot dispatch; the admin UI shows a "configuration missing" status with no value exposed; an administrator or developer must set the constant directly in `wp-config.php` or the server environment, not through the admin UI |
| Hostinger deployment fails | Hostinger deployment log only | Not visible to WordPress or GitHub Actions — this pipeline has no integration with Hostinger's deployment status |
| WordPress REST API is unavailable, times out, returns invalid JSON, an unexpected HTTP status, or an invalid response shape **during the Astro production build**, for a required fetch | Hostinger build log | The build must fail (non-zero exit), per Section 4/Section 6.1's fail-closed requirement. This is a required modification to `src/lib/wordpress.js`, not yet implemented. Whether Hostinger then retains the last successfully deployed version instead of publishing the failed build is a hosting-platform behavior that **must be verified before production activation** (Section 17, Section 19) — it is not claimed as confirmed by this document. Empty states remain allowed only when WordPress successfully returns a valid, empty collection (a genuine zero-result response), not when the request itself failed. |

No component in this design can confirm that a Hostinger deployment actually succeeded, or that a successful GitHub dispatch or push implies a successful Hostinger deployment. WordPress only knows it successfully called GitHub; GitHub Actions only knows it successfully pushed a commit. Hostinger deployment outcome is visible exclusively in the Hostinger dashboard/deployment log, because no supported Hostinger deployment-status callback exists in this stack.

## 15. Loop Prevention

Guarantee chain:

1. WordPress triggers GitHub via `workflow_dispatch` only (never via a mechanism that could originate from Git activity).
2. GitHub Actions pushes exactly one deployment-trigger commit per batch to `main`.
3. Hostinger's existing push-triggered auto-deploy runs the build.
4. The workflow's trigger type is `workflow_dispatch` exclusively — it has no `on: push` trigger, so its own commit to `main` cannot start a new run of itself.
5. The commit modifies only `automation/wordpress-deploy-trigger.json`. It does not touch `blog.mrzoq.com` in any way, so no WordPress hook (`save_post`, `transition_post_status`, or otherwise) can fire as a result of it — including the periodic cron flush itself, which reads and clears the WordPress-side queue but does not write to any WordPress content table.

This closes the loop: WordPress → GitHub → Hostinger is one-directional, with no path back into WordPress and no path from the workflow's own commit back into itself.

## 16. Required Files

Listed for future implementation; none of these are created by this document.

- `.github/workflows/wp-sync.yml` — the `workflow_dispatch` workflow described in Sections 8–11.
- `automation/wordpress-deploy-trigger.json` — the deployment trigger file described in Section 10.
- `automation/README.md` (optional) — example configuration/secret names for future maintainers, no real values.
- `wp-content/plugins/mrzoq-wp-sync/mrzoq-wp-sync.php` — plugin bootstrap (headers, hook registration).
- `wp-content/plugins/mrzoq-wp-sync/includes/` — supporting classes (event detection, pending-queue storage, protected flush endpoint, GitHub dispatch client, local logger).
- `src/lib/wordpress.js` — **modified, not new**: add fail-closed fetch validation (Section 4, Section 14).
- `src/lib/rankmath.js` (or equivalent module) — **new**: Rank Math head-data fetch used by `src/pages/blog/[slug].astro` and `src/pages/portfolio/[slug].astro` (Section 6.1).

External platform configuration (not repository files): a Hostinger Cron Jobs entry calling the protected flush endpoint at the configured interval; GitHub repository secrets; GitHub branch protection/ruleset settings for `main`; the five `wp-config.php` constants or server environment variables listed in Section 12 — the plugin exposes no admin settings page for any of them, only a read-only boolean configuration-status display.

There is no `automation/wordpress-sync-log.jsonl` file in this design — it has been replaced by the overwrite-in-place trigger file above (Section 10).

## 17. Implementation Order

1. **Pre-implementation checks:** confirm GitHub Actions workflow permissions needed for `contents: write`; confirm whether branch protection rules/rulesets on `main` permit `GITHUB_TOKEN` to push directly; confirm the actual registered `post_type` keys for Service and Portfolio (Section 6 caveat).
2. Create the GitHub workflow (`.github/workflows/wp-sync.yml`) per Sections 8–11, using placeholder/manually-entered inputs.
3. Configure repository permissions (`contents: write`) and the concurrency group from Section 13.
4. Test the workflow manually via `workflow_dispatch` with hand-entered inputs, before any WordPress code exists; confirm the trigger file is overwritten correctly and exactly one commit is produced.
5. Confirm the resulting commit actually triggers a Hostinger deployment end-to-end.
6. Implement fail-closed fetch validation in `src/lib/wordpress.js` (Section 4, Section 14); deliberately break the WordPress REST API reachability in a test environment and confirm the build fails.
7. **Required verification gate:** confirm, in a non-production or controlled test, that Hostinger actually retains the last successfully deployed version when a new build fails, before relying on this behavior in production. Do not proceed to production activation of automatic sync until this is confirmed.
8. Enable Rank Math Headless CMS Support on `blog.mrzoq.com`; implement the Rank Math head-data fetch and `<head>` rendering for `blog/[slug].astro` and `portfolio/[slug].astro` (Section 6.1); verify rendered HTML contains `mrzoq.com` and never `blog.mrzoq.com` in canonical/OG/Twitter/schema fields.
9. Create the WordPress plugin: event detection, pending queue, protected flush endpoint, GitHub dispatch client, local database logging (Section 7).
10. Configure secrets: the fine-grained GitHub dispatch token, the queue-flush token, and repository/workflow identifiers (Section 12).
11. Configure the Hostinger Cron Jobs entry to call the flush endpoint at the default 1-minute interval; if unavailable, configure the fallback immediate-dispatch-with-lock mode instead (Section 13).
12. Test each qualifying event from Section 5 individually, and in batched combinations, against the real WordPress instance; verify the trigger file always reflects only the latest batch, never historical accumulation.
13. Verify the corresponding change is visible on `mrzoq.com` after deployment, including SEO fields.
14. Update `architecture/PROJECT_STATE.md` and any other existing documentation only after steps 1–13 are verified successful — not before, and not as part of this specification.

## 18. Acceptance Tests

Deployment counts below are verified manually against the Hostinger dashboard/deployment log; no component in this pipeline confirms deployment success on its own (Section 14). "Trigger-file overwrites" counts distinct writes to `automation/wordpress-deploy-trigger.json`; the file never accumulates history regardless of how many overwrites occur.

| # | Action | Expected WP trigger count | Expected trigger-file overwrites | Expected commit count | Expected Hostinger deployment count | Expected public result on mrzoq.com |
|---|---|---|---|---|---|---|
| 1 | Publish a new post | 1 | 1 | 1 | 1 | New post appears at `/blog/{slug}` and in the listing |
| 2 | Update published article body | 1 | 1 | 1 | 1 | Updated content appears on the existing post page |
| 3 | Update Rank Math SEO title or description | 1 | 1 | 1 | 1 | New title/description rendered in `<head>` on the post/portfolio page |
| 4 | Change featured image | 1 | 1 | 1 | 1 | New image appears on the post/portfolio page |
| 5 | Change category or tag | 1 | 1 | 1 | 1 | Updated terms appear on the post page |
| 6 | Save a draft (never published) | 0 | 0 | 0 | 0 | No change |
| 7 | Trigger an autosave | 0 | 0 | 0 | 0 | No change |
| 8 | Create a revision | 0 | 0 | 0 | 0 | No change |
| 9 | Unpublish an article (publish → draft/private) | 1 | 1 | 1 | 1 | Post page removed after deploy |
| 10 | Trash an article | 1 | 1 | 1 | 1 | Post page removed after deploy |
| 11 | Restore and publish an article | 1 | 1 | 1 | 1 | Post page reappears after deploy |
| 12 | Two rapid updates to one article, within the same batching interval | 2 (enqueued) | 1 | 1 | 1 | Reflects only the final state of the two edits |
| 13 | Simultaneous updates to two different articles, within the same batching interval | 2 (enqueued) | 1 (batched together, per Section 13's global scope) | 1 | 1 | Both articles' final states reflected in one deployment |
| 14 | GitHub authentication failure | 1 (attempted) | 0 | 0 | 0 | No change; visible only in WordPress local database log |
| 15 | Astro build failure caused by unrelated code (after a valid trigger-file commit) | 1 | 1 | 1 | 1 attempted, reported failed in Hostinger | `mrzoq.com` remains on its last successfully deployed build only if Hostinger's retention behavior is confirmed per Section 17 step 7; otherwise this outcome is unverified |
| 16 | WordPress REST API made unavailable during an Astro build | 0 (no WP-side event; build triggered independently, e.g. by an unrelated commit) | 0 | n/a | 1 attempted, build fails | No successful deployment replaces the current live site; no public articles disappear; the failure is visible in the Hostinger build log |
| 17 | Canonical/OG/schema URL check on a rendered blog or portfolio page | n/a | n/a | n/a | n/a | Rendered HTML contains `mrzoq.com` in canonical, `og:url`, schema `url`/`mainEntityOfPage`/`@id`, and never contains `blog.mrzoq.com` |
| 18 | Replay a previously processed `request_id` (duplicate dispatch/retry) | 1 (duplicate) | 0 | 0 | 0 | No change; workflow run exits cleanly, logged as a skipped duplicate |
| 19 | Two different valid batches processed sequentially (e.g. batch A, then batch B a few minutes later) | 2 (two distinct batches) | 2 successive overwrites — the file after batch B contains only batch B's events, with no trace of batch A's events | 2 | 2 | Each build reflects the full current WordPress state at its own build time; no accumulation of historical event records inside the trigger file; both batches remain individually visible via GitHub Actions run history and the WordPress local database log |
| 20 | A `failed` batch is retried using the same `request_id` | 1 initial attempt (`failed`) + 1 retry attempt (same `request_id`) | 1 (only on the successful attempt) | 1 | 1 | Batch's changes appear once; the WordPress local database log shows the identical `request_id` on both attempts, one `failed` and one `dispatched` |
| 21 | A batch already marked `dispatched` is requested to resend without an explicit manual retry | 0 (blocked before any GitHub call is made) | 0 | 0 | 0 | No change; blocked entirely at the WordPress plugin layer (Section 7), visible only in the WordPress local database log |
| 22 | The same already-`dispatched` batch's GitHub request is delivered to GitHub a second time (e.g. a lost acknowledgment causes WordPress to resend it) | 2 deliveries of the same `request_id` reaching GitHub | 0 additional (second delivery caught by GitHub's defensive check, Section 8) | 1 total (only from the first delivery) | 1 | No change from the second delivery; confirms duplicate delivery of the same request produces zero additional commits |
| 23 | A genuinely new batch is created after a prior batch was dispatched | 1 | 1, with a new `request_id` distinct from the prior batch's | 1 | 1 | Reflects the new batch's changes; confirms a new `request_id` is generated only for a genuinely new batch, never for a retry |

## 19. Explicit Decisions and Open Questions

**Explicit decisions (confirmed defaults, not left undefined):**

- Trigger type is `workflow_dispatch` only — never `push`, `schedule`, or `repository_dispatch`.
- Batching is global, not per-post; default mechanism is a WordPress-side pending queue flushed by a real, traffic-independent Hostinger cron job at a 1-minute interval; the fallback, used only when reliable system cron cannot be confirmed, is immediate dispatch with a short transient lock, explicitly providing duplicate suppression only, not true batching.
- `source` is a required input with no fallback value.
- `slug` may be an empty string only for the `delete` event; the plugin otherwise retains a last-known slug for every tracked post.
- The WordPress local log is a dedicated database table (`{$wpdb->prefix}mrzoq_sync_log`), not a file under any web-accessible path.
- Automated commits use the `github-actions[bot]` identity, never a human author. No empty commits are allowed.
- Git is not used as a permanent event-audit store. `automation/wordpress-deploy-trigger.json` is overwritten with only the latest batch's metadata on every deployment; it is not a complete audit log and not a source of truth. Permanent operational history lives in the WordPress plugin's database log, GitHub Actions run history, and Hostinger deployment logs. WordPress remains the authoritative source of content truth at all times.
- A real Git commit and push is still required for every deployment because Hostinger currently deploys automatically only after a push to `main`, and no supported Hostinger deployment API, build hook, or external redeploy webhook has been confirmed. Therefore one real trigger-file update and one push are required per deployment batch. If Hostinger later provides a documented deployment API or build hook, the Git-trigger-file mechanism may be replaced in a future architecture revision. Unsupported private hPanel requests must never be used as a substitute for this mechanism.
- Production builds fail closed on required-fetch failure; empty states remain allowed only for genuine, successfully-returned empty collections.
- Rank Math is the fixed WordPress SEO plugin; all public SEO fields resolve to `mrzoq.com`, never `blog.mrzoq.com`.
- No component in this design attempts to confirm Hostinger deployment success back to WordPress or GitHub; a successful dispatch or push is never treated as proof of a successful deployment.
- WordPress is the primary owner of deployment-request identity and retry state: one `request_id` per batch, tracked through `pending`/`dispatching`/`dispatched`/`failed` in the WordPress local database, reused for every retry of that batch and never regenerated for a retry. GitHub's trigger-file `request_id` check (Section 8) is a secondary, final defensive safeguard only — not the source of truth for duplicate control. GitHub Actions run history is operational evidence, never a source of truth for duplicate control.
- All deployment configuration (GitHub dispatch token, repository owner/name, workflow ID, branch, queue-flush token) is infrastructure-controlled via `wp-config.php` constants or server-side environment variables only, for V1. None of it is stored in WordPress-editable storage (`wp_options`, post meta, user meta, plugin settings, transients, or the local database log), and none of it is editable, viewable, replaceable, or exportable from the WordPress admin UI. The admin UI may show only a boolean configured/missing status per required value. Admin-editable configuration is explicitly deferred to a possible future architecture revision, not V1.

**Open questions (cannot be answered from this repository):**

- Whether Hostinger provides real, traffic-independent scheduled execution (e.g., an hPanel Cron Jobs feature, or SSH/WP-CLI access) for the WordPress hosting environment at `blog.mrzoq.com`. This determines whether the 1-minute batching default (Section 13) is achievable or whether the degraded fallback must be used.
- Whether branch protection rules or repository rulesets on `main` permit the default `GITHUB_TOKEN` to push directly, or whether a different token/branch strategy is required (Section 12, Section 17 step 1).
- The actual registered WordPress `post_type` keys for Service and Portfolio content, as distinct from their REST base names (Section 6 caveat) — required before finalizing Section 9's `post_type` allowed values and any WordPress-side hook filtering.
- Where the WordPress plugin code will be maintained (a separate private repository, a subdirectory of this repository, or directly on the WordPress instance without version control).
- Whether production credentials (Section 12) will be stored as `wp-config.php` constants or as Hostinger-provided environment variables — Section 12 now mandates that it must be one of these two mechanisms and never WordPress-admin-editable configuration; only which of the two this specific hosting environment will use remains open.
- The exact JSON/HTML response shape returned by Rank Math's Headless CMS REST endpoint for the installed Rank Math version, needed to implement the field-by-field mapping in Section 6.1 precisely.
- Whether Hostinger actually retains the last successfully deployed version when a new build fails (Section 14, Section 17 step 7) — required verification before production activation, not assumed by this document.
