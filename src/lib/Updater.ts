import { compareVersions } from 'compare-versions'
import { app } from 'electron'
import axios from 'axios'
import Cache from './Cache.js'

export interface CheckUpdateResult {
  changelog: string
  downloadUrl?: string
  updatable: boolean
}

export interface UpdateData {
  changelog: string
  url?: string
  version: string
}

class Updater {
  #cache = new Cache<Partial<UpdateData>>()

  readonly #url: string

  constructor (url: string) {
    this.#cache.ttl = 60
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      throw new Error('Updater: Only URL with HTTP(S) protocol are supported.')
    }
    this.#url = url
  }

  async #fetch (): Promise<Readonly<Partial<UpdateData>>> {
    const cache = this.#cache.get()
    if (cache) {
      return cache
    }
    const u = new URL(this.#url)
    u.searchParams.append('v', app.getVersion())
    const res = await axios.get<Partial<UpdateData>>(u.toString(), {
      timeout: 10000,
    })
    const data = res.data
    if (typeof data !== 'object') {
      throw new Error('The updater\'s response is not a JSON object.')
    }
    this.#cache.set(data)
    return data
  }

  async check (): Promise<CheckUpdateResult> {
    const data = await this.#fetch()
    return {
      changelog: data?.changelog ?? '',
      downloadUrl: data.url,
      updatable: compareVersions(typeof data.version === 'string' ? data.version : '0', app.getVersion()) === 1,
    }
  }
}

export default Updater
