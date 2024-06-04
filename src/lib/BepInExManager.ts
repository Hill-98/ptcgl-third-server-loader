 import { tmpdir } from 'node:os'
import { join, normalize, parse } from 'node:path'
import { getFileVersion } from 'cfv'
import { compareVersions } from 'compare-versions'
import { all as unzip, pick as unzipSingle } from '../utils/unzip.js'
import fs from 'node:fs'

export interface BepInExPackageFiles {
  BepInEx?: string | null
  OSXLoader?: string | null
  OSXLoaderCore?: string | null
}

let BepInExPackage = 'BepInEx.zip'
let OSXLoaderCore = 'UnityEngine.CoreModule.dll'
let OSXLoader = 'Tobey.BepInEx.Bootstrap.dll'

const OSXLoaderPatched = function (loaderCore: string) {
   try {
     return fs.readFileSync(loaderCore, { encoding: 'ascii' }).includes('Tobey.BepInEx.Bootstrap')
   } catch {
     return false
   }
 }

const installOSXLoader = function installOSXLoader (loaderCore: string, loader: string) {
   if (!fs.existsSync(loaderCore)) {
     throw new Error(`'${loaderCore}' not found`)
   }
   if (!OSXLoaderPatched(loaderCore)) {
     fs.cpSync(loaderCore, `${loaderCore}.orig`, { errorOnExist: false, force: true })
   }
   fs.cpSync(OSXLoaderCore, loaderCore, { force: true })
   fs.cpSync(OSXLoader, loader, { force: true })
 }

export default class BepInExManager {
  readonly #appPath: string

  readonly #loaderDllPath: string

  readonly #OSXLoaderCorePath: string

  readonly #root: string

