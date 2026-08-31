# OUR PATH — NGF Productions LLC Strategic, Technology & Operating Manuscript

**Purpose:** the living company strategy, technology plan, product architecture, build history, module inventory, operating memory, deployment handoff, lessons learned, and forward path for NGF Productions LLC and the NGF/CoogsNation platform.

**Canonical path:** `docs/NGF-CANONICAL-PROJECT-MANUSCRIPT.md`
**Repository:** `jerphayes/Coogsnation`
**Working branch:** `Chat-sandbox`
**Production working tree:** `/home/coogsnation/app`
**Production app port:** `127.0.0.1:5000`
**Last canonical baseline before this manuscript:** commit `996577b` (`Clean build context and establish Mother data scaffold`)
**Manuscript created:** 2026-08-31
**Strategic structure last updated:** 2026-08-31
**Maintenance rule:** when the owner says **“update Our Path”**, update this manuscript with the latest verified past, present, and future state: strategic decisions, technology choices, product/module status, business plans, commits, tests, deployments, incidents, lessons, risks, and next actions.


---

# EXECUTIVE SUMMARY

## Company Mission

NGF Productions LLC is building a reusable, AI-assisted global sports-fandom platform whose first proof of concept is CoogsNation for University of Houston fans. The company is not building a collection of unrelated websites. It is building a common **NGF Core Engine** that can be deployed repeatedly with **Fan Entity Packs** containing the identity, culture, language, sports structure, data sources, commerce, rituals, moderation rules, and presentation needed for a specific school, club, team, national side, athlete, or fan community.

The long-range objective is a global network of fan communities that can scale from universities to professional and international sports and eventually to individual athletes, while preserving local cultural authenticity.

## Strategic Principle: Business Plan First, Technology Second

Technology is selected to accomplish the business plan; technology is not the business plan.

Every major technology decision in Our Path must answer:

1. **Business objective** — what company outcome are we trying to create?
2. **Required capability** — what must the platform be able to do?
3. **Current technology choice** — what best accomplishes that capability now?
4. **Architectural role** — where does it fit and what does it control?
5. **Why selected** — why is it preferable to practical alternatives at this stage?
6. **Limitations and risks** — what can break, constrain, or make it expensive?
7. **Scale path** — how does the capability grow without rewriting the company?
8. **Replacement trigger** — what evidence would justify changing the technology?
9. **Business outcome** — how does the choice improve growth, retention, revenue, defensibility, or operating leverage?

The architecture must preserve **capabilities** even when individual vendors, models, libraries, hosting providers, or tools are replaced.

## The NGF Strategic Flywheel

The operating thesis is:

**Acquire fans → give them a live reason to return → deepen community identity → add contextual commerce → reward participation → learn from usage → improve the product → clone the proven engine into the next fan entity.**

The most important engagement loop is centered on live sports:

**Live scores/ticker + chat + radio/listen-live + pick’em/polls + virtual venues + community reaction.**

This creates a synchronized game-day environment that is fundamentally more valuable than a static forum because fans have a reason to keep CoogsNation open during the event.

Commerce then becomes contextual rather than intrusive:

**tickets + merchandise + travel + classifieds/marketplace + rewards.**

## Strategic Technology Thesis

The current technology stack is deliberately modular:

- **React/Vite** for a fast, mobile-first fan interface.
- **Node/Express** for the application/API layer.
- **PostgreSQL/Drizzle** for authoritative transactional state and explicit migrations.
- **Socket.IO** for real-time fan interaction and live-event fan-out.
- **Three.js** for immersive venue experiences without forcing the venue engine into the initial page bundle.
- **Docker/Compose** for reproducible deployment at the current operating scale.
- **Cloudflare** as the planned global edge, security, WAF, bot, caching, rate-limit, and DDoS layer before large-scale acquisition.
- **Shopify** as the practical near-term commerce launcher.
- **Medusa** as the strategic longer-term NGF-controlled marketplace/e-commerce foundation.
- **Playwright and Appium** as Mother AI’s present browser/device testing instruments.
- **GitHub + Git history + Our Path + Mother provenance** as the durable system of record.
- **Mother AI** as the future orchestration, evaluation, testing, deployment, knowledge, and continuous-improvement layer.
- **Specialized open models and child agents** beneath Mother rather than one monolithic AI dependency.

