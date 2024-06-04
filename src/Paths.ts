import { join } from 'node:path'
import { app as electron } from 'electron'

export const unpack = electron.getAppPath().replace('app.asar', 'app.asar.unpacked')

export const app = electron.isPackaged ? electron.getAppPath() : MAIN_APP_PATH

export const bin = join(unpack, 'bin')

export const externalResources = join(unpack, electron.isPackaged ? 'res' : 'resources/external')

export const resources = join(electron.getAppPath(), 'resources')
