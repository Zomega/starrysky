# Starrysky Roadmap & TODO

## 1. ATProto Labeler & Integration
- [ ] **TypeScript Migration**: Port the logic and labeler to TypeScript to leverage Lexicon definitions and improve type safety.
- [ ] **First-Draft Validation**: Implement the first pass of server-side validation logic based on policy rules.
- [ ] **Outage Recovery**: Add logic for the labeler to handle its own outages (e.g., "I was offline, so I'll trust the user's claimed sequence for this period").
- [ ] **PDS Write Support**: Add the ability to actually commit check-in records to the user's PDS.
- [ ] **Auth Flow**: Implement real DID-based authentication for the mockup and website.
- [ ] **AppView Exploration**: Investigate AppViews and decide if they should be co-located with the labeler or separate.

## 2. Website & Prototype UI (Polish & UX)
- [X] **Circle Mini-Icons**: Ensure all mini-icons (freeze, broken, custom) are inside circle bubbles with solid backgrounds.
- [X] **Non-Selectable Stars**: Prevent text/star selection in the fancy streak display.
- [X] **Animation Replay**: Allow re-running the star animation by clicking the card after it finishes.
- [X] **Broken Streak Indicators**: Render a "skull" pill on the day a streak officially dies.
- [X] **Policy Declaration Interface**: Basic interface for declaring/switching policies.
- [ ] **Icon Stacking**: Support displaying multiple custom icons per day (currently only the first is shown).
- [ ] **Interactive Tooltips**: Add hover details for mini-icons (e.g., explaining why a gap is "grace" vs "frozen").
- [ ] **Subject Transitions**: Add smooth animations when switching subjects/tabs.
- [ ] **Persistence**: Save the selected subject and overrides to `localStorage`.
- [ ] **Theming Deep-Dive**: Ensure past streaks vs. current streaks have distinct, CSS-class-based color schemes.

## 3. Core Logic & Robustness
- [X] **Specific Date Claims**: Check-ins must target a specific date string (YYYY-MM-DD).
- [X] **Grace vs. Freezes**: Integrated logic for bridging gaps using both grace periods and consumed freezes.
- [ ] **Advanced Timezone Logic**: Determine if a claimed date was physically possible in *any* timezone given the previous check-in's timestamp.
- [ ] **Sync Latency**: Support offline scenarios (like Strava) where records are uploaded in batches later.
- [ ] **Future/Past Guards**: Prevent claiming future dates or dates too far in the past.
- [ ] **Triplet Density Rule**: Prevent rapid-fire check-ins (e.g., no more than 3 in X hours) to prevent botting.
- [ ] **Monotonicity Invariants**: Enforce that check-in times and claimed dates must always move forward.
- [ ] **Complex Cadences**: Support "X times per week" or "Bi-weekly" reset boundaries.
- [ ] **Policy Migration**: Rules for "superceding" a policy (e.g., switching services while keeping part of the streak sequence).
- [ ] **Freeze Transfers**: Logic for carrying over freeze balance when swapping compatible policies.

## 4. Trust & Gamification
- [ ] **Web of Trust**: Maintain verification metadata alongside labels so other verifiers can assess the "quality" of a streak.
- [ ] **Upgrade/Downgrade Path**: Implement a system where total streak "quality" can upgrade (e.g., transitioning from self-reported to verified check-ins).
- [ ] **Tiered Model**: Explore a Gold/Silver/Bronze model based on verification strictness.
- [ ] **Shields**: Implement "Shield" mechanics that protect a future date (proactive) vs Freezes (reactive).

## 5. Maintenance & QA
- [X] **Property-Based Testing**: High-coverage properties for sequence validity and index monotonicity.
- [X] **Mutation Hardening**: High threshold (>70%) for logic robustness.
- [ ] **Visual Regression**: Set up Playwright/BackstopJS for responsive UI verification.
- [ ] **Performance Profiling**: Ensure `getGridDataForRange` handles multi-year histories without lag.
- [ ] **API Documentation**: Auto-generate docs from JSDoc comments in `streak-logic.js`.