The company should not prematurely introduce infrastructure simply because it is fashionable. New infrastructure is added when a measured bottleneck or strategic requirement justifies it.

## Global AI / Localization Thesis

Global expansion requires **localization, not translation**.

A fan community in Thailand, Brazil, Japan, India, Germany, Nigeria, Mexico, or another market must reflect local language, sports terminology, supporter culture, humor, rituals, moderation expectations, commerce, media sources, and legal context. The English CoogsNation experience should never simply be machine-translated and called a local product.

Mother AI therefore needs specialized multilingual children that can be evaluated and trained for specific markets.

### Apertus strategic role

**Strategic status: CANDIDATE MULTILINGUAL CHILD MODEL — not a hard dependency.**

As of 2026-08-31, the Swiss AI Initiative’s current Apertus family is unusually aligned with NGF’s global strategy:

- official Apertus model cards describe **1,811 natively supported languages**;
- Apertus v1.5 is available in **8B and 70B** variants;
- the v1.5 model cards describe **text, image, and audio input** with text output;
- the v1.5 family supports context lengths up to **262,144 tokens**;
- current official model cards identify the release as fully open and the Hugging Face release uses the **Apache-2.0** license;
- smaller Apertus variants exist for constrained/edge hardware;
- a Southeast-Asia-focused Apertus/SEA-LION adaptation demonstrates the model family’s usefulness as a base for regional post-training, including Thai and other SEA languages.

**Strategic implication:** Mother can use Apertus or a superior future multilingual model as a controllable child for language generation, translation assistance, localization research, local-content adaptation, community support, and Fan Entity Pack creation.

Mother must remain the authority that evaluates the child’s output. Apertus is replaceable; the **global-localization capability is permanent**.

The replacement trigger is straightforward: if another controllable model offers materially better localization quality, cultural fluency, cost, inference efficiency, licensing, tool use, safety, or operational reliability, Mother should be able to replace the child without changing NGF Core or the business strategy.

## Current Business Priorities

The immediate commercialization sequence remains:

1. enroll with preferred direct ticket/commerce partners, beginning with Ticketmaster/Impact and then StubHub/other selected partners;
2. connect approved partner offerings into the fan experience;
3. harden Cloudflare/security;
4. run controlled traffic, latency, concurrency, and synchronized-event-spike tests;
5. refine membership signup and social authentication;
6. launch a coordinated membership-growth campaign;
7. measure retention/conversion and feed verified learning back into Mother and Our Path.

## Long-Term Defensibility

NGF’s defensibility is intended to come from the **system**, not any single feature:

- reusable NGF Core;
- entity-specific cultural packs;
- live-event engagement loops;
- proprietary operating knowledge accumulated by Mother;
- structured provenance and regression learning;
- creator/community relationships;
- direct commerce/affiliate relationships;
- rewards and loyalty;
- scalable fan-data and live-event architecture;
- rapid localization and deployment into new fan entities.

---

# STRATEGIC DOCUMENT OUTLINE

Our Path is organized to preserve **past, present, and future**. The executive/strategic sections define where the company is going and why. The detailed sections below preserve the technical and operating truth required to execute it.

## A. Corporate Strategy and Business Architecture

- Company identity and legal operating model.
- NGF Core Engine + Fan Entity Pack strategy.
- Initial university proof-of-concept and expansion sequence.
- Global sports/team/athlete expansion thesis.
- Competitive differentiation and defensibility.

## B. Product and Engagement Strategy

