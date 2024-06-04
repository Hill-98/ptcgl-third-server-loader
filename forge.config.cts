import { createHash } from 'node:crypto'
import { join, parse } from 'node:path'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { sync as spawnSync } from 'cross-spawn'
import assert from 'node:assert'
import fs from 'node:fs'
import pkg from './package.json'
import type { ForgeConfig, ResolvedForgeConfig } from '@electron-forge/shared-types'

const DEP_LICENSES_HTML = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>LICENSES</title>
</head>
<body>
<p>Thanks to these open source projects for making <i>${pkg.productName}</i>.</p>
<LICENSES></LICENSES>
</body>
</html>
`

const DEP_LICENSES_HTML_NODE = `
<div>
<span>{{ name }}</span>
<span><a href="{{ npmjs }}">npmjs</a></span>
<div>
<pre>{{ license }}</pre>
</div>
</div>
`

const KEEP_TOP_FILES = ['.vite', 'bin', 'resources', 'package.json']
const KEEP_LANGUAGES = ['en', 'en-US', 'zh_CN', 'zh-CN', 'zh_TW', 'zh-TW']

const deleteUselessLanguageFile = function deleteUselessLanguageFile (ext: string, item: fs.Dirent) {
  const fullPath = join(item.path, item.name)
  const path = parse(fullPath)
  if (path.ext === `.${ext}` && !KEEP_LANGUAGES.includes(path.name)) {
    fs.rmSync(fullPath, { recursive: true })
  }
}

const escapeHtml = (str: string) => str
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll('\'', '&#39;')
  .replaceAll('/', '&#x2F;')
  .replaceAll('`', '&#x60;')
  .replaceAll('=', '&#x3D;')

const ignoreFiles = fs.readdirSync(__dirname)
  .filter((file) => !KEEP_TOP_FILES.includes(file))
  .map((file) => {
    const filePattern = file.replaceAll('.', '\\.')
    return new RegExp(`^\/${filePattern}`)
  })
const unpackDirs = ['bin', 'res']

const packageAfterPrune = async function packageAfterPrune (_: ResolvedForgeConfig, buildPath: string, __: string, platform: string) {
  const externalResourcesPath = join(buildPath, 'res')
  const pagesPath = join(buildPath, 'pages')
  const rendererPath = join(buildPath, 'renderer')
  const resourcesPath = join(buildPath, 'resources')
  const vitePath = join(buildPath, '.vite')

  const { minify_sync: minify } = await import('terser')
  fs.readdirSync(buildPath, { encoding: 'utf8', recursive: true })
    .filter((file) => !!file.match(/\.(cjs|js)$/))
    .forEach((file) => {
      const fullPath = join(buildPath, file)
      const result = minify(fs.readFileSync(fullPath, { encoding: 'utf-8' }), {
        ecma: 2020,
        format: {
          comments: false,
        },
        module: file.endsWith('.js'),
      })
      if (typeof result.code === 'string') {
        fs.writeFileSync(fullPath, result.code, { encoding: 'utf-8' })
      }
    })

  /* 整理目录结构 (强迫症) */
  fs.mkdirSync(pagesPath)
  fs.readdirSync(vitePath).forEach((file) => {
    fs.renameSync(join(vitePath, file), join(vitePath, '..', file))
  })
  fs.rmSync(vitePath, { recursive: true })
  fs.readdirSync(rendererPath).forEach((file) => {
    const fullPath = join(rendererPath, file)
    if (file === 'assets') {
      fs.renameSync(fullPath, join(buildPath, 'assets'))
    } else {
      fs.renameSync(join(fullPath, 'index.html'), join(pagesPath, `${file}.html`))
      fs.rmSync(fullPath, { recursive: true })
    }
  })
  fs.rmSync(rendererPath, { recursive: true })
  fs.renameSync(join(resourcesPath, 'external'), externalResourcesPath)
  fs.writeFileSync(join(buildPath, 'package.json'), JSON.stringify({
    ...pkg,
    main: 'main.js',
  }))
  /* 整理目录结构 (强迫症) end */

  if (platform !== 'darwin') {
    fs.rmSync(join(externalResourcesPath, 'BepInExOSXLoader'), { force: true, recursive: true })
  }

  const checksums = fs.readdirSync(buildPath, { encoding: 'utf8', recursive: true })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => {
      if (!fs.statSync(join(buildPath, path)).isFile()) {
        return false
      }
      if (path.endsWith('.gitignore')) {
        fs.rmSync(join(buildPath, path))
        return false
      }
      return unpackDirs.find((dir) => path.startsWith(`${dir}/`)) && path.match(/res\/background\//) === null
    })
    .map((path) => ({
      path,
      hash: createHash('sha256').update(fs.readFileSync(join(buildPath, path))).digest('hex'),
    }))
  fs.writeFileSync(join(buildPath, 'checksums.json'), JSON.stringify(checksums), { encoding: 'utf8' })

  const BepInExZipUrl = platform === 'win32'
    ? 'https://github.com/BepInEx/BepInEx/releases/download/v5.4.22/BepInEx_x64_5.4.22.0.zip'
    : 'https://github.com/BepInEx/BepInEx/releases/download/v5.4.22/BepInEx_unix_5.4.22.0.zip'
  const BepInExZip = join(externalResourcesPath, 'BepInEx_5.4.22.0.zip')
  if (!fs.existsSync(BepInExZip)) {
    const curl = spawnSync('curl', [
      '--connect-timeout',
      '3',
      '--fail',
      '--location',
      '--output',
      BepInExZip + '.tmp',
      BepInExZipUrl,
    ], { stdio: 'inherit' })
    assert(curl.status === 0, 'An error occurred while downloading BepInEx.')
    fs.renameSync(BepInExZip + '.tmp', BepInExZip)
  }
}

