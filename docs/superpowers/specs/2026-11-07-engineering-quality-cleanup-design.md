# typescript-tsup-library 工程质量优化设计

日期：2026-11-07
范围：工程质量修复（方案 A）。不做模板变量化，不做 CI。

## 背景

该项目是用户的 NPM 包模板项目（配合 rif 脚手架使用）。审查发现以下问题：

- 缺 `exports` 字段，现代消费方无法正确解析入口
- UMD 构建依赖 hack（`replace 'export default' → 'export ='` + `umdWrapper`，libraryName 写死为 `urlLiteral`）。用户决定后续将 UMD 拆为独立项目，本次直接删除
- TypeScript 4.9（2022 年），target es5 偏老
- 发布链路不一致：npmClient 为 pnpm 但 release-it hooks 用 `yarn run`；无 `prepublishOnly` 兜底
- `@types/jest` 装了但测试实际用 bun test；`files` 中发布 `src` 无必要

## 改动清单

### package.json
- 新增 `exports`：
  ```json
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.esm.js",
      "require": "./dist/index.cjs.js"
    }
  }
  ```
- `files` 改为 `["dist"]`
- scripts 新增 `"prepublishOnly": "pnpm build && bun test"`
- 删除 devDependencies：`esbuild-plugin-replace`、`esbuild-plugin-umd-wrapper`、`@types/jest`
- `typescript` 升级至 `^5.x`

### tsup.config.ts
- 删除 `umdOptions` 及对应 esbuild 插件引用，收敛为单个配置对象
- `clean: true`（原 umd 分支为避免 race 设了 clean:false，收敛后不再需要）

### tsconfig.json
- `module: ESNext`，`moduleResolution: Bundler`
- `target: ES2018`
- `types` 中删除 `jest`，仅保留 `node`
- 删除顶层 `sourceMap`（tsup 已负责 sourcemap，避免重复语义）

### .release-it.json
- hooks 中 `yarn run` → `pnpm run`
- `t2k`、`cnpm sync`、GitHub proxy 等个人流程依赖保留不动（不属于本次范围）

## 不做的事
- 不保留 UMD（用户将另行独立项目）
- 不做 rif 模板变量化
- 不加 CI

## 验证标准
1. `pnpm install` 后 `pnpm build` 产物包含 `index.esm.js`、`index.cjs.js`、`index.d.ts`
2. `bun test` 通过
3. `node -e "require('./dist/index.cjs.js')"` 正常
4. ESM 方式 `import` 产物正常（node --input-type=module 验证）
5. `npm pack --dry-run` 只含 dist 与常规元文件
