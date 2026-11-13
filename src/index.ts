/**
 * tsup（esbuild）插件：构建结束时用 Lightning CSS 编译独立的 CSS 源码到 outDir。
 *
 * 返回标准 esbuild Plugin（onEnd 钩子），因此除了 tsup，也能直接用于 esbuild / Vite。
 * 运行时只依赖 lightningcss，esbuild 仅作为类型 / peer 依赖。
 *
 * 用法（宿主项目的 tsup.config.ts）：
 *   import lightningCssPlugin from '@jswork/tsup-plugin-lightningcss';
 *   export default defineConfig({
 *     esbuildPlugins: [lightningCssPlugin({ entry: 'src/style.css', outFile: 'style.css' })]
 *   });
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import type { Plugin } from 'esbuild';
import { transform } from 'lightningcss';

/** 从 transform 的参数推导，避免耦合 lightningcss 内部类型名。 */
type Targets = NonNullable<Parameters<typeof transform>[0]['targets']>;

/** 这些浏览器都不支持 CSS Nesting，所以嵌套一定会被展开成扁平选择器。 */
export const DEFAULT_TARGETS: Targets = {
  chrome: 90 << 16,
  firefox: 90 << 16,
  safari: 15 << 16
};

export interface LightningCssPluginOptions {
  /** 源 CSS，相对 esbuild 的 absWorkingDir（默认当前工作目录），也可传绝对路径。默认 'src/style.css'。 */
  entry?: string;
  /** 产物名，相对 tsup 的 outDir，也可传绝对路径。默认 'style.css'。 */
  outFile?: string;
  /** Lightning CSS 的浏览器目标。默认 DEFAULT_TARGETS。 */
  targets?: Targets;
  /** 是否压缩。默认 true。 */
  minify?: boolean;
  /** 是否关闭日志。默认 false。 */
  silent?: boolean;
}

export function lightningCssPlugin(options: LightningCssPluginOptions = {}): Plugin {
  const {
    entry = 'src/style.css',
    outFile = 'style.css',
    targets = DEFAULT_TARGETS,
    minify = true,
    silent = false
  } = options;

  // tsup 会为每个 format 各跑一次 esbuild.build，onEnd 因而触发多次；
  // 用「输出路径 + 源内容 hash」去重。若产物被 clean 删除，仍会重新生成（watch 也生效）。
  let lastKey = '';

  return {
    name: '@jswork/tsup-plugin-lightningcss',
    setup(build) {
      build.onEnd((result) => {
        // JS 构建失败时不生成 CSS
        if (result.errors.length) return;

        const cwd = build.initialOptions.absWorkingDir || process.cwd();
        const sourcePath = isAbsolute(entry) ? entry : resolve(cwd, entry);
        const outDir = resolve(cwd, build.initialOptions.outdir || 'dist');
        const outPath = isAbsolute(outFile) ? outFile : resolve(outDir, outFile);

        try {
          const source = readFileSync(sourcePath);
          const key = `${outPath}\0${createHash('sha1').update(source).digest('hex')}`;
          if (key === lastKey && existsSync(outPath)) return;

          const { code } = transform({
            filename: sourcePath,
            code: source,
            minify,
            targets
          });

          mkdirSync(dirname(outPath), { recursive: true });
          writeFileSync(outPath, code);
          lastKey = key;

          if (!silent) {
            console.log(`[lightningcss] ${relative(cwd, sourcePath)} -> ${relative(cwd, outPath)}`);
          }
        } catch (error) {
          // 作为 esbuild 错误返回，让本次构建正确失败，而不是被静默吞掉
          const text = error instanceof Error ? error.message : String(error);
          return { errors: [{ text: `[lightningcss] ${text}` }] };
        }
      });
    }
  };
}

export default lightningCssPlugin;