- Community/forums.
- Live ticker and data collection.
- Chat/lounges.
- Radio/listen-live.
- Pick’em/polls/predictions.
- Virtual venues.
- Rewards.
- Creator participation.
- Contextual commerce.

## C. Strategic Technology Stack

- Current production stack.
- AI/Mother/child-model architecture.
- Global localization stack.
- Testing/CI/regression.
- Security/Cloudflare.
- Load/concurrency architecture.
- Data/storage/migrations.
- Commerce architecture.
- Replacement and scale triggers.

## D. Commercial and Growth Strategy

- Ticketing and affiliate partnerships.
- Shopify-to-Medusa commerce evolution.
- Marketplace/classifieds.
- Rewards and loyalty.
- Social/creator acquisition.
- School/entity rollout.
- International localization and market entry.

## E. Operating Model and Governance

- Git/production rules.
- Deployment gates.
- Mother provenance.
- Quality/testing requirements.
- Incident lessons.
- End-of-session handoff.
- “Update Our Path” command and maintenance discipline.

## F. Historical Record

- Foundation builds.
- Major integrated modules.
- Security/authentication repairs.
- Venue-engine integration.
- Privacy/compliance evolution.
- Important commits, regressions, and lessons.

---

# STRATEGIC CAPABILITY → TECHNOLOGY MAP

| Business objective | Required capability | Current / preferred technology | Status | Scale / replacement trigger |
|---|---|---|---|---|
| Build one engine for many fan communities | Reusable modular web/application core | React/Vite + Node/Express + PostgreSQL/Drizzle | CURRENT | Replace components only when measured scale/maintainability requires it |
| Real-time game-day retention | Low-latency fan interaction and event fan-out | Socket.IO + NGF ticker/data collector | CURRENT / EVOLVING | Add distributed adapter/cache when multi-instance scale requires it |
| Immersive fandom | 3D venue/lounges without penalizing normal page load | Three.js lazy-loaded venue engine | INTEGRATED | Revisit renderer/runtime only if device/performance data demands it |
| Global localization | Massively multilingual controllable AI child | Apertus family candidate under Mother | STRATEGIC CANDIDATE | Replace on superior quality/cost/licensing/cultural performance |
| Southeast Asia localization | Regional multilingual/cultural adaptation | Evaluate Apertus/SEA-LION lineage and curated local data | RESEARCH / CANDIDATE | Promote only after Thai/SEA benchmark and human review |
| AI orchestration | Plan/research/test/diagnose/fix/deploy/observe | Mother AI + specialized child agents/models | IN DEVELOPMENT | Expand authority only after proven regression/provenance record |
| Browser/mobile QA | Repeatable regression execution | Playwright + Appium; Selenium reserve | CURRENT | Mother takes over orchestration before any tool is retired |
| Production reproducibility | Controlled application packaging/deploy | Docker + Docker Compose | CURRENT | Add orchestration platform only when multiple-service/host scale justifies it |
| Global edge/security | CDN, WAF, bot protection, DDoS, rate limiting | Cloudflare | PLANNED PRIORITY | Tune from measured traffic/attack patterns |
| Near-term commerce | Launch quickly and learn merchandising | Shopify | SELECTED NEAR TERM | Keep while economics/velocity beat custom ownership |
| Long-term marketplace control | Extensible owned marketplace/e-commerce | Medusa | STRATEGIC | Build modules/integrations as NGF volume justifies ownership |
| Transactional truth | Durable member, commerce, venue, moderation data | PostgreSQL | CURRENT | Scale vertically/replicas/partitioning before adding needless databases |
| Retrieval/AI knowledge | Searchable structured/vector knowledge near core data | Prefer PostgreSQL + pgvector first | PLANNED OPTION | Dedicated vector system only when measured retrieval scale requires it |
| Distributed hot state | Multi-instance sockets/cache/rate-limit/queues | Redis-compatible layer when needed | SCALE TRIGGER | Introduce only when multi-instance/event-fanout requirements appear |
| Media/object storage | Globally served uploads/assets | S3-compatible object storage / Cloudflare R2 candidate | SCALE TRIGGER | Move off local volumes before multi-host production |
| Observability | Cross-service tracing/metrics/error diagnosis | Structured logs + health now; OpenTelemetry/metrics stack later | EVOLVING | Add when multi-service scale makes local logs insufficient |

