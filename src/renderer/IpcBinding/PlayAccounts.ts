import * as IpcMessages from '../../IpcMessages.js'
import type { PlayAccount } from '../../lib/PlayAccounts.js'

export const add = (name: string) => window.ipc.invoke(IpcMessages.playAccount_add, name)

export const list = () => window.ipc.invoke<PlayAccount[]>(IpcMessages.playAccount_list)

export const remove = (identifier: string) => window.ipc.invoke(IpcMessages.playAccount_remove, identifier)
