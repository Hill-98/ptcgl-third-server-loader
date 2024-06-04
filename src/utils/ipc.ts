import { sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IpcMainEvent, IpcMainInvokeEvent, WebFrameMain } from 'electron'
import { app, ipcMain } from 'electron'
import { app as appPath } from '../Paths.js'

export interface WrapperOptions {
  invoke?: boolean
}

export interface WrapperOptionsWithEvent extends WrapperOptions {
  event?: true
}

export interface WrapperOptionsWithoutEvent extends WrapperOptions {
  event?: false
}

export type WrapperCallback = (...args: any[]) => any
export type WrapperCallbackWithEvent = (ev: IpcMainEvent, ...args: any[]) => any

const senderCache: Map<number, boolean> = new Map()

export const serializationError = function serializationError (err: any) {
  if (typeof err !== 'object') {
    return new Error(err.toString())
  }
  const error = new Error()
  if ('message' in err) {
    error.message = JSON.stringify({
      message: err.message,
    })
  }
  return error
}

function resultPromiseWrapper (this: any, error: boolean, result: any): Promise<any> {
  if (typeof result === 'object' && result instanceof Promise) {
    return result.then(resultPromiseWrapper.bind(this, false)).catch(resultPromiseWrapper.bind(this, true))
  }

  return error ? Promise.reject(result) : Promise.resolve(result)
}

function validateSender (id: number, frame: WebFrameMain, validator?: (frame: WebFrameMain) => boolean) {
  const cache = senderCache.get(id)
  if (typeof cache !== 'undefined') {
    return cache
  }
  try {
    const valid = (frame.url.startsWith('file:') && fileURLToPath(frame.url)
      .startsWith(appPath + sep)) || (typeof validator === 'function' ? validator(frame) : true)
    senderCache.set(id, valid)
  } catch (err) {
    console.error(err)
  }
  return !!senderCache.get(id)
}

function ipcWrapper (channel: string, callback: WrapperCallback): void
function ipcWrapper (channel: string, callback: WrapperCallback, options?: boolean): void
function ipcWrapper (channel: string, callback: WrapperCallback, options?: WrapperOptionsWithoutEvent): void
function ipcWrapper (channel: string, callback: WrapperCallbackWithEvent, options?: WrapperOptionsWithEvent): void
function ipcWrapper (channel: string, callback: WrapperCallback, options: WrapperOptionsWithEvent | WrapperOptionsWithoutEvent | boolean = true) {
  const opt = {
    event: false,
    invoke: true,
    ...(typeof options === 'object' ? options : { invoke: options }),
  }

  const ipcCallback = (ev: IpcMainEvent | IpcMainInvokeEvent, ...args: any[]) => {
    if (import.meta.env.PROD && !validateSender(ev.processId, ev.senderFrame)) {
      return
    }
    try {
      return resultPromiseWrapper(false, opt.event ? callback(ev, ...args) : callback(...args))
        .catch((err) => {
          console.error(err)
          return Promise.reject(serializationError(err))
        })
    } catch (err) {
      console.error(err)
      throw serializationError(err)
    }
  }

  if (opt.invoke) {
    ipcMain.handle(channel, ipcCallback)
  } else {
    ipcMain.on(channel, ipcCallback)
  }
}

export const wrapper = ipcWrapper

app.on('web-contents-created', (_, webContents) => {
  if (senderCache.has(webContents.mainFrame.processId)) {
    senderCache.delete(webContents.mainFrame.processId)
  }
})
