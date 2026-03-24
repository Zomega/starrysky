# Starrysky Roadmap & TODO

## 1. ATProto Labeler & Integration

- [x] **TypeScript Migration**: Initial port of core logic, services, and tests to TypeScript. (In progress: further type refinement needed).
- [x] **Inventory Verification**: Labeler now verifies freeze balances against user inventory records, not just check-in math. (Security Fix)
- [ ] **First-Draft Validation**: Implement a "dry run" mode for the labeler to test against existing PDS data without broadcasting labels.
- [ ] **Outage Recovery**: Add logic for the labeler to handle its own outages (e.g., "I was offline, so I'll trust the user's claimed sequence for this period").
- [ ] **Account Catch-up**: Ensure the labeler can backfill history for an account that already has a long streak before the labeler started.
- [ ] **PDS Write Support**: Add the ability to actually commit check-in records to the user's PDS.
- [ ] **Auth Flow**: Implement real DID-based authentication for the mockup and website.
- [ ] **Rate Limiting & Filtering**: Implement rate-limiting and DID-based filtering for AppView endpoints to prevent abuse.
- [ ] **XRPC Compliance**: Align `queryLabels` and other endpoints with the full ATProto XRPC specification.
- [ ] **Error Handling**: Add robust error handling (e.g., `express-async-errors`) and structured logging to the service.

## 2. Infrastructure & Tooling

- [x] **Consolidate Core Logic**: Removed JS/TS duplication in `service/src/core`. Logic now lives in `.ts` files and compiles to `dist/`.
- [x] **Fix Type Resolution**: Stopped TS files from importing from generated `.js` files, fixing IDE and compiler navigation.
- [x] **Clean Up Environment Config**: Fixed `@types/node` configuration and removed all `// @ts-ignore` hacks for `process.loadEnvFile`.
- [x] **Stable Testing**: Refactored mockup initialization to be awaitable and replaced flaky `setTimeout` calls with robust polling in the test suite.
- [x] **Mutation Testing Alignment**: Updated Stryker configuration to target `.ts` source files.
- [x] **Dead Code Purge**: Removed stale `.js` files and nearly-empty remnants from the `src` tree. (Final remnant `data-provider.js` still to be purged).
- [ ] **Modern Build System**: Replace the manual `sync:shared` script with a proper bundler like Vite or esbuild to handle browser-side TS.
- [ ] **CI/CD Integration**: Add a GitHub Action to run Prettier, Lint, and Tests (including Stryker) on every PR.

## 3. Website & Prototype UI (Polish & UX)

- [x] **Interactive Visualization**: The mockup now supports dynamic multi-streak views and goal celebration animations.
- [x] **Circle Mini-Icons**: Ensure all mini-icons (freeze, broken, custom) are inside circle bubbles with solid backgrounds.
- [x] **Non-Selectable Stars**: Prevent text/star selection in the fancy streak display.
- [x] **Animation Replay**: Allow re-running the star animation by clicking the card after it finishes.
- [x] **Broken Streak Indicators**: Render a "skull" pill on the day a streak officially dies.
- [x] **Policy Declaration Interface**: Basic interface for declaring/switching policies.
- [ ] **Real Data Integration**: Switch the mockup from `MockDataProvider` to `PdsDataProvider` for a live "dev mode" experience.
- [ ] **Icon Stacking**: Support displaying multiple custom icons per day (currently only the first is shown).
- [ ] **Interactive Tooltips**: Add hover details for mini-icons (e.g., explaining why a gap is "grace" vs "frozen").
- [ ] **Subject Transitions**: Add smooth animations when switching subjects/tabs.
- [ ] **Persistence**: Save the selected subject and overrides to `localStorage`.
- [ ] **Theming Deep-Dive**: Ensure past streaks vs. current streaks have distinct, CSS-class-based color schemes.
- [ ] **Accessibility Audit**: Ensure the calendar grid and goal cards are fully screen-reader compatible.
- [ ] **Responsive Refinement**: Further tune the `ResizeObserver` logic for complex mobile layouts.

## 4. Core Logic & Robustness

- [x] **Specific Date Claims**: Check-ins must target a specific date string (YYYY-MM-DD).
- [x] **Grace vs. Freezes**: Integrated logic for bridging gaps using both grace periods and consumed freezes.
- [ ] **Advanced Timezone Logic**: Determine if a claimed date was physically possible in _any_ timezone given the previous check-in's timestamp.
- [ ] **Sync Latency**: Support offline scenarios (like Strava) where records are uploaded in batches later.
- [ ] **Future/Past Guards**: Prevent claiming future dates or dates too far in the past.
- [ ] **Triplet Density Rule**: Prevent rapid-fire check-ins (e.g., no more than 3 in X hours) to prevent botting.
- [ ] **Monotonicity Invariants**: Enforce that check-in times and claimed dates must always move forward.
- [ ] **Complex Cadences**: Support "X times per week" or "Bi-weekly" reset boundaries.
- [ ] **Policy Migration**: Rules for "superceding" a policy (e.g., switching services while keeping part of the streak sequence).
- [ ] **Freeze Transfers**: Logic for carrying over freeze balance when swapping compatible policies.

## 5. Trust & Gamification

- [ ] **Web of Trust**: Maintain verification metadata alongside labels so other verifiers can assess the "quality" of a streak.
- [ ] **Upgrade/Downgrade Path**: Implement a system where total streak "quality" can upgrade (e.g., transitioning from self-reported to verified check-ins).
- [ ] **Tiered Model**: Explore a Gold/Silver/Bronze model based on verification strictness.
- [ ] **Shields**: Implement "Shield" mechanics that protect a future date (proactive) vs Freezes (reactive).

## 6. Maintenance & Reliability

- [x] **DOM Testing**: Implemented comprehensive UI testing with `happy-dom`.
- [x] **Property-Based Testing**: Validated core streak math using `fast-check`.
- [x] **Mutation Hardening**: High threshold (>60%) for logic robustness on TypeScript source.
- [ ] **E2E Testing**: Add Playwright/BackstopJS for responsive UI and visual regression verification.
- [ ] **Performance Profiling**: Ensure `getGridDataForRange` handles multi-year histories without lag.
- [ ] **API Documentation**: Auto-generate documentation from TypeScript definitions and JSDoc.
