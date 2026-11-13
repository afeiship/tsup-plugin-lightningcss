# @jswork/tsup-plugin-lightningcss
> A Lightning CSS plugin for tsup.

[![version][version-image]][version-url]
[![license][license-image]][license-url]
[![download][download-image]][download-url]

在 tsup 构建结束时，用 [Lightning CSS](https://lightningcss.dev/) 把一份独立的 CSS 源码编译到产物目录。返回标准 esbuild `Plugin`（`onEnd` 钩子），因此 esbuild / Vite 也能直接使用。

## installation

```shell
pnpm add -D @jswork/tsup-plugin-lightningcss
```

`lightningcss` 是本包的 dependency；`esbuild` 作为 peer 由 tsup 提供，一般无需单独安装。

## usage

```ts
// tsup.config.ts
import { defineConfig } from 'tsup';
import lightningCssPlugin from '@jswork/tsup-plugin-lightningcss';

export default defineConfig({
  entry: ['src/index.tsx'],
  esbuildPlugins: [
    lightningCssPlugin({
      entry: 'src/style.css',
      outFile: 'style.css'
    })
  ]
});
```

构建后产物目录里会多出 `style.css`，宿主项目在入口引入一次即可：

```ts
import '@jswork/react-pwa-promotion/dist/style.css';
```

CSS 源码可以用**原生 CSS Nesting** 写（`& .xxx` / `&.xxx`），默认 targets（chrome90 / firefox90 / safari15）都不支持 nesting，所以产物一定被展开成扁平选择器，不依赖浏览器对 nesting 的支持。注意 Lightning CSS 不支持 Sass 的 `&__xxx` 后缀拼接。

## api

`lightningCssPlugin(options?): esbuild.Plugin`，同时提供默认导出与同名命名导出。

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `entry` | `string` | `'src/style.css'` | 源 CSS，相对 `absWorkingDir`（默认 cwd），也可传绝对路径 |
| `outFile` | `string` | `'style.css'` | 产物名，相对 tsup 的 `outDir`，也可传绝对路径 |
| `targets` | `Targets` | `DEFAULT_TARGETS` | Lightning CSS 浏览器目标 |
| `minify` | `boolean` | `true` | 是否压缩 |
| `silent` | `boolean` | `false` | 是否关闭日志 |

另外导出 `DEFAULT_TARGETS` 常量和 `LightningCssPluginOptions` 类型。

## behavior

- 在 esbuild `onEnd` 阶段执行；JS 构建失败时不生成 CSS。
- tsup 会为每个 format 各跑一次 esbuild.build，插件用「输出路径 + 源内容 hash」去重；产物被 `clean` 删除或源码变化时会自动重建，watch 模式同样生效。
- 输出目录自动跟随 `build.initialOptions.outdir`，源路径基于 `absWorkingDir || process.cwd()`，不依赖插件文件自身的位置。
- 编译错误作为 esbuild `errors` 返回，让构建正确失败。

## development

```shell
pnpm install
pnpm build       # tsup → dist/index.cjs.js / index.esm.js / index.d.ts
bun test         # bun test runner
pnpm typecheck   # tsc --noEmit
pnpm release     # release-it
```

## license
Code released under [the MIT license](https://github.com/afeiship/tsup-plugin-lightningcss/blob/main/LICENSE.txt).

[version-image]: https://img.shields.io/npm/v/@jswork/tsup-plugin-lightningcss
[version-url]: https://npmjs.org/package/@jswork/tsup-plugin-lightningcss

[license-image]: https://img.shields.io/npm/l/@jswork/tsup-plugin-lightningcss
[license-url]: https://github.com/afeiship/tsup-plugin-lightningcss/blob/main/LICENSE.txt

[download-image]: https://img.shields.io/npm/dm/@jswork/tsup-plugin-lightningcss
[download-url]: https://www.npmjs.com/package/@jswork/tsup-plugin-lightningcss