  #BepInExPaths = {
    config: '',
    core: '',
    coreDll: '',
    plugins: '',
    root: '',
  }

  #topFiles: string[] = []

  constructor (root: string, appPath = '') {
    this.#root = normalize(root)

    if (!fs.existsSync(this.#root)) {
      throw new Error('root not found')
    }

    if (appPath.trim() !== '') {
      this.#appPath = normalize(appPath)
    } else {
      this.#appPath = this.#root
    }

    const bepInExPath = join(this.#root, 'BepInEx')
    this.#BepInExPaths = {
      config: join(bepInExPath, 'config'),
      core: join(bepInExPath, 'core'),
      coreDll: join(bepInExPath, 'core/BepInEx.dll'),
      plugins: join(bepInExPath, 'plugins'),
      root: bepInExPath,
    }
    this.#loaderDllPath = join(this.#appPath, IS_MACOS_BUILD ? 'Contents/Resources/Data/Managed/Tobey.BepInEx.Bootstrap.dll' : 'winhttp.dll')
    this.#OSXLoaderCorePath = join(this.#appPath, 'Contents/Resources/Data/Managed/UnityEngine.CoreModule.dll')
    this.#topFiles = [
      join(this.#root, '.doorstop_version'),
      join(this.#root, 'changelog.txt'),
      join(this.#root, 'doorstop_config.ini'),
      join(this.#root, 'libdoorstop.dylib'),
      join(this.#root, 'run_bepinex.sh'),
      join(this.#root, 'winhttp.dll'),
    ]
  }

  #deleteCommonFiles () {
    this.#topFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        fs.rmSync(file)
      }
    })
  }

  getPluginDir (name: string): string | null {
    const dir = join(this.#BepInExPaths.plugins, name)
    try {
      const stat = fs.statSync(dir)
      if (stat.isDirectory()) {
        return dir
      }
    } catch {
    }
    return null
  }

  getPluginDll (name: string): string | null {
    const dll = join(this.#BepInExPaths.plugins, name + '.dll')
    if (fs.existsSync(dll)) {
      return dll
    }
    const dllInDir = join(this.#BepInExPaths.plugins, name, name + '.dll')
    if (fs.existsSync(dllInDir)) {
      return dllInDir
    }
    return null
  }

  async install () {
    const onerror = (err: any) => {
      try {
        this.uninstall(false)
      } catch (err) {
        console.error(err)
      }
      if (err instanceof Error) {
        throw err
      }
    }

    try {
      await unzip(BepInExPackage, this.#root)
      if (IS_MACOS_BUILD) {
        this.#deleteCommonFiles()
        installOSXLoader(this.#OSXLoaderCorePath, this.#loaderDllPath)
      }
    } catch (err) {
      onerror(err)
    }
  }

  async installPlugin (name: string, source: string) {
    const stats = fs.statSync(source)
    const path = parse(source)
    const plugin = join(this.#BepInExPaths.plugins, path.name + path.ext)
    const pluginDir = join(this.#BepInExPaths.plugins, path.name)

    const onerror = (err: any) => {
      this.uninstallPlugin(name)
      if (err instanceof Error) {
        throw err
      }
    }

    if (stats.isDirectory()) {
      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true })
      }
      try {
        fs.readdirSync(source).forEach((file) => {
          fs.cpSync(join(source, file), join(pluginDir, file), { force: true, recursive: true })
        })
      } catch (err) {
        onerror(err)
      }
    } else if (stats.isFile()) {
      if (path.ext === '.zip') {
        if (!fs.existsSync(pluginDir)) {
          fs.mkdirSync(pluginDir, { recursive: true })
        }
        try {
          await unzip(source, pluginDir)
        } catch (err) {
          onerror(err)
        }
      } else {
        fs.cpSync(source, plugin, { force: true })
      }
    } else {
      throw new Error('Unsupported source file type')
    }
  }

  isInstalled () {
    if (!fs.existsSync(this.#BepInExPaths.coreDll) || !fs.existsSync(this.#loaderDllPath)) {
      return false
    }

    if (IS_MACOS_BUILD) {
      return OSXLoaderPatched(this.#OSXLoaderCorePath)
    }

    return true
  }

  async isUpdatable () {
    if (!this.isInstalled() || !fs.existsSync(BepInExPackage)) {
      return Promise.resolve(false)
    }
    try {
      const localVersion = await getFileVersion(this.#BepInExPaths.coreDll)
      const tmpDll = join(tmpdir(), 'BepInEx-core' + Math.random())
      await unzipSingle(BepInExPackage, 'BepInEx/core/BepInEx.dll', tmpDll)
      const remoteVersion = await getFileVersion(tmpDll)
      return compareVersions(remoteVersion, localVersion) === 1
    } catch (err) {
      console.error(err)
    }
    return false
  }

  pluginInstalled (name: string) {
    return this.getPluginDll(name) !== null
  }

  uninstall (withInstalledPlugin = false) {
    this.#deleteCommonFiles()
    if (IS_MACOS_BUILD) {
      if (!OSXLoaderPatched(this.#OSXLoaderCorePath)) {
        fs.rmSync(this.#OSXLoaderCorePath, { force: true })
        fs.rmSync(this.#loaderDllPath, { force: true })
        if (fs.existsSync(this.#OSXLoaderCorePath + '.orig')) {
          fs.cpSync(this.#OSXLoaderCorePath + '.orig', this.#OSXLoaderCorePath)
          fs.rmSync(this.#OSXLoaderCorePath + '.orig')
        }
      }
    }

    try {
      if (withInstalledPlugin) {
        fs.rmSync(this.#BepInExPaths.root, { force: true, recursive: true })
      } else {
        fs.rmSync(this.#BepInExPaths.core, { force: true, recursive: true })
      }
    } catch {

    }
  }

  uninstallPlugin (name: string) {
    const dll = this.getPluginDll(name)
    if (dll !== null) {
      fs.rmSync(dll)
    }
    const dir = this.getPluginDir(name)
    if (dir !== null) {
      fs.rmSync(dir, { recursive: true })
    }
  }

  static setBepInExPackage (files: Partial<BepInExPackageFiles>) {
    if (typeof files !== 'object') {
      return
    }
    if (typeof files.BepInEx === 'string' && fs.existsSync(files.BepInEx)) {
      BepInExPackage = files.BepInEx
    }
    if (typeof files.OSXLoader === 'string' && fs.existsSync(files.OSXLoader)) {
      OSXLoader = files.OSXLoader
    }
    if (typeof files.OSXLoaderCore === 'string' && fs.existsSync(files.OSXLoaderCore)) {
      OSXLoaderCore = files.OSXLoaderCore
    }
  }
}