const packageAfterExtract = async function packageAfterExtract (config: ResolvedForgeConfig, buildPath: string, electronVersion: string, platform: string) {
  const contentsPath = platform === 'darwin' ? join(buildPath, 'Electron.app/Contents') : buildPath
  const resourcesPath = join(contentsPath, 'Resources')

  let dependenciesLicense = '';
  [...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)].sort().forEach((dep) => {
    const depPath = join(__dirname, 'node_modules', dep)
    const depPkg = JSON.parse(fs.readFileSync(join(depPath, 'package.json'), { encoding: 'utf-8' }))
    fs.readdirSync(depPath).forEach((file) => {
      if (file.startsWith('LICENSE')) {
        dependenciesLicense += DEP_LICENSES_HTML_NODE
          .replace('{{ license }}', escapeHtml(fs.readFileSync(join(depPath, file), { encoding: 'utf-8' })))
          .replace('{{ name }}', depPkg.name)
          .replace('{{ npmjs }}', `https://www.npmjs.com/package/${depPkg.name}`).trimEnd()
      }
    })
  })
  fs.writeFileSync(join(buildPath, 'LICENSES.dependencies.html'), DEP_LICENSES_HTML.replace('<LICENSES></LICENSES>', dependenciesLicense.trimStart())
    .trim())
  fs.renameSync(join(buildPath, 'LICENSE'), join(buildPath, 'LICENSE.electron.txt'))
  fs.cpSync(join(__dirname, 'LICENSE'), join(buildPath, 'LICENSE.txt'), { force: true })
  fs.rmSync(join(buildPath, 'version'))

  if (platform === 'darwin') {
    [
      ...fs.readdirSync(join(contentsPath, 'Frameworks/Electron Framework.framework/Versions/Current/Resources'), { withFileTypes: true }),
      ...fs.readdirSync(resourcesPath, { withFileTypes: true }),
    ].forEach(deleteUselessLanguageFile.bind(globalThis, 'lproj'))
  }
  if (platform === 'win32') {
    fs.readdirSync(join(buildPath, 'locales'), { withFileTypes: true })
      .forEach(deleteUselessLanguageFile.bind(globalThis, 'pak'))
    fs.writeFileSync(join(buildPath, 'no-sandbox.bat'), `@ECHO OFF\r\nSTART "" "%~dp0\\${config.packagerConfig.name}.exe" --no-sandbox`)
  }
}

module.exports = {
  packagerConfig: {
    appBundleId: pkg.name,
    appCopyright: 'Copyright (c) 2024 Hill-98@GitHub',
    appVersion: pkg.version,
    icon: join(__dirname, 'resources/icons/app'),
    name: pkg.productName,
    asar: {
      unpack: join('**', `{${unpackDirs.join(',')}}`, '**'),
    },
    ignore: ignoreFiles,
  },
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    async packageAfterPrune (config, buildPath, electronVersion, platform) {
      try {
        await packageAfterPrune(config, buildPath, electronVersion, platform)
      } catch (err: any) {
        fs.writeFileSync(join(__dirname, 'forge.error.log'), err.stack, { encoding: 'utf-8' })
        throw err
      }
    },
    async packageAfterExtract (config, buildPath, electronVersion, platform) {
      try {
        await packageAfterExtract(config, buildPath, electronVersion, platform)
      } catch (err: any) {
        fs.writeFileSync(join(__dirname, 'forge.error.log'), err.stack, { encoding: 'utf-8' })
        throw err
      }
    },
  },
} satisfies ForgeConfig
