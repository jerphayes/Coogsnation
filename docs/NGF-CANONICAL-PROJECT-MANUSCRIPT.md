# NGF / CoogsNation Canonical Project Manuscript

**Purpose:** authoritative project operating memory, build history, module inventory, deployment handoff, and end-of-session continuity record for NGF Productions LLC / CoogsNation.

**Canonical path:** `docs/NGF-CANONICAL-PROJECT-MANUSCRIPT.md`
**Repository:** `jerphayes/Coogsnation`
**Working branch:** `Chat-sandbox`
**Production working tree:** `/home/coogsnation/app`
**Production app port:** `127.0.0.1:5000`
**Last canonical baseline before this manuscript:** commit `996577b` (`Clean build context and establish Mother data scaffold`)
**Manuscript created:** 2026-08-31
**Maintenance rule:** update this manuscript at the end of every meaningful work session, deployment, architecture decision, business-integration decision, or incident.

---

## 0. How to Use This Manuscript

This file exists so no human or AI agent has to reconstruct the project from chat memory.

At the start of a new work thread, the first instruction should be:

> Load `docs/NGF-CANONICAL-PROJECT-MANUSCRIPT.md` from branch `Chat-sandbox` and use it as the project handoff and operating memory.

This document is not a substitute for Git history, tests, database state, or the running application. It is the **index and handoff layer** that tells an operator where truth lives and what has been decided.

### Authority order

When two sources disagree, use this order:

1. **Observed production state and verified runtime behavior**.
2. **Committed source on the active Git branch**.
3. **Database schema/migrations and test evidence tied to a commit**.
4. **This canonical manuscript**.
5. Archived status documents and historical build reports.
6. Conversation notes or AI memory.

Conversation memory is useful context, but it is never the system of record.

### Status vocabulary

Every major item in this manuscript should be understood using one of these states:

- **DEPLOYED** — known to be running in production.
- **COMMITTED** — present in the repository, but deployment may require verification.
- **VERIFIED** — supported by a successful test, inspection, or runtime confirmation.
- **INTEGRATED** — connected to the application architecture, but may still need live acceptance testing.
- **PLANNED** — approved direction, not yet implemented.
- **BUSINESS DECISION** — owner-selected product or commercial direction.
- **HISTORICAL / SUPERSEDED** — retained for chronology, not current operating truth.
- **OPEN ISSUE** — known unfinished or defective behavior.

### Canonical-data rule

Do not promote raw logs, failed experiments, screenshots, temporary files, AI guesses, or unverified notes into project truth. They are **evidence**, not automatically training truth. Anything promoted into Mother AI training/curated knowledge should carry provenance and validation state.

---

# PART I — COMPANY, PRODUCT, AND PRODUCT PHILOSOPHY

## 1. Company Identity

**Formal company name:** `NGF Productions LLC`.

Do not substitute legacy placeholders such as `NGF LLC`, `Next Generation Fandom LLC`, or `Next Generation Fansites LLC` in formal company/legal language.

**Primary corporate domain:** `ngf.llc`.

**Public/company contact currently standardized in CoogsNation legal copy:** `admin@ngf.llc`.

**CoogsNation legal relationship:** CoogsNation.com is **operated by NGF Productions LLC**.

The preferred general wording is “operated by NGF Productions LLC,” rather than using `d/b/a` as a blanket description for every future NGF site or domain.

## 2. Product Identity

**CoogsNation** is the University of Houston proof-of-concept and first full NGF fan-community deployment.

The larger business architecture is **NGF Core Engine + Fan Entity Packs**:

- one reusable NGF application/core engine;
- school/team/club/athlete-specific presentation, data, rituals, identity and fan culture layered on top;
- University of Houston first;
- Texas A&M is the next major school target after the UH build is proven;
- later expansion can include universities, professional teams, national teams and individual athletes;
- long-term international categories may include football/soccer, cricket, rugby, baseball, basketball, combat sports and Olympic athletes.

### Core product principle

The engine can be common while the “dermis” changes by fan entity. The reusable technology should stay consistent, while each fan community must honor the specific school/team/athlete culture rather than feeling like a generic reskin.

## 3. Product Goal

The goal is not merely a forum or static fansite. NGF is intended to create a reason for fans to **return repeatedly**, especially around live events.

Core engagement concepts include:

- live community conversation;
- ticker and score/event awareness;
- floating/resizeable interactive windows;
- pick’em/polls/predictions;
- virtual venues and lounges;
- radio/game-broadcast utilities;
- merchandise, tickets and travel commerce;
- rewards and loyalty;
- creator/influencer participation;
- AI-assisted sports/community experiences.

The experience should feel like a sports-event command center and community, not a conventional message board with ads attached.

---

# PART II — REPOSITORY, STACK, AND PRODUCTION OPERATIONS

## 4. Repository and Branch

**Repository:** `jerphayes/Coogsnation`
**Primary working branch:** `Chat-sandbox`
**Other known branch:** `Approved-Build-Ready-for-Deploy`

Production/VPS source path is always:

```text
/home/coogsnation/app
```

Do not assume a home-directory clone such as `~/Coogsnation` on the VPS.

## 5. Application Stack

Current application architecture includes:

- React / Vite frontend;
- Node / Express backend;
- PostgreSQL;
- Drizzle schema/migrations;
- Passport/session authentication;
- Socket.IO / live application capability;
- Docker / Docker Compose;
- production build served by `node dist/index.js`;
- AI routing and AI-facing endpoints;
- integrated virtual venue engine using Three.js, lazy-loaded from the main application;
- Playwright regression infrastructure;
- Appium infrastructure;
- Selenium retained as reserve tooling;
- Mother AI orchestration/testing structure.

## 6. Production Docker Rules

Production Compose file:

```text
docker-compose.prod.yml
```

Production UI/legal-only deployment pattern:

```bash
cd /home/coogsnation/app
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d --no-deps app
docker compose -f docker-compose.prod.yml ps app
curl -fsS http://127.0.0.1:5000/healthz && echo
docker compose -f docker-compose.prod.yml logs --tail=60 app
```

Use `--no-deps` for application-only rebuilds when no migration or dependency service change is intended. This avoids accidentally invoking migration dependencies during small UI/legal deployments.

### Mandatory pre-build rule added after the 2026-08-31 incident

**Never build production from an unexplained dirty working tree.**

Before any production build, verify:

```bash
git status --short
git diff --check
git log -1 --oneline
```

Any tracked modification, staged change, or untracked file inside the Docker build context must be explicitly understood before building.

Future Mother deployment control must automatically enforce this rule.

## 7. Docker Build Hygiene

As of the 2026-08-31 cleanup:

- local source backups were moved outside the production repository;
- design assets/reference files not intended for production were moved outside the build tree;
- regression results were archived outside the application repository;
- Python caches and transient Playwright output were removed;
- `.gitignore` was extended for generated/local artifacts;
- `.dockerignore` was extended so local/test/training artifacts do not enter production images;
- Mother AI data directories are intentionally excluded from the production app image.

Commit:

```text
996577b Clean build context and establish Mother data scaffold
```

---

# PART III — FOUNDATION AND BUILD HISTORY

## 8. Foundation v2.5 — Infrastructure Hardening

**HISTORICAL / SUPERSEDED by v2.5.1, but architecturally important.**

Foundation v2.5 established provider-neutral infrastructure hardening including:

- development-only Vite runtime imports removed from production graph;
- Node `crypto.randomUUID()` replacing `nanoid`;
- runtime container directly starting `node dist/index.js`;
- `.env` loading through Compose;
- production TypeScript/security/build gate;
- dedicated numbered transactional migration runner;
- restart policy;
- `/healthz` container health checks;
- JSON log rotation;
- `no-new-privileges`;
- hardened production capabilities;
- CPU/memory limits in production;
- isolated PostgreSQL backend network;
- backup/restore tooling and checksum/encryption requirements.

Reference: `FOUNDATION_V2_5_STATUS.md`.

## 9. Foundation v2.5.1 — Development Reliability Correction

**COMMITTED foundation rule set.**

v2.5.1 corrected development reliability without weakening the production gate:

- development app no longer uses `cap_drop: ALL`, preserving bind-mounted source write capability;
- production application/migration services retain hardened capabilities;
- development bootstrap is guarded by `DATABASE_BOOTSTRAP=true`;
- production migration uses the built migration runner;
- environment expansion is delegated correctly to the container shell;
- Docker/Codespaces/backup documentation was clarified;
- infrastructure regression coverage was extended to prevent the defects from returning;
- Compose syntax validation was added to CI expectations.

