import { join } from 'node:path'
import { bin } from '../Paths.js'
import fs from 'node:fs'
import plist from 'plist'
import Command from '../lib/Command.js'

const WINDOWS_PTCGL_UTILITY = join(bin, 'NeuExt.PTCGLUtility.exe')

const PTCGLUtility = new Command(WINDOWS_PTCGL_UTILITY, {
  encoding: 'url',
})
const ps = new Command('ps', ['-A'])

export const CreateDesktopShortcut = function CreateDesktopShortcut (name: string, target: string): void {
  if (!IS_WINDOWS_BUILD || name.trim() === '' || target.trim() === '') {
    return
  }
  try {
    PTCGLUtility.exec('CreateDesktopShortcut', name, target)
  } catch (err) {
    console.error(err)
  }
}

export const detectPTCGLInstallDirectory = function detectPTCGLInstallDirectory (): string | null {
  try {
    if (IS_WINDOWS_BUILD) {
      const result = PTCGLUtility.exec('DetectPTCGLInstallDirectory')
      return result.status === 0 ? result.stdout : null
    }
    return '/Applications/Pokemon TCG Live.app'
  } catch (err) {
    console.error(err)
  }
  return null
}

export const getPTCGLExecutable = function getPTCGLExecutable () {
  return IS_WINDOWS_BUILD ? 'Pokemon TCG Live.exe' : 'Contents/MacOS/Pokemon TCG Live'
}

export const GetShortcutTarget = function GetShortcutTarget (shortcut: string): string | null {
  if (IS_WINDOWS_BUILD && shortcut.trim() !== '') {
    try {
      const result = PTCGLUtility.exec('GetShortcutTarget', shortcut)
      return result.status === 0 ? result.stdout : null
    } catch (err) {
      console.error(err)
    }
  }
  return null
}

export const isAvailable = function isAvailable (): boolean {
  return IS_WINDOWS_BUILD ? PTCGLUtility.isAvailable() : ps.isAvailable()
}

export const isPTCGLInstallDirectory = function isPTCGLInstallDirectory (directory: any): boolean {
  if (typeof directory !== 'string' || directory.trim() === '') {
    return false
  }
  return fs.existsSync(join(directory, getPTCGLExecutable()))
}

export const PTCGLIsRunning = function PTCGLIsRunning (): boolean {
  try {
    if (IS_WINDOWS_BUILD) {
      const result = PTCGLUtility.exec('CheckPTCGLIsRunning')
      return result.status === 0 && result.stdout === '1'
    }
    const result = ps.exec('-A')
    return result.status === 0 && result.stdout.includes('Pokemon TCG Live')
  } catch (err) {
    console.error(err)
  }
  return false
}

export const SyncGameVersion = function SyncGameVersion (target: string): boolean {
  if (!IS_MACOS_BUILD) {
    return false
  }

  const source = '/Applications/Pokemon TCG Live.app'
  if (!fs.existsSync(join(source, 'Contents/MacOS/Pokemon TCG Live'))) {
    return false
  }

  let needSync = true
  const sourcePlistFile = join(source, 'Contents/Info.plist')
  const sourcePlist = fs.existsSync(sourcePlistFile) ? plist.parse(fs.readFileSync(sourcePlistFile, { encoding: 'utf8' })) : { CFBundleVersion: '0' }
  const targetPlistFile = join(target, 'Contents/Info.plist')
  const targetPlist = fs.existsSync(targetPlistFile) ? plist.parse(fs.readFileSync(targetPlistFile, { encoding: 'utf8' })) : { CFBundleVersion: '0' }
  if (typeof sourcePlist === 'object' && typeof targetPlist === 'object') {
    // @ts-ignore
    const localVersion = Number.parseInt(sourcePlist.CFBundleVersion)
    // @ts-ignore
    const targetVersion = Number.parseInt(targetPlist.CFBundleVersion)
    needSync = targetVersion === 0 || localVersion > targetVersion
  }

  if (needSync) {
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true })
    }
    fs.cpSync(source, target, { preserveTimestamps: true, recursive: true })
  }

  return fs.existsSync(join(target, 'Contents/MacOS/Pokemon TCG Live'))
}
