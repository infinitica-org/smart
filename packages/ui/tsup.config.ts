import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/styles.css'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: false, // let package.json clean script handle it if necessary, or let tsup do it
  external: ['react', 'react-dom'],
  minify: true,
  outDir: 'dist',
});