Reference: `FOUNDATION_V2_5_1_STATUS.md`.

## 10. v2.5.3 — Authentication/Profile + Owner Admin Dashboard

**INTEGRATED / COMMITTED.**

The v2.5.3 owner dashboard build includes:

- full-owner administrator model;
- server-enforced administrator authorization;
- owner dashboard overview/system status;
- user search and safe account inspection;
- suspend / restore / unlock / session-revocation controls;
- owner-only administrator promotion/removal;
- guardrails against suspending/demoting the owner;
- append-only administrative audit history;
- read-only private Administrator AI boundary;
- administrator regression checks and owner bootstrap tooling.

Reference: `OWNER_ADMIN_DASHBOARD_BUILD_V2.5.3.md`.

## 11. v3.0 Integrated Master Build

**COMMITTED / core current architecture.**

The integrated v3 foundation brought together:

- public AI conversation routing;
- Gemini multimedia route support in the historical v3 build;
- owner admin dashboard and isolated admin AI;
- provider-neutral commerce foundation;
- virtual venue engine;
- authentication runtime correction;
- database/schema readiness before HTTP startup;
- database-aware `/healthz`;
- race-safe handle availability behavior;
- `auth:doctor` diagnostics.

Reference: `COOGSNATION_V3_0_BUILD_STATUS.md`.

---

# PART IV — AUTHENTICATION, MEMBERSHIP, AND ACCOUNT SYSTEM

## 12. Authentication Runtime Repair

**COMMITTED / verified architecture.**

The v3 runtime authentication repair addressed a chain in which the frontend could render while database-backed login operations failed.

Key corrections:

- development PostgreSQL binds only to loopback host access;
- development example database credentials were reconciled;
- `0005_auth_runtime_readiness.sql` creates the `sessions` table/index idempotently;
- startup verifies PostgreSQL plus required auth schema before listening;
- `/healthz` returns failure when PostgreSQL is unavailable rather than false-positive health;
- handle availability rejects malformed/non-2xx responses and avoids stale response races;
- `npm run auth:doctor` verifies environment agreement/connectivity without printing secrets.

Reference: `AUTHENTICATION_RUNTIME_FIX_V3_0.md`.

## 13. Membership Signup Direction

**BUSINESS DECISION / PLANNED refinement.**

The desired user signup/authentication stack is convenience-first and broad enough for global reach:

- Google;
- Apple;
- TikTok;
- X;
- Facebook;
- email.

YouTube acquisition is effectively covered for authentication through Google. Instagram is primarily an acquisition/creator-identity channel rather than the core universal login mechanism.

Creator/influencer accounts should use the same core membership system and then connect external creator/social profiles to enrich their profile.

## 14. Social Authentication vs. Marketing Tracking

This distinction is canonical:

- OAuth/social login is a user-requested authentication action.
- Advertising pixels/tags are separate optional marketing technologies.
- Signing in through Facebook/Google/TikTok does **not** automatically mean the user authorized Meta Pixel, TikTok Pixel, Google Ads tags, or equivalent marketing tracking.

This separation is reflected in the current legal/privacy architecture.

---

# PART V — LEGAL, PRIVACY, CONSENT, AND COMPANY WORDING

## 15. Privacy Choices v3

**DEPLOYED / COMMITTED on 2026-08-31.**

Commit:

```text
7d7764f Harden privacy consent and compliance wording
```

The updated consent/privacy system includes:

- company wording updated to `NGF Productions LLC`;
- `CoogsNation.com, operated by NGF Productions LLC` relationship;
- `admin@ngf.llc` privacy contact in the revised legal copy/UI;
- privacy-choice key/version updated to `ngf_privacy_choices_v3` / `2026-08-31-v3` so users receive the revised choice state;
- Necessary category always active;
- Analytics & Performance;
- Personalization;
- Affiliate Measurement;
- Advertising & Marketing;
- Accept All;
- Reject Optional;
- Modify Choices;
- Global Privacy Control handling for advertising/marketing where applicable;
- global helper for future integrations to query category permission;
- Travelpayouts remains categorized under Affiliate Measurement;
- Ticketmaster and StubHub placeholders remain Affiliate Measurement;
- Meta, TikTok and Google Ads are pre-classified as Advertising & Marketing but are not automatically loaded merely because those names exist in the vendor registry;
- social login language explicitly separated from advertising tracking in legal policy.

### Consent architecture rule

Optional advertising/marketing technologies should remain inactive until the applicable choice/consent permits them.

Affiliate measurement remains a distinct purpose from advertising/marketing.

## 16. Legal Footer / Entity Language

Current preferred wording:

```text
CoogsNation.com — operated by NGF Productions LLC
```

Do not revert formal product/legal copy to legacy `NGF LLC` wording.

The homepage NGF Productions footer card links to `https://ngf.llc`.

---

# PART VI — COMMUNITY, FORUMS, LIVE SPORTS, AND ENGAGEMENT

## 17. Forums / Community

**DEPLOYED / active product module.**

CoogsNation includes forum/community surfaces and sport/community categories.

The preferred long-term discussion architecture is native community integration rather than relying on Discord as the core discussion system.

## 18. Radio Broadcast Utility Card

**DEPLOYED / COMMITTED.**

Commit:

```text
ad644a0 Add radio broadcast utility card
```

The Forums page includes a Radio Broadcast sports utility card with a live-game listening link. The feature is counted as a sports utility card rather than a database discussion category.

## 19. Ticket Purchase Utility

**INTEGRATED utility concept.**

A Ticket Purchase card exists in the sports/community utility surface. This will become more valuable as direct affiliate relationships are connected.

## 20. Live Ticker / Data Collector

**BUILT / evolving.**

The project direction includes an NGF-controlled multi-source NCAA/live-score collector rather than dependence on a single source.

Known capabilities developed in the project include:

- multi-source collector architecture;
- live ticker rendering;
- rainbow ticker treatment;
- flash behavior for upset/significant events;
- mobile ticker priority.

The ticker is strategically important because live, rapidly changing information creates repeat visits and a “watch the tape” event feel around games.

## 21. Multi-Chat / Lounge

**BUILT / requires continued testing.**

Multi-chat/lounge capability has been integrated in prior builds. Socket room-management and lounge connection defects have been worked previously.

The long-term target is simultaneous interaction between:

- live chat;
- ticker;
- floating pick’em/prediction content;
- venue/lounge experiences.

## 22. Pick’em / Poll / Prediction Module

**PLANNED high-priority engagement module.**

The target is a simple, fast, game-centered interface rather than a wagering product.

Expected behavior:

- polls and game score picks;
- floating/resizeable widget beside chat;
- real-time event context from ticker/data engine;
- community discussion while predictions remain visible;
- no need to navigate away from the live fan experience.

---

# PART VII — VIRTUAL VENUE ENGINE

## 23. Venue Engine Integration

**INTEGRATED / extensive regression evidence.**

Reference: `docs/INTEGRATION-REPORT.md`.

The venue engine was integrated into the main application as one repository, one application, one dependency tree and one authentication system.

Major architecture:

- engine located under `client/src/venue-engine/`;
- Three.js root dependency;
- lazy session chunk so non-venue visitors do not pay the Three.js initial-load cost;
- React `Venue` mount/lifecycle page;
- shared typed application ↔ engine contract;
- CoogsNation authentication adapter;
- API-backed persistence adapter;
- event bridge allow-list;
- venue routes/context/storage integration;
- seat claim database migration.

### Venue validation evidence

Historical integration gate recorded:

- TypeScript check clean;
- security regression gate passed;
- production build passed;
- venue conformance/smoke/basketball/integration/bridge suites;
- 224 venue assertions, 0 failures in the integration report.

### Venue capacities recorded in integration report

- Football: 58,298 seats.
- Basketball: 10,630 seats.
- Baseball: 4,916 seats.
- Concert: 16,260 seats.

### Venue known/open items carried in historical integration report

- browser rendering/performance needed live validation at that report’s stop point;
- a CrowdManager seat-claim handler defect existed in the standalone engine before integration;
- seat-claim conflict UX was minimal;
- avatar locality/storage required further work for large gatherings;
- frame-loop fault isolation should be hardened before large-scale multi-user venue behavior;
- Socket.IO venue multi-user work followed the integration stop point.

