import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import {terser} from 'rollup-plugin-terser';
import nodePolyfills from 'rollup-plugin-node-polyfills';

const extensions = ['.js', '.ts'];

function generateConfig(configType, format) {
  const browser = configType === 'browser';

  const config = {
    input: 'src/index.ts',
    plugins: [
      commonjs(),
      nodeResolve({
        browser,
        dedupe: ['bn.js', 'buffer'],
        extensions,
        preferBuiltins: !browser,
      }),
      typescript(),
      nodePolyfills(),
      replace({
        preventAssignment: true,
        values: {
          'process.env.SHDW_BROWSER': 'undefined'
        }
      })
    ],
    onwarn: function (warning, rollupWarn) {
      if (warning.code !== 'CIRCULAR_DEPENDENCY') {
        rollupWarn(warning);
      }
    },
    treeshake: {
      moduleSideEffects: false,
    },
  };

  if (configType !== 'browser') {
    // Prevent dependencies from being bundled
    config.external = [
      '@project-serum/anchor',
      '@solana/spl-token',
      '@solana/wallet-adapter-react',
      '@solana/web3.js',
      'bs58',
      'crypto',
      'form-data',
      'buffer'
    ];
  }

  switch (configType) {
    case 'browser':
      switch (format) {
        case 'esm': {
          config.output = [
            {
              file: 'dist.browser/index.browser.esm.js',
              format: 'es',
              sourcemap: true,
            },
          ];

          // Prevent dependencies from being bundled
          config.external = [
            '@project-serum/anchor',
            '@solana/spl-token',
            '@solana/wallet-adapter-react',
            '@solana/web3.js',
            'bs58',
            'crypto',
            'form-data',
            'buffer'
          ];

          break;
        }
        case 'iife': {
          config.external = ['http', 'https'];

          config.output = [
            {
              file: 'dist.browser/index.iife.js',
              format: 'iife',
              name: 'ShdwDrive',
              sourcemap: true,
            },
            {
              file: 'dist.browser/index.iife.min.js',
              format: 'iife',
              name: 'ShdwDrive',
              sourcemap: true,
              plugins: [terser({mangle: false, compress: false})],
            },
          ];

          break;
        }
        default:
          throw new Error(`Unknown format: ${format}`);
      }

      // TODO: Find a workaround to avoid resolving the following JSON file:
      // `node_modules/secp256k1/node_modules/elliptic/package.json`
      config.plugins.push(json());

      break;
    case 'node':
      config.output = [
        {
          file: 'dist.browser/index.cjs.js',
          format: 'cjs',
          sourcemap: true,
        },
        {
          file: 'dist.browser/index.esm.js',
          format: 'es',
          sourcemap: true,
        },
      ];
      break;
    default:
      throw new Error(`Unknown configType: ${configType}`);
  }

  return config;
}

export default [
  generateConfig('browser', 'esm'),
  generateConfig('browser', 'iife'),
];