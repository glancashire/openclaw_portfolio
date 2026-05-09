# Migration learnings

Short notes for future agents working on major app migrations.

## Keep it simple
- Migrate one layer at a time: data, state, UI, then app flow.
- Keep the old path working until the new path is proven.
- Replace hard-coded demo data with real app state early.

## Swift / SwiftUI / SwiftData style guidance
- Put business logic outside views.
- Keep SwiftUI views small and state-driven.
- Use one clear source of truth for persisted data.
- Avoid duplicate adapters, parallel models, and temporary compatibility layers that never get removed.
- Prefer a few reusable helpers over repeated parsing, formatting, or status-mapping logic.

## Safe migration pattern
1. add the new model/path
2. route one feature through it
3. test it
4. remove the obsolete path
5. update docs immediately

## What future agents should watch for
- hidden hard-coded lists
- duplicate execution flows
- stale docs that describe old behavior
- generated artifacts being mistaken for source of truth

## Rule of thumb
If two paths do the same job, keep the clearer one, test it, then delete the other.