Before treating any historical open item as still current, inspect the latest repository/runtime state.

---

# PART VIII — COMMERCE, MARKETPLACE, AFFILIATES, AND REWARDS

## 24. Commerce Philosophy

NGF is not intended to depend on one commerce provider forever.

Current strategic approach:

- use Shopify initially to learn, launch and generate cash flow quickly;
- do not marry the complete product/business architecture to Shopify;
- build a longer-term NGF-controlled marketplace/e-commerce capability using Medusa where appropriate;
- support unique direct vendor relationships outside a single commerce ecosystem.

## 25. Dropship / Inventory Rule

**BUSINESS DECISION:** direct fulfillment / dropship is a non-negotiable preference for broad marketplace supply.

Desired supplier characteristics:

- apparel;
- fan merchandise;
- sporting goods;
- accessories;
- NGF private label/customization;
- direct fulfillment;
- on-demand manufacturing where possible;
- minimal inventory carrying burden.

## 26. Medusa / NGF Marketplace

**PLANNED strategic platform.**

Medusa is the preferred direction for the long-term NGF Marketplace / in-house commerce architecture, especially for power sellers and custom marketplace functionality.

Tradeoff accepted: greater control means NGF must own integration maintenance when vendor APIs change.

## 27. Affiliate / Partner Priority

Current commercial rollout priority:

1. enroll with direct/preferred partner programs;
2. connect partner commerce to site surfaces;
3. harden Cloudflare/security;
4. stress-test traffic/latency;
5. refine membership signup/authentication;
6. launch coordinated membership acquisition.

### Ticketing

Priority relationships:

- Ticketmaster — preferred direct affiliate route through Impact when available;
- StubHub — desired partner relationship.

Ticketmaster enrollment is the next major commercial action after current cleanup/canonicalization work.

### Travel / related partners

Strategic preference is direct one-to-one or direct brand program wherever practical. Aggregators should be fallback or used where they provide a clear advantage.

Previously selected direction includes direct programs such as Trip.com and DiscoverCars where available, Expedia/Vrbo partner paths where appropriate, and Travelpayouts retained only where it does not conflict with preferred direct relationships.

## 28. NGF Rewards

**PLANNED priority feature.**

NGF Rewards should operate like a loyalty currency.

Points may be earned from verified actions such as:

- merchandise purchases;
- ticket purchases;
- qualified site visits;
- genuine interactive community engagement rather than passive sign-in.

Accumulated points should be usable toward:

- discounts;
- full eligible purchases;
- future premium experiences/benefits.

Long-term conceptual model is similar to airline loyalty: points can partially or fully offset eligible value and unlock premium benefits.

---

# PART IX — AI ARCHITECTURE AND MOTHER AI

## 29. Mother AI Mission

**INTEGRATED foundation / long-term orchestration target.**

Mother AI is intended to become the orchestration and intelligence layer for the NGF ecosystem.

Canonical lifecycle from `mother-ai/README.md`:

```text
RESEARCH -> KNOWLEDGE -> PLAN -> BUILD -> TEST -> DIAGNOSE -> FIX -> DEPLOY -> OBSERVE -> IMPROVE
```

Mother is expected to coordinate:

- research;
- structured knowledge;
- training;
- agents;
- website creation;
- regression testing;
- deployment;
- analytics;
- continuous improvement.

OLMo is identified in the Mother architecture as a controllable model layer.

Large model weights/checkpoints/datasets/generated artifacts do not belong blindly in Git.

## 30. Mother Data Scaffold

As of commit `996577b`, the canonical tracked scaffold exists:

```text
mother-ai/data/curated/.gitkeep
mother-ai/data/datasets/.gitkeep
mother-ai/data/provenance/.gitkeep
```

### Meaning

- `curated/` — reviewed material promoted toward trusted knowledge/training use.
- `datasets/` — controlled structured datasets/manifests.
- `provenance/` — source, verification, transformation and lineage records.

Mother data is intentionally excluded from the production CoogsNation application Docker image.

## 31. Garbage-In / Garbage-Out Rule

Mother must **not** learn that every artifact in the repository is truth.

Raw regression logs, failed builds, scratch files, AI-generated guesses and old backups must be classified before being used for training or operational decision-making.

Every promoted training/knowledge item should eventually carry at least:

