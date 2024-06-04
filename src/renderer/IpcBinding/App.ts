import * as IpcMessages from '../../IpcMessages.js'
import type { PublishServerItem } from '../../lib/PublishServers.js'

export const getPublishServer = () => window.ipc.invoke<PublishServerItem>(IpcMessages.app_getPublishServer)

export const selectGameInstallDirectory = () => window.ipc.invoke<boolean | null>(IpcMessages.app_selectGameInstallDirectory)

export const selectPublishServer = (identifier?: string) => window.ipc.invoke(IpcMessages.app_selectPublishServer, identifier)

export const storeGameInstallDirectory = () => window.ipc.invoke(IpcMessages.app_storeGameInstallDirectory)
