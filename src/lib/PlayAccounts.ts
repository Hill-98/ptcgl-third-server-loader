import { createHash } from 'node:crypto'
import { DEFAULT_ACCOUNT_TARGET } from '../shared.constants.js'
import * as Config from '../Configuration.js'
import type ElectronStore from 'electron-store'

export interface PlayAccount {
  identifier: string
  name: string
}

class PlayAccounts {
  #accounts: PlayAccount[] = []

  #store: ElectronStore | null = null

  static #STORE_KEY = Config.keys.playerAccounts

  static DEFAULT_ACCOUNT_TARGET = DEFAULT_ACCOUNT_TARGET

  constructor (store: ElectronStore) {
    this.#store = store
    const value = store.get(PlayAccounts.#STORE_KEY)
    if (Array.isArray(value)) {
      this.#accounts = value
    }
  }

  #generateIdentifier (text: string) {
    return createHash('sha256').update(text).digest('hex').substring(0, 6)
  }

  #save () {
    this.#store!.set(PlayAccounts.#STORE_KEY, this.#accounts)
  }

  add (name: string) {
    if (!name?.trim()) {
      throw new Error('name is empty')
    }

    this.#accounts.push({
      identifier: this.#generateIdentifier(name),
      name,
    })
    this.#save()
  }

  list (): PlayAccount[] {
    return JSON.parse(JSON.stringify(this.#accounts))
  }

  remove (identifier: string) {
    this.#accounts = this.#accounts.filter((s) => s.identifier !== identifier)
    this.#save()
  }
}

export default PlayAccounts