- source;
- date/time;
- producing human/agent/tool;
- related commit SHA or build identifier when applicable;
- verification state;
- outcome;
- whether the item is observation, diagnosis, decision, fix, test evidence or final accepted truth.

## 32. Mother Regression Control — Current State

Current Mother testing tooling includes:

```text
mother-ai/tools/testing/plan-regression.sh
mother-ai/tools/testing/execute-regression.sh
mother-ai/tools/testing/regression-status.sh
```

The current scripts can choose between Playwright/web regression, health/API checks, Appium infrastructure and deferred iOS/macOS CI based on changed committed files.

### Known architectural gap discovered 2026-08-31

The current plan/executor logic primarily compares committed Git ranges (`BASE` to `HEAD`). That does **not** automatically catch uncommitted working-tree files entering a Docker build.

This gap must be corrected.

## 33. Mother Deployment Gate — Required Next Evolution

**PLANNED / mandatory before Mother receives deployment authority.**

Mother’s deployment preflight must:

1. inspect `git status --porcelain`;
2. classify staged, unstaged and untracked files;
3. determine whether every build-context difference is approved;
4. block production build when unexplained dirty-tree state exists;
5. record commit SHA, branch and build timestamp;
6. bind a source/build-context identity to the Docker image;
7. verify that Git branch/HEAD, VPS source and running image correspond;
8. run post-deployment health and feature regression;
9. record results to provenance/history.

### 2026-08-31 training incident

During the privacy/compliance deployment, `client/src/pages/Forums.tsx` contained an intentional but uncommitted Radio Broadcast change. Docker correctly built the working tree, which meant the production image included that change even though the compliance commit did not.

The Radio Broadcast feature was valid and was later committed separately as `ad644a0`, but the process exposed the control weakness.

**Mother lesson:**

> A successful build is not necessarily a controlled build. Production deployment must prove the source/build-context provenance before building.

This incident should be preserved as a training/provenance example, not merely remembered as chat history.

## 34. Playwright and Appium Relationship to Mother

Do not rush to remove Playwright or Appium.

The intended progression is:

1. Mother learns to select tests.
2. Mother launches Playwright/Appium.
3. Mother interprets failures.
4. Mother diagnoses likely root cause.
5. Mother proposes/applies approved fixes.
6. Mother reruns the affected suites.
7. Mother builds a proven operating record.
8. Only if future direct browser/device-control capability matches or exceeds existing tooling should any underlying test technology be retired.

Until then, Playwright and Appium are **Mother’s test instruments**.

---

# PART X — TESTING, CI, LOAD, SECURITY, AND DEPLOYMENT QUALITY

## 35. Existing Regression Philosophy

The project operates under “move fast and fix things,” but that means automation and recovery discipline — not skipping validation.

Testing layers include or are intended to include:

- TypeScript/build gate;
- static security regression;
- authentication regression;
- admin dashboard regression;
- AI-router regression;
- infrastructure regression;
- venue regression;
- Playwright browser regression;
- Appium mobile infrastructure/regression;
- socket/chat tests;
- database/schema guards;
- load/concurrency testing;
- post-deployment verification.

## 36. Load / Event-Spike Testing

**PLANNED before major membership campaign.**

The important load scenario is not only gradual traffic. It is synchronized sports-event behavior: thousands of fans reacting within seconds to a touchdown, upset, game-ending play, ticket event or other live trigger.

Testing should cover controlled ramps such as:

- 1,000;
- 10,000;
- 50,000;
- 100,000 concurrent synthetic users;
- higher only after architecture and test environment prove safe.

Targets include:

- landing page;
- join/login;
- APIs;
- ticker;
- chat/Socket.IO;
- database connections;
- static/image delivery;
- affiliate/store surfaces;
- event spikes.

Do **not** fire uncontrolled massive tests directly at production.

## 37. Cloudflare Hardening

**PLANNED before major traffic campaign.**

Desired Cloudflare controls include:

- CDN/caching;
- DDoS protection;
- WAF;
- bot protection;
- rate limiting;
- challenges;
- signup/login/API protection;
- security rules tuned for actual application behavior.

Cloudflare/DNS changes should be preceded by an inventory of current domain/proxy configuration.

After Cloudflare hardening, repeat load/latency testing through the real edge path.

---

# PART XI — DATABASE AND SCHEMA SAFEGUARDS

## 38. Migration Discipline

Production migrations are not to be casually mixed into unrelated UI deployments.

Use explicit migration/DB procedures only when a release requires them.

### Known schema caution

Historically, Drizzle push created Coogpaws-related tables that were not represented in the numbered migrations. Those tables should not be casually dropped merely because schema definitions change.

Before any destructive schema operation:

- inspect actual production tables/data;
- query counts;
- understand whether data exists;
- prefer explicit numbered migrations;
- avoid blind `drizzle-kit push` against production.

## 39. Venue Seat Claims

The integrated venue architecture uses a database uniqueness constraint on venue/seat identity as the real concurrency guard. Simultaneous seat claims should resolve at the database level rather than relying only on client-side timing.

---

# PART XII — MARKETING, CREATOR, AND GROWTH STRATEGY

## 40. Community Growth Strategy

The initial objective is community acquisition, not immediate merchandise saturation.

Important channels include:

- LinkedIn;
- YouTube;
- Instagram;
- TikTok;
- X;
- Bluesky;
- Facebook;
- Reddit/community discussion channels where appropriate.

For University of Houston, the UH system LinkedIn presence is strategically significant because of its large existing follower base and direct relevance to the target community.

## 41. Creator / Influencer Direction

Creators should be able to join as normal members and then connect public social/creator identities.

Impact and similar ecosystems may later be useful not only for NGF as a publisher/affiliate, but also for creator discovery and college-targeted partnership growth.

---

# PART XIII — CURRENT PRIORITIES AND NEXT ACTIONS

## 42. Immediate Commercial / Technical Sequence

As of this manuscript’s creation, the intended sequence is:

1. **Ticketmaster / Impact enrollment and partner setup.**
2. StubHub and other preferred partner enrollment.
3. Connect approved affiliate/store links into actual commerce surfaces.
4. Inventory and harden Cloudflare/security.
5. Design/run controlled load and latency tests, including synchronized event spikes.
6. Refine membership signup and social-auth flow.
7. Launch coordinated targeted membership campaign.
8. Continue Mother deployment-gate/regression-training work in parallel with safe product development.

## 43. Major Planned Product Modules

Approved or strongly selected future directions include:

- NGF Rewards;
- pick’em/polls/predictions;
- Medusa-based NGF Marketplace;
- broader affiliate ticket/travel/commerce integration;
- expanded creator identity/profile features;
- fantasy sports later;
- classifieds / fan memorabilia marketplace;
- deeper virtual venue multi-user capability;
- school/entity cloning through reusable NGF Core Engine + unique fan packs;
- later global/team/athlete expansion.

---

# PART XIV — KNOWN OPERATING RISKS / DO-NOT-FORGET ITEMS

## 44. Critical Operational Guardrails

Do not forget these between threads:

- VPS repo path is `/home/coogsnation/app`.
- Active work branch is `Chat-sandbox` unless deliberately changed.
- Do not use `git add -A` casually on the VPS.
- Do not use blind `git commit -a`, `git clean`, `git reset`, destructive stash/pull patterns, or destructive schema pushes without first understanding the working state.
- Stage only intended files.
- Verify dirty-tree/build-context state before Docker builds.
- Do not run DB migrations for UI/legal-only changes.
- Use `--no-deps app` for app-only production restarts when appropriate.
- Verify `/healthz` and logs after deployment.
- A green container health check is necessary but not sufficient; critical feature flows need regression coverage.
- Keep formal company name `NGF Productions LLC`.
- Keep social login separate from marketing consent/tracking.
- Do not treat raw Mother logs as training truth.
- Mother training inputs require curation and provenance.

---

# PART XV — END-OF-SESSION HANDOFF PROTOCOL

## 45. Mandatory End-of-Session Update

At the end of each meaningful work session, update this manuscript with a compact handoff entry.

Each entry should answer:

1. What was the objective?
2. What changed?
3. Which files/modules changed?
4. Which commits were created?
5. What tests passed or failed?
6. Was anything deployed?
7. What is the current production state?
8. What new business/architecture decisions were made?
9. What defects or risks remain?
10. What is the exact next action?
11. What should Mother learn from the session?
12. What evidence/provenance should be retained?

