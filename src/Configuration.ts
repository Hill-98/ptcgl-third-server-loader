import { app } from 'electron'
import Store from 'electron-store'
import type { PlayAccount } from './lib/PlayAccounts.js'
import type { PublishServerItem } from './lib/PublishServers.js'

export interface Configuration {
  version: string
  fixBuiltinBrowserError: boolean
  gameInstallationDirectory: string
  playerAccounts: PlayAccount[]
  publishServerIdentifier: string
  publishServers: PublishServerItem[]
  termsOfUseVersion: number
  unlockAllBeautifyDesks: boolean
}

export const enum keys {
  fixBuiltinBrowserError = 'fixBuiltinBrowserError',
  gameInstallationDirectory = 'gameInstallationDirectory',
  publishServerIdentifier = 'publishServerIdentifier',
  playerAccounts = 'playerAccounts',
  publishServers = 'publishServers',
  termsOfUseVersion = 'termsOfUseVersion',
  unlockAllBeautifyDesks = 'unlockAllBeautifyDesks',
}

const CONFIGURATION_VERSION = app.getVersion()

export const store = new Store<Partial<Configuration>>()

Store.initRenderer();

if (store.get('version') !== CONFIGURATION_VERSION) {
  store.set('version', CONFIGURATION_VERSION)
}
