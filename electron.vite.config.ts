import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'electron-vite'
import fs from 'node:fs'
import vue from '@vitejs/plugin-vue'
import pkg from './package.json'
import * as process from 'node:process'

const commonDefine = {
  BUILD_PLATFORM: JSON.stringify(process.platform),
  IS_MACOS_BUILD: JSON.stringify(process.platform === 'darwin'),
  IS_WINDOWS_BUILD: JSON.stringify(process.platform === 'win32'),
}
const $dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join($dirname, '.vite')
const rendererChunks = [
  ['@heroicons', 'heroicons'],
  ['@vue', 'vue'],
  ['axios'],
  ['vite/preload', 'vite-preload'],
  // src
  ['IpcMessages'],
  ['terms-of-use/View', 'terms-of-use.view'],
]

const rendererPages: { [name: string]: string } = {}
const rendererSource = join($dirname, 'src/renderer')
const simplePkg = {
  name: pkg.name,
  productName: pkg.productName,
  version: pkg.version,
  homepage: pkg.homepage,
}

fs.readdirSync(rendererSource).forEach((name) => {
  const html = join(rendererSource, name, 'index.html')
  if (fs.existsSync(html)) {
    rendererPages[name] = html
  }
})

fs.rmSync(outDir, { force: true, recursive: true })

export default defineConfig(({ mode }) => ({
  main: {
    build: {
      emptyOutDir: false,
      outDir,
      lib: {
        entry: join($dirname, 'src/main.ts'),
      },
    },
    define: {
      MAIN_APP_PATH: JSON.stringify(mode === 'development' ? outDir : ''),
      ...commonDefine,
    },
  },
  preload: {
    build: {
      emptyOutDir: false,
      outDir,
      lib: {
        entry: join($dirname, 'src/preload.ts'),
        formats: ['cjs'],
      },
    },
    define: {
      ...commonDefine,
    },
  },
  renderer: {
    build: {
      emptyOutDir: false,
      modulePreload: false,
      outDir: join(outDir, 'renderer'),
      rollupOptions: {
        input: rendererPages,
        output: {
          manualChunks (id: string) {
            const chunk = rendererChunks.find((item) => id.includes(item[0]))
            return chunk ? chunk[1] ?? chunk[0] : null
          },
        },
      },
    },
    define: {
      RENDERER_PKG: JSON.stringify(simplePkg),
      ...commonDefine,
    },
    plugins: [
      vue({
        isProduction: mode === 'production',
      }),
    ],
  },
}))