### Technology governance rule

**Do not add a technology because it is impressive. Add it because it removes a demonstrated business or operating constraint.**

---

# GLOBAL FANSITE FACTORY — FORWARD ARCHITECTURE

The long-term deployment equation is:

**NGF Core Engine + Mother AI + specialized child models + Fan Entity Pack + local data/culture + verified commerce/content sources = deployable fan community.**

A mature Fan Entity Pack should eventually contain structured definitions for:

- entity identity and branding;
- sports/league/team taxonomy;
- languages and localization rules;
- supporter terminology, traditions, rituals and humor;
- news and official/independent data sources;
- live-score/data-source configuration;
- community categories and moderation norms;
- venue definitions;
- creator/influencer ecosystem;
- local merchandise/ticket/travel partners;
- rewards configuration;
- legal/regulatory/local privacy requirements;
- social acquisition channels;
- engagement calendars and event windows;
- approved AI prompts/agents/evaluation tests;
- launch and regression checklist.

Mother should be able to research and propose a Fan Entity Pack, but no pack becomes canonical merely because an AI generated it. It must pass source verification, cultural review, regression, security, legal/commercial checks as applicable, and provenance recording.

---

# GROWTH STRATEGY

## Phase 1 — Prove the engine with University of Houston

Objective: demonstrate that a focused fan community can attract members, create repeat game-day engagement, and generate contextual commerce without degrading the community.

Key assets:

- CoogsNation community;
- ticker/data;
- chat;
- radio/listen-live;
- ticketing;
- privacy-safe marketing stack;
- membership;
- venue experiences;
- later Pick’em and Rewards.

## Phase 2 — Clone the proven engine into a materially larger adjacent university market

Texas A&M remains the intended next major university target after UH. The technology should be cloned; the culture should not. The Fan Entity Pack must reflect the school’s own identity, rituals, traditions, content sources, and fan behavior.

## Phase 3 — Build a repeatable university portfolio

Once the entity-pack process, moderation, live-data, commerce and membership acquisition are repeatable, expand selectively to large universities where fan intensity, alumni population, social reach, and monetization opportunities justify deployment.

## Phase 4 — Expand beyond universities

Use the same core for:

- professional clubs/teams;
- national teams;
- global football/soccer;
- cricket;
- rugby;
- baseball;
- basketball;
- combat sports;
- individual athletes and creators.

## Phase 5 — Global localized network

Mother plus multilingual children create a localization operating advantage. Each market is evaluated for language/cultural fit, sports rights/data availability, creator ecosystem, commerce partners, regulation and hosting/performance requirements.

The goal is not hundreds of manually maintained websites. The goal is a **repeatable fan-community deployment system**.

---

# STRATEGIC METRICS

Our Path should track metrics that reveal whether the strategy is actually working. Targets should be added only when deliberately selected; the initial metric families are:

- membership growth and verified-member conversion;
- daily/monthly active members;
- game-day concurrent users;
- session duration during live events;
- week-over-week and season-over-season retention;
- chat/community participation rate;
- Pick’em/poll participation when launched;
- ticker/radio/venue engagement;
- creator referrals and attributed acquisition;
- ticket/merchandise/travel affiliate conversion;
- marketplace GMV when launched;
- Rewards earn/burn and repeat-purchase behavior;
- page/API/socket latency under normal and synchronized-spike load;
- error/crash/session-failure rates;
- moderation load and abuse/fraud rates;
- infrastructure cost per active member;
- localization quality and human-review acceptance by language/entity.

