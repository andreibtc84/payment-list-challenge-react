# General decisions

Architecture and tooling decisions that span several steps.

| # | Decision |
|---|---|
| 1 | [The React Compiler does the memoisation](#1-the-react-compiler-does-the-memoisation) |

---

## 1. The React Compiler does the memoisation

**Context.** React re-renders are cheap, but some values need a stable identity. For example, the `filters` object from `usePaymentFilters` must stay the same object until the URL changes. Up to Step 3 that took one hand-written `useMemo`. Writing `useMemo`, `useCallback` and `React.memo` by hand is easy to get wrong, with missed dependencies or memoising things that don't need it.

**Decision.**
- Enable the React Compiler 1.0 (`babel-plugin-react-compiler`, pinned exactly) through `@vitejs/plugin-react`'s `babel.plugins`. Vitest reuses the Vite config, so tests run compiled code too.
- No manual memoisation in the codebase. The one `useMemo` is removed.
- `eslint-plugin-react-hooks` 7, whose `recommended` preset adds the compiler's lint rules (for example `set-state-in-render`, `refs`, `purity`).

**Alternatives.**
- Keep the `useMemo` and add no compiler. No new build step, but manual memoisation stays the rule for new code.
- Enable the compiler but keep the existing `useMemo`. This is React's conservative advice for existing code ("leave it in place, or carefully test before removing"). Here the test exists, so the line went.

**Consequences.**
- Every component and hook compiles, with no bail-outs.
- A test checks that `filters` keeps its identity while the URL is unchanged. On a copy of the repo, removing the `useMemo` without the compiler fails that test, and with the compiler it passes.
- Measured cost:
  - builds take about 0.2s longer;
  - the test run takes about 0.7s longer, because Babel now transforms each file;
  - the bundle grows by 4.6 kB (0.2 kB gzipped).
- If the compiler ever skips a component, that component is simply not memoised. The identity test catches it where it matters.
- Upgrading to `@vitejs/plugin-react` 6 means moving the plugin to `@rolldown/plugin-babel` with `reactCompilerPreset()`, because v6 removed the inline `babel` option.
