export interface CacheType<T> {
  data: T
  time: number
}

export default class Cache<T> {
  #cache: CacheType<T> | null = null

  ttl: number = 0

  expired (): boolean {
    if (this.ttl === Infinity) {
      return false
    }
    return this.#cache === null || Date.now() - this.#cache.time > this.ttl * 1000
  }

  get (ignoreExpire = false): T | null {
    if (!ignoreExpire && this.expired()) {
      return null
    }
    return this.#cache!.data
  }

  set (data: T, updateTime = true): void {
    let time = Date.now()
    if (!updateTime && this.#cache?.time) {
      time = this.#cache.time
    }
    this.#cache = {
      data,
      time: time,
    }
  }
}
