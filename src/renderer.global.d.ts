export {}

interface AppIPC {
  about (): void
  quit (): void
  settings(): void
}

interface IPC {
  invoke<T> (channel: string, ...args: any[]): Promise<T>

  invoke (channel: string, ...args: any[]): Promise<void>

  off (channel: string, listener: (e: Electron.IpcRendererEvent, ...args: any[]) => any): void

  on (channel: string, listener: (e: Electron.IpcRendererEvent, ...args: any[]) => any): void

  once (channel: string, listener: (e: Electron.IpcRendererEvent, ...args: any[]) => any): void

  send (channel: string, ...args: any[]): void
}

interface Renderer {
  close (): void
  minimize (): void
  reload (): void
}

declare global {
  // noinspection JSUnusedGlobalSymbols
  interface Window {
    app: AppIPC
    ipc: IPC
    os: OS
    renderer: Renderer
  }
}