## 46. Session Handoff Template

Copy this block to the top of the Session Log section at the end of a work session:

```markdown
### YYYY-MM-DD — Session title

**Objective**
- ...

**Decisions**
- ...

**Code / modules changed**
- ...

**Commits**
- `<sha>` — message

**Tests / validation**
- PASS/FAIL — ...

**Deployment**
- Not deployed / deployed to production
- Health result: ...

**Incidents / lessons**
- ...

**Mother provenance / training lesson**
- ...

**Open items**
- ...

**Exact next action**
- ...
```

## 47. New-Thread Handoff Procedure

When a conversation/thread changes:

1. load this manuscript from `Chat-sandbox`;
2. inspect the latest Session Log entry;
3. inspect `git log -5 --oneline` or current commits when operational work depends on exact source state;
4. inspect runtime/working tree if deploying or editing production;
5. do not rely on conversation memory to fill gaps that Git/manuscript can answer.

---

# PART XVI — SESSION LOG

## 48. 2026-08-31 — Privacy Compliance, Repository Cleanup, and Canonical Memory Decision

**Objective**

- harden privacy/consent wording and company identity;
- prepare compliance architecture for social login, affiliate measurement and future marketing tags;
- deploy the revised consent system;
- clean the VPS repository/build context;
- establish a safer Mother training-data structure;
- stop relying on cross-thread AI memory as project truth.

**Decisions**

- formal company wording standardized to `NGF Productions LLC`;
- CoogsNation legal relationship expressed as “operated by NGF Productions LLC”;
- social authentication is explicitly separate from advertising/marketing tracking;
- GPC should be honored for applicable advertising/marketing behavior;
- raw regression history is evidence, not automatically training truth;
- Mother should eventually control Playwright/Appium, not prematurely replace them;
- Git + this canonical manuscript becomes the durable cross-thread system of record.

**Code / modules changed**

- Privacy Choices v2 -> v3;
- legal privacy/terms wording;
- shared/footer legal entity text;
- Radio Broadcast utility card committed;
- repository cleanup;
- `.gitignore` / `.dockerignore` build-context hygiene;
- Mother data scaffold.

**Commits**

- `7d7764f` — Harden privacy consent and compliance wording.
- `ad644a0` — Add radio broadcast utility card.
- `996577b` — Clean build context and establish Mother data scaffold.
- manuscript creation commit — see Git history after this file is added.

**Tests / validation**

- privacy patch passed `git diff --check` before commit;
- Docker production build passed the project validation stage (`npm run check`, `npm run security:check`, `npm run build`);
- application container started;
- repository cleanup concluded with a clean Git working tree before this manuscript was created.

**Deployment**

- revised privacy/compliance build was deployed to the production application container;
- Radio Broadcast code was present in that Docker working-tree build and subsequently committed so Git history matched the feature that had entered the image.

**Incident / lesson**

- Docker builds the working tree/build context, not “only the commit you meant to deploy.”
- An intentional but uncommitted Forums change entered the compliance build.
- The feature was valid, but the process control was not sufficient.

**Mother provenance / training lesson**

- Production build preflight must detect unexplained staged, unstaged and untracked files.
- Mother’s current committed-diff test planner is not sufficient as a deployment provenance gate.
- Future Mother deployment authority requires clean/approved build-context verification and post-deploy regression.

**Open items**

- add a formal Mother deployment gate that verifies working-tree provenance before Docker build;
- continue converting session outcomes into curated/provenance records;
- expand browser/mobile regression coverage for critical flows;
- Ticketmaster/Impact enrollment remains the next commercial priority.

**Exact next action**

- begin Ticketmaster/Impact partner enrollment and document the resulting account/integration requirements here at session end.

---

# PART XVII — MAINTENANCE RULE

## 49. Do Not Let This Become Another Stale Status File

This manuscript is only useful if it stays current.

At the end of each major work block:

- update the latest status and Session Log;
- mark superseded statements rather than silently leaving contradictions;
- record actual commits/tests/deployments;
- distinguish planned ideas from implemented modules;
- promote verified lessons into Mother provenance/curated data deliberately;
- keep the manuscript concise enough to reload, but complete enough to resume the project without reconstructing chat history.

If this file conflicts with the live repository or production state, **fix this file immediately after verifying the real state**.
