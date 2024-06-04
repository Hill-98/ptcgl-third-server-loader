import * as IpcMessages from '../../IpcMessages.js'
import type { GameServerNews, ServerItem } from '../../lib/GameServerPublisher.js'

export const getPlayAccount = () => window.ipc.invoke<string | null>(IpcMessages.gameServer_getPlayAccount)

export const setPlayAccount = (playAccount: string) => window.ipc.invoke(IpcMessages.gameServer_setPlayAccount, playAccount)

export const getSelectedServer = () => window.ipc.invoke<string | null>(IpcMessages.gameServer_getSelectedServer)

export const setSelectedServer = (selectedServer: string) => window.ipc.invoke(IpcMessages.gameServer_setSelectedServer, selectedServer)

export const servers = () => window.ipc.invoke<ServerItem[]>(IpcMessages.gameServer_servers)

export const news = () => window.ipc.invoke<GameServerNews<'text', string>>(IpcMessages.gameServer_news)
