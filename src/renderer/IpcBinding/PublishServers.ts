import * as IpcMessages from '../../IpcMessages.js'
import type { PublishServerItem, PublishServerSubmitData } from '../../lib/PublishServers.js'

export const add = (data: PublishServerSubmitData) => window.ipc.invoke(IpcMessages.publishServers_add, data)

export const get = (identifier: string) => window.ipc.invoke<PublishServerItem>(IpcMessages.publishServers_get, identifier)

export const list = () => window.ipc.invoke<PublishServerItem[]>(IpcMessages.publishServers_list)

export const remove = (identifier: string) => window.ipc.invoke(IpcMessages.publishServers_remove, identifier)
