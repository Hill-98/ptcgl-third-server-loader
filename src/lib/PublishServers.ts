import { createHash } from 'node:crypto'
import { OFFICIAL_SERVER_IDENTIFIER } from '../shared.constants.js'
import GameServerPublisher from './GameServerPublisher.js'
import * as Config from '../Configuration.js'
import type ElectronStore from 'electron-store'

export interface PublishServerItem<T = any> {
  identifier: string
  name: string
  url: string
  additionalData?: T
}

export type PublishServerSubmitData = Omit<PublishServerItem, 'identifier' | 'additionalData'>

class PublishServers {
  #servers: PublishServerItem[] = []

  #store: ElectronStore | null = null

  static #STORE_KEY = Config.keys.publishServers

  static OFFICIAL_SERVER_IDENTIFIER = OFFICIAL_SERVER_IDENTIFIER

  constructor (store: ElectronStore) {
    this.#store = store
    const value = store.get(PublishServers.#STORE_KEY)
    if (Array.isArray(value)) {
      this.#servers = value
    } else {
      this.#servers.push({
        identifier: OFFICIAL_SERVER_IDENTIFIER,
        name: '官方服务器',
        url: OFFICIAL_SERVER_IDENTIFIER,
      })
    }
  }

  #generateIdentifier (text: string) {
    return createHash('md5').update(text).digest('hex')
  }

  #get (identifier: string): PublishServerItem | null {
    const item = this.#servers.find((s) => s.identifier === identifier)
    return item ? item : null
  }

  #save () {
    this.#store!.set(PublishServers.#STORE_KEY, this.#servers)
  }

  add (data: PublishServerSubmitData) {
    if (!data.name?.trim() || !data.url?.trim()) {
      throw new Error('data is empty')
    }
    if (!URL.canParse(data.url) || !data.url.match(/^https?:/)) {
      throw new Error('data url illegal')
    }

    this.#servers.push({
      identifier: this.#generateIdentifier(data.url),
      name: data.name,
      url: data.url,
    })
    this.#save()
  }

  exists (identifier: string): boolean {
    return this.get(identifier) !== null
  }

  get (identifier: string): PublishServerItem | null {
    const item = this.#get(identifier)
    return item ? JSON.parse(JSON.stringify(item)) : null
  }

  getAdditionalData<T = any> (identifier: string, key?: string): T | null {
    const item = this.#get(identifier)
    const data = item?.additionalData ? JSON.parse(JSON.stringify(item.additionalData)) : null
    if (!key || data === null) {
      return data;
    }
    return typeof data[key] !== 'undefined' ? data[key] : null
  }

  getPublisher (identifier: string): GameServerPublisher | null {
    const item = this.get(identifier)
    return item ? new GameServerPublisher(item.url) : null
  }

  list (): PublishServerItem[] {
    return JSON.parse(JSON.stringify(this.#servers))
  }

  remove (identifier: string) {
    if (identifier === PublishServers.OFFICIAL_SERVER_IDENTIFIER) {
      throw new Error('Official servers cannot be deleted')
    }
    this.#servers = this.#servers.filter((s) => s.identifier !== identifier)
    this.#save()
  }

  setAdditionalData<T = any> (identifier: string, data: T) {
    const item = this.#get(identifier)
    if (item) {
      item.additionalData = typeof data !== 'object' ? data : {
        ...(typeof item.additionalData === 'object' ? item.additionalData : {}),
        ...data,
      }
      this.#save()
    }
  }
}

export default PublishServers
