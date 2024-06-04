import { createHash } from 'node:crypto'
import { OFFICIAL_SERVER_IDENTIFIER } from '../shared.constants.js'
import axios from 'axios'
import Cache from './Cache.js'

export interface ServerItem {
  entryPoint: string
  identifier: string
  name: string
  playerCount?: number | null
  playerCountLimit?: number | null
}

export interface GameServerNews<T, P> {
  type: T
  content: P
}

export type GameServerTextNews = GameServerNews<'text', string> | string

export interface GameServerPublishData {
  $version: number
  servers: ServerItem[]
  news: GameServerTextNews
}

export interface GameServerPublishDataV1<T> {
  $version: 1
  servers: T
  news?: GameServerTextNews
}


const ALLOW_VERSIONS = [1]

const OFFICIAL_SERVER_PUBLISH_DATA = {
  $version: 1,
  servers: [
    {
      identifier: OFFICIAL_SERVER_IDENTIFIER,
      entryPoint: OFFICIAL_SERVER_IDENTIFIER,
      name: '官方服务器',
    },
  ],
  news: '',
}

class GameServerPublisher {
  #cache = new Cache<GameServerPublishData>()

  readonly #url: string = ''

  constructor (url: string) {
    this.#cache.ttl = 10
    if (url === OFFICIAL_SERVER_IDENTIFIER) {
      this.#cache.ttl = Infinity
      this.#cache.set(OFFICIAL_SERVER_PUBLISH_DATA)
      return
    }
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      throw new Error('GameServerPublisher: Only URL with HTTP(S) protocol are supported.')
    }
    this.#url = url
  }

  async #fetch (forceUseCache = false): Promise<Readonly<GameServerPublishData>> {
    const cache1 = this.#cache.get()
    if (cache1) {
      return cache1
    }
    const cache2 = this.#cache.get(forceUseCache)
    if (cache2) {
      return cache2
    }
    const res = await axios.get<GameServerPublishDataV1<ServerItem[]>>(this.#url, {
      timeout: 10000,
    })
    const data = res.data
    if (typeof data !== 'object') {
      throw new Error('The publisher\'s response is not a JSON object.')
    }
    if (!ALLOW_VERSIONS.includes(data.$version)) {
      throw new Error('The publisher provided data of an unknown version.')
    }
    const result: GameServerPublishData = {
      $version: data.$version,
      servers: data.servers.map<ServerItem>((item) => {
        const identifier = item.identifier?.trim() ?? ''
        return {
          ...item,
          identifier: identifier !== ''
            ? identifier
            : createHash('md5').update(item.entryPoint as string).digest('hex'),
          entryPoint: item.entryPoint as string,
          name: item.name ? item.name : identifier ?? 'x',
        }
      }),
      news: data.news ? data.news : '',
    }
    this.#cache.set(result)
    return result
  }

  async getEntryPoint (identifier: string): Promise<string | null> {
    const cache = await this.#fetch(true)
    return cache.servers.find((s) => s.identifier === identifier)?.entryPoint ?? null
  }

  async getServers (): Promise<Readonly<ServerItem[]>> {
    return (await this.#fetch()).servers
  }

  async getNews (): Promise<GameServerNews<'text', string>> {
    const news = (await this.#fetch()).news
    return typeof news === 'object' ? news : {
      type: 'text',
      content: news,
    }
  }
}

export default GameServerPublisher
