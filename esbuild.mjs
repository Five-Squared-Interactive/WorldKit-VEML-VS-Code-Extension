import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production');

/** @type {import('esbuild').BuildOptions} */
const sharedOptions = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  sourcemap: !isProduction,
  minify: isProduction,
  target: 'node20',
};

/** @type {import('esbuild').BuildOptions} */
const clientOptions = {
  ...sharedOptions,
  entryPoints: ['client/src/extension.ts'],
  outfile: 'dist/client.js',
  external: ['vscode'],
};

/** @type {import('esbuild').BuildOptions} */
const serverOptions = {
  ...sharedOptions,
  entryPoints: ['server/src/server.ts'],
  outfile: 'dist/server.js',
  external: ['typescript'],
};

async function build() {
  if (isWatch) {
    const clientCtx = await esbuild.context(clientOptions);
    const serverCtx = await esbuild.context(serverOptions);
    await Promise.all([clientCtx.watch(), serverCtx.watch()]);
    console.log('[esbuild] Watching for changes...');
  } else {
    await Promise.all([
      esbuild.build(clientOptions),
      esbuild.build(serverOptions),
    ]);
    console.log('[esbuild] Build complete');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
