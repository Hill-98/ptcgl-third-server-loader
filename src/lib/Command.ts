import { sync as spawnSync } from 'cross-spawn'

export interface CommandOptions {
  encoding?: BufferEncoding | 'url' | null | undefined
  trim: boolean
  windowsVerbatimArguments: boolean
}

class Command {
  readonly #cli: string

  #options: CommandOptions = {
    encoding: 'utf8',
    trim: true,
    windowsVerbatimArguments: false,
  }

  #testArgs: string[] = []

  constructor (cli: string, options?: Partial<CommandOptions>)
  constructor (cli: string, testArgs?: string[])
  constructor (cli: string, options: Partial<CommandOptions> | string[] = {}, testArgs: string[] = ['--help']) {
    this.#cli = cli
    if (Array.isArray(options)) {
      this.#testArgs = options
    } else {
      this.#options = {
        ...this.#options,
        ...options,
      }
      this.#testArgs = testArgs
    }
  }

  get #encoding () {
    return this.#options.encoding === 'url' ? 'utf-8' : this.#options.encoding
  }

  #decodeOutput (output: any) {
    let result = output
    if (this.#options.encoding === 'url') {
      result = decodeURIComponent(result)
    }
    if (typeof result === 'string' && this.#options.trim) {
      result = result.trim()
    }
    return result
  }

  exec (...args: string[]) {
    const p = spawnSync(this.#cli, args, {
      encoding: this.#encoding,
      windowsVerbatimArguments: this.#options.windowsVerbatimArguments,
    })
    return {
      status: p.status,
      stderr: this.#decodeOutput(p.stderr),
      stdout: this.#decodeOutput(p.stdout),
    }
  }

  isAvailable () {
    try {
      return this.exec(...this.#testArgs).status === 0
    } catch (err) {
      console.error(err)
    }
    return false
  }
}

export default Command
