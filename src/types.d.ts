import type GameServerPublisher from './lib/GameServerPublisher.js'

export interface GlobalState {
  checkingAppUpdate: boolean
  gameInstallDirectory: string
  gameServerPublisher: GameServerPublisher | null
  publishServerIdentifier: string
}
