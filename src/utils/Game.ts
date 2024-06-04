import { join } from 'node:path'
import { spawn } from 'cross-spawn'
import { externalResources } from '../Paths.js'
import { DEFAULT_ACCOUNT_TARGET, OFFICIAL_SERVER_IDENTIFIER } from '../shared.constants.js'
import fs from 'node:fs'
import BepInExManager from '../lib/BepInExManager.js'
import * as PTCGLUtility from './PTCGLUtility.js'
import type GameServerPublisher from '../lib/GameServerPublisher.js'

export type StartGameFeatures = 'fixBuiltinBrowserError' | 'unlockAllBeautifyDesks'

export interface StartGameServerOption {
  identifier?: string
  publisher?: GameServerPublisher
}

export interface StartGameOption {
  account?: string
  features?: StartGameFeatures[]
  path: string
  server?: StartGameServerOption
}

export const clearBuiltinBrowserCache = function clearBuiltinBrowserCache () {
  if (IS_WINDOWS_BUILD) {
    if (typeof process.env.USERPROFILE === 'string') {
      fs.rmSync(join(process.env.USERPROFILE, 'AppData/LocalLow/pokemon/Pokemon TCG Live/Vuplex.WebView'), { force: true, recursive: true })
    } else {
      throw new Error('Environment variable "USERPROFILE" not found.')
    }
  } else {
    throw new Error(`clearBuiltinBrowserCache: Not supported by the current build platform (${BUILD_PLATFORM})`)
  }
}

export const getPaths = function getPaths (path: string) {
  const dir = IS_MACOS_BUILD ? path.replace('.app', ' BepInEx') : path
  return {
    app: IS_MACOS_BUILD ? join(dir, 'Pokemon TCG Live.app') : dir,
    root: dir,
  }
}

export const start = async function start (option: StartGameOption) {
  const args: string[] = []
  const features = option.features ?? []
  const gs = option.server

  const entryPoint = gs && gs.identifier && gs.publisher ? await gs.publisher.getEntryPoint(gs.identifier) : OFFICIAL_SERVER_IDENTIFIER
  if (!entryPoint) {
    throw new Error('Game server entry point not found.')
  }

  const gamePaths = getPaths(option.path)
  if (!gamePaths) {
    throw new Error('Game paths not found.')
  }
  if (IS_MACOS_BUILD && !PTCGLUtility.SyncGameVersion(gamePaths.app)) {
    throw new Error('SyncGameVersion is failed.')
  }

  const bepInEx = new BepInExManager(gamePaths.root, gamePaths.app)
  if (!bepInEx.isInstalled() || await bepInEx.isUpdatable()) {
    await bepInEx.install()
  }
  await bepInEx.installPlugin('AssemblyNamePatcher', join(externalResources, 'dll/AssemblyNamePatcher.dll'))
  await bepInEx.installPlugin('PTCGLThirdServerLoaderExtension', join(externalResources, 'dll/PTCGLThirdServerLoaderExtension.dll'))
  bepInEx.uninstallPlugin('PTCGLiveProfileSwitcher')
  bepInEx.uninstallPlugin('Rainier.NativeOmukadeConnector')
  fs.rmSync(join(gamePaths.root, 'config-noc.json'), { force: true })

  if (typeof option.account === 'string' && option.account !== DEFAULT_ACCOUNT_TARGET) {
    args.push('--account-target', option.account)
  }
  if (features.includes('fixBuiltinBrowserError')) {
    args.push('--fix-builtin-browser-error')
  }
  if (entryPoint !== OFFICIAL_SERVER_IDENTIFIER) {
    args.push('--enable-omukade')
    await bepInEx.installPlugin('Rainier.NativeOmukadeConnector', join(externalResources, 'dll/Rainier.NativeOmukadeConnector.dll'))
    fs.writeFileSync(join(gamePaths.root, 'config-noc.json'), JSON.stringify({
      OmukadeEndpoint: entryPoint,
      EnableAllCosmetics: features.includes('unlockAllBeautifyDesks'),
      ForceAllLegalityChecksToSucceed: true,
      AskServerForImplementedCards: true,
    }))
  }

  return new Promise((resolve, reject) => {
    const p = spawn(join(gamePaths.app, PTCGLUtility.getPTCGLExecutable()), args, {
      detached: true,
    })
    p.once('error', reject)
    p.once('spawn', resolve)
  })
}
