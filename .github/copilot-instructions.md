# Copilot‑Rules.md

> **Purpose**
> A single source of truth that teaches every future AI agent (and human) **how we build software here**—lean, test‑driven.

---

## Stack

- TypeScript
- NextJS
- Yarn Workspaces
- Vitest
- React
- SCSS

## 🧭 Core Principles

| #   | Principle                    | Why it matters                                                                                         |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | **AI‑First, Human‑Reviewed** | We let Copilot draft, but humans (or supervising agents) own quality.                                  |
| 2   | **TDD Loop × 3**             | Red/Green/Refactor ensures reliability. Repeat at least 3 cycles until tests & code feel bullet‑proof. |
| 3   | **Reuse > Re‑invent**        | Prefer well‑maintained OSS packages. Fewer lines = fewer bugs.                                         |
| 4   | **Surgical Conciseness**     | Clear ≠ short, but remove every unneeded symbol.                                                       |
| 5   | **10× Craftsmanship**        | Think in patterns (SRP, DI, CQRS, etc.). Name things so future devs smile.                             |
| 6   | **Ask Early, Ask Often**     | Uncertainty? Emit a question instead of wrong code.                                                    |
| 7   | **Closet Rule**              | A tidy `src/` is like a tidy closet: folders tell the story (`lib/`, `components/`, `api/`, `tests/`). |

---

## 🛠️ Project Bootstrapping (Yarn)

---

## 🤖 Prompt Engineering Cheatsheet

1. **Set the stage** – start every file with a goal comment. _“// Build an LRU cache with eviction callback”_.\[^1]
2. **Break down tasks** – describe sub‑steps; Copilot excels at micro‑prompts.\[^2]
3. **Show examples** – give signature + sample I/O.\[^1]
4. **Constrain & review** – specify style, patterns, limits (e.g., “≤ 80 LOC”).

---

## 🔄 TDD‑Driven AI Agentic Workflow

```
repeat 3 times:
    1. Map requirement → user story (+edge cases)
    2. Write failing test (*.spec.ts*)
    3. Let Copilot produce minimal code to pass
    4. Run: yarn test --watch
    5. Refactor for readability & reuse
    6. Re‑evaluate test coverage → add missing cases
```

_Tip: annotate each cycle in commit messages_:

> `git cz` → _feat(cache): 🎯 Cycle 2 – adds eviction policy, 97% cov._
> Note: Only test critical features and core business logic. Avoid testing types or trivial usage of external libraries.

---

## 🏷️ Naming & Patterns

- **Files**: `verb‑noun.ts` (`fetch‑user.ts`)
- **Tests**: mirror path `__tests__/fetch‑user.spec.ts`
- **React**: PascalCase components, hooks `useX`.
- Apply **SRP** (single responsibility) & keep functions ≤ 50 LOC.

---

## 📝 README Template (generated after every feature)

````md
# <PackageName>

## Synopsis

<One‑sentence purpose>

## Public API

| Function | Description |
| -------- | ----------- |
| ...      | ...         |

## Running locally

```bash
yarn install
yarn test
```
````

```

---

## ✅ Copilot Do & Don’t

| Do | Don’t |
|----|-------|
| Add context comments | Accept unvetted suggestions |
| Generate tests first | Skip edge cases |
| Cite OSS source links | Copy code without licenses |
| Keep diff minimal | Commit generated junk |

---

## ❓ FAQ

- **“Unsure about a requirement?”**
  Open a TODO with clear question. The reviewer must resolve before merge.

- **“When to add a dependency?”**
  If a well‑maintained lib (>1k ⭐, MIT) solves ≥ 80% of the problem.

---

## 🔗 References

[^1]: GitHub Docs – Best practices for using Copilot
[^2]: GitHub Blog – How to write better prompts for Copilot
[^3]: ThoughtWorks – Copilot + TDD are perfect companions
[^4]: Latent.Space – TDD for agentic apps
[^5]: Smashing Magazine – Yarn Workspaces

```
