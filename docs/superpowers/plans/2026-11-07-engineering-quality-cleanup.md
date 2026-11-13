# Engineering Quality Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the NPM library template per spec `docs/superpowers/specs/2026-11-07-engineering-quality-cleanup-design.md`: add `exports`, drop UMD, upgrade TS 5, fix release hooks to pnpm.

**Architecture:** Pure config-file changes to `package.json`, `tsup.config.ts`, `tsconfig.json`, `.release-it.json`. No source code changes. Verification is via build/test/consume commands, not unit tests (nothing new to unit-test).

**Tech Stack:** pnpm, tsup 8, TypeScript 5, bun test.

---

### Task 1: package.json — exports, files, prepublishOnly, deps

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Edit package.json**

Apply these changes (keep everything else untouched):

1. Add `exports` right after `"types"`:
```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.esm.js",
    "require": "./dist/index.cjs.js"
  }
},
```
2. Change `"files"` to:
```json
"files": [
  "dist"
],
```
3. Add to `scripts`:
```json
"prepublishOnly": "pnpm build && bun test",
```
4. Remove these devDependencies: `@types/jest`, `esbuild-plugin-replace`, `esbuild-plugin-umd-wrapper`
5. Change `"typescript": "^4.9.5"` → `"typescript": "^5.5.4"`

- [ ] **Step 2: Install and verify lockfile resolves**

Run: `pnpm install`
Expected: install succeeds; removed packages gone from node_modules.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add exports field, trim deps, upgrade typescript to 5"
```

---

### Task 2: tsup.config.ts — remove UMD config

**Files:**
- Modify: `tsup.config.ts` (full rewrite)

- [ ] **Step 1: Replace tsup.config.ts with single config**

```ts
import { defineConfig } from 'tsup';
import tsupBanner from '@jswork/tsup-banner';

export default defineConfig({
  entry: ['src/index.ts'],
  clean: true,
  format: ['cjs', 'esm'],
  tsconfig: './tsconfig.json',
  dts: true,
  sourcemap: true,
  cjsInterop: true,
  banner: {
    js: tsupBanner(),
  },
  outExtension({ format }) {
    return {
      js: `.${format}.js`,
    };
  },
});
```

- [ ] **Step 2: Build and verify output**

Run: `pnpm build && ls dist`
Expected: `index.cjs.js`, `index.cjs.js.map`, `index.esm.js`, `index.esm.js.map`, `index.d.ts`, `index.d.ts.map` — no `.umd.js`.

- [ ] **Step 3: Commit**

```bash
git add tsup.config.ts
git commit -m "build: remove UMD config and esbuild plugin hacks"
```

---

### Task 3: tsconfig.json — modernize module/target

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Edit compilerOptions**

Changes (keep `strict`, `skipLibCheck`, `esModuleInterop`, `forceConsistentCasingInFileNames`, `pretty`, `lib`, `include` as-is):

1. `"target": "es5"` → `"target": "ES2018"`
2. `"module": "Node16"` → `"module": "ESNext"`
3. `"moduleResolution": "Node16"` → `"moduleResolution": "Bundler"`
4. Delete top-level `"sourceMap": true` (tsup owns sourcemaps)
5. `types` array: remove `"jest"`, keep only `["node"]`

- [ ] **Step 2: Verify typecheck still passes via build**

Run: `pnpm build`
Expected: build succeeds, `index.d.ts` regenerated.

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: modernize tsconfig (ES2018, ESNext/Bundler, drop jest types)"
```

---

### Task 4: .release-it.json — pnpm hooks

**Files:**
- Modify: `.release-it.json`

- [ ] **Step 1: Replace yarn with pnpm in hooks**

```json
{
  "git": {
    "requireCleanWorkingDir": false
  },
  "hooks": {
    "before:init": ["pnpm run test"],
    "after:init": ["t2k"],
    "after:bump": ["pnpm run build"],
    "after:release": ["pnpm pkg get name | cnpm sync"]
  },
  "github": {
    "release": true,
    "proxy": "http://127.0.0.1:9090"
  }
}
```

(`t2k`, `cnpm sync`, proxy intentionally kept — personal workflow, out of scope.)

- [ ] **Step 2: Commit**

```bash
git add .release-it.json
git commit -m "chore: use pnpm in release-it hooks"
```

---

### Task 5: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Tests pass**

Run: `bun test`
Expected: all tests pass.

- [ ] **Step 2: CJS consume works via exports**

Run: `node -e "const f = require('./dist/index.cjs.js'); console.log(f.default ? f.default(123) : f(123))"`
Expected: `[ 100, 20, 3 ]`

- [ ] **Step 3: ESM consume works via exports**

Run: `node --input-type=module -e "import f from './dist/index.esm.js'; console.log(f(123))"`
Expected: `[ 100, 20, 3 ]`

- [ ] **Step 4: Pack contents check**

Run: `npm pack --dry-run`
Expected: tarball contains only `dist/*`, `package.json`, `README.md`, `LICENSE.txt` — no `src/`.
