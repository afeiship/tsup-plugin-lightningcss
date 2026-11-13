import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PluginBuild } from 'esbuild';
import plugin, { DEFAULT_TARGETS, lightningCssPlugin } from '../src';

type EndResult = { errors: { text: string }[] } | undefined;
type OnEnd = (result: { errors: { text: string }[] }) => EndResult;

const dirs: string[] = [];

function fixture(css: string): string {
  const root = mkdtempSync(join(tmpdir(), 'tsup-lc-'));
  dirs.push(root);
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'src', 'style.css'), css);
  return root;
}

/** 用最小的假 esbuild build 触发插件的 onEnd 钩子。 */
function setupPlugin(root: string, options: Record<string, unknown> = {}) {
  let onEnd: OnEnd = () => undefined;
  const fakeBuild = {
    initialOptions: { absWorkingDir: root, outdir: 'dist' },
    onEnd(callback: OnEnd) {
      onEnd = callback;
    }
  };

  lightningCssPlugin({ silent: true, ...options }).setup(fakeBuild as unknown as PluginBuild);
  return (errors: { text: string }[] = []) => onEnd({ errors }) as EndResult;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('lightningCssPlugin', () => {
  test('默认导出与命名导出一致，默认 targets 可用', () => {
    expect(plugin).toBe(lightningCssPlugin);
    expect(DEFAULT_TARGETS.chrome).toBe(90 << 16);
    expect(DEFAULT_TARGETS.safari).toBe(15 << 16);
  });

  test('编译 CSS 并把原生嵌套展开成扁平选择器', () => {
    const root = fixture('.card { color: red; & .title { color: blue; } }');
    expect(setupPlugin(root)()).toBeUndefined();

    const css = readFileSync(join(root, 'dist', 'style.css'), 'utf8');
    expect(css.includes('&')).toBe(false);
    expect(css.includes('.card .title')).toBe(true);
  });

  test('JS 构建失败时不生成 CSS', () => {
    const root = fixture('a { color: red; }');
    expect(setupPlugin(root)([{ text: 'boom' }])).toBeUndefined();
    expect(existsSync(join(root, 'dist', 'style.css'))).toBe(false);
  });

  test('源文件缺失时返回 esbuild 错误而不是抛异常', () => {
    const root = fixture('a { color: red; }');
    const result = setupPlugin(root, { entry: 'src/missing.css' })();
    expect(result?.errors[0]?.text).toContain('[lightningcss]');
  });

  test('多次 onEnd 去重；产物被 clean 删除后自动重建', () => {
    const root = fixture('a { color: red; }');
    const run = setupPlugin(root);
    const out = join(root, 'dist', 'style.css');

    run();
    run();
    expect(existsSync(out)).toBe(true);

    rmSync(out);
    run();
    expect(existsSync(out)).toBe(true);
  });

  test('outFile 支持子目录', () => {
    const root = fixture('a { color: red; }');
    setupPlugin(root, { outFile: 'assets/main.css' })();
    expect(existsSync(join(root, 'dist', 'assets', 'main.css'))).toBe(true);
  });
});