---

# OPERATING DOCTRINE

1. **Business capability outranks vendor loyalty.**
2. **Current technology choices are replaceable.**
3. **The NGF Core contract and data/provenance boundaries should be harder to replace than any provider.**
4. **Do not train Mother on unverified garbage.**
5. **Do not give Mother authority faster than her regression/provenance record justifies.**
6. **Do not build production from unexplained source state.**
7. **Test synchronized event spikes, not just average traffic.**
8. **Global localization requires cultural adaptation, not literal translation.**
9. **Community value comes before monetization pressure; commerce must fit the fan journey.**
10. **At the end of meaningful work, update Our Path.**

---

## 0. How to Use This Manuscript

This file exists so no human or AI agent has to reconstruct the project from chat memory.

At the start of a new work thread, the first instruction should be:

> Load **Our Path** (`docs/NGF-CANONICAL-PROJECT-MANUSCRIPT.md`) from branch `Chat-sandbox`, read the Executive Summary and latest Session Log, and use it as the strategic and operating handoff.

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


### 2026-08-31 — Our Path Restructured as Company Strategic Document

**Objective**
- elevate Our Path from a technical handoff into the living strategic manuscript of NGF Productions LLC;
- preserve the project’s past, present, and future in one durable company record;
- make technology selection explicitly subordinate to the business plan;
- formalize the global multilingual/child-model strategy under Mother AI.

**Decisions**
- “Our Path” is the owner’s canonical name for this manuscript.
- When the owner says “update Our Path,” the manuscript must be updated.
- Our Path now begins with an Executive Summary, strategic outline, technology-to-business capability map, growth plan, global fansite-factory architecture, operating doctrine, and strategic metrics.
- Technology choices are current implementation decisions, not permanent business dependencies.
- Mother AI remains the orchestrator/evaluator; specialized children can be replaced without changing the NGF business architecture.
- Apertus is recorded as a strategic multilingual child-model candidate, not a hard dependency.
- Current official Apertus materials reviewed on 2026-08-31 describe 1,811 natively supported languages; this strengthens the original multilingual-fansite thesis and should be benchmarked rather than accepted blindly.
- Localization is defined as language + culture + sports terminology + rituals + moderation + local commerce + regulation, not translation alone.

**Strategic technology additions to the forward plan**
- Apertus family evaluation under Mother for global language/localization work.
- Evaluate regional Apertus-derived models such as SEA-LION for Southeast Asian/Thai use cases.
- Prefer pgvector inside PostgreSQL as the first vector/retrieval extension before introducing a separate vector database.
- Introduce Redis-compatible distributed state only when multi-instance Socket.IO, hot-event fan-out, distributed rate limiting, caching, or queues create a measured need.
- Use S3-compatible object storage / Cloudflare R2 as a scale trigger before multi-host media storage.
- Add OpenTelemetry/metrics infrastructure when multi-service operations make current logs/health checks insufficient.
- Do not introduce Kubernetes or equivalent orchestration before actual service/host scale justifies the operational complexity.

**Mother provenance / training lesson**
- Mother must learn strategic technology selection as a mapping from business objective → required capability → current tool → evidence → limits → replacement trigger.
- A child model is never canonical truth merely because it is powerful or multilingual.
- Global Fan Entity Packs must be source-verified and culturally reviewed before promotion.

**Open items**
- benchmark Apertus/other multilingual candidates on priority languages and sports terminology before operational adoption;
- define the first formal Fan Entity Pack schema;
- build Mother’s deployment provenance gate;
- continue Ticketmaster/Impact commercial enrollment and document integration requirements;
- establish initial strategic KPI baselines as real traffic begins.

**Exact next action**
- resume Ticketmaster/Impact partner enrollment while preserving the new strategic structure in Our Path at the end of the work session.


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
