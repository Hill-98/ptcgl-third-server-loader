import { contextBridge, ipcRenderer } from 'electron/renderer'
import * as IpcMessages from './IpcMessages.js'

const handleInvokeError = function handleInvokeError (error: any) {
  let message = typeof error?.message === 'string' ? error.message : ''
  const index = message.indexOf('{')
  if (index === -1) {
    throw error
  }
  try {
    const obj = JSON.parse(message.substring(index))
    if (typeof obj.message === 'string') {
      message = obj.message
    }
  } catch (err) {
    console.error(err)
    throw error
  }
  throw new Error(message)
}

contextBridge.exposeInMainWorld('app', {
  about: ipcRenderer.send.bind(this, IpcMessages.app_about),
  quit: ipcRenderer.send.bind(this, IpcMessages.app_quit),
  settings: ipcRenderer.send.bind(this, IpcMessages.app_settings),
})

contextBridge.exposeInMainWorld('ipc', {
  async invoke (channel, ...args) {
    try {
      return await ipcRenderer.invoke(channel, ...args)
    } catch (err) {
      handleInvokeError(err)
    }
  },
  off (channel, listener) {
    ipcRenderer.off(channel, listener)
  },
  on (channel, listener) {
    ipcRenderer.on(channel, listener)
  },
  once (channel, listener) {
    ipcRenderer.once(channel, listener)
  },
  send (channel, ...args) {
    ipcRenderer.send(channel, ...args)
  },
} as { [name: string]: (...args: any[]) => any })

contextBridge.exposeInMainWorld('renderer', {
  close: ipcRenderer.send.bind(this, IpcMessages.window_close),
  minimize: ipcRenderer.send.bind(this, IpcMessages.window_minimize),
  reload: ipcRenderer.send.bind(this, IpcMessages.window_reload),
})
