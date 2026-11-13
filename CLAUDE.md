# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目定位

这是一个 NPM 库**模板项目**（配合 `rif` 脚手架使用），本身不是要发布的包。`rif.config.yaml` 定义了占位符替换规则（`tsup-plugin-lightningcss` → `${PROJECT_NAME}`），在基于模板创建新包时生效。README/package.json 中的 `A Lightning CSS plugin for tsup.` 等占位符是有意设计，不是 bug，不要去"修复"它们。

## 常用命令

- `pnpm build` — tsup 构建（CJS + ESM + dts）
- `bun test` — 运行测试（bun test runner，不是 jest/vitest）
- `bun test __tests__/index.spec.ts` — 运行单个测试文件
- `pnpm release` — release-it 发布（版本号 → 构建 → GitHub release；hooks 配置在 `.release-it.json`）

## 架构

单导出库：`src/index.ts` 导出一个默认函数；测试在 `__tests__/`。

构建配置（tsup.config.ts）：
- 单配置产出 CJS（`index.cjs.js`）和 ESM（`index.esm.js`），含 dts 和 banner（`@jswork/tsup-banner`）
- `outExtension` 将产物重命名为 `.<format>.js`
- 无 UMD 构建（已移除；如需要由独立项目处理）

发布链路：`prepublishOnly`（build + test）作为 npm publish 兜底；release-it hooks 使用 **pnpm**，其中包含个人机器依赖（`t2k`、`cnpm sync`、GitHub proxy）——除非明确要求，否则保留它们。

## 约定

- 包管理器：**pnpm**
- 测试：bun test（隐式使用 `bun:test` 的 `expect`）
- 从模板创建新包时需更新：package.json 的 `name`/`description`/`keywords` 等，占位符替换交给 `rif` 处理
- 源码更新后：`README.md` 和 `llms.txt` 必须同步更新（保持文档与实际导出/用法一致）
