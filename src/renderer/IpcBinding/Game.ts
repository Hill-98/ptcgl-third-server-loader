import * as IpcMessages from '../../IpcMessages.js'

export const clearBuiltinBrowserCache = () => window.ipc.invoke(IpcMessages.game_clearBuiltinBrowserCache)

export const detectInstallDirectory = () => window.ipc.invoke<boolean>(IpcMessages.game_detectInstallDirectory)

export const getInstallDirectory = () => window.ipc.invoke<string>(IpcMessages.game_getInstallDirectory)

export const isRunning = () => window.ipc.invoke<boolean>(IpcMessages.game_isRunning)

export const start = (identifier: string, account: string) => window.ipc.invoke(IpcMessages.game_start, identifier, account)
