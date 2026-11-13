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
