import { dirname, join, parse as parsePath } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, protocol, screen, session, shell } from 'electron'
import { SelectDirectory } from './utils/SelectDialog.js'
import fs from 'node:fs'
import axios from 'axios'
import BepInExManager from './lib/BepInExManager.js'
import DynamicWindowSize from './utils/dynamicWindowSize.js'
import PlayAccounts from './lib/PlayAccounts.js'
import PublishServers from './lib/PublishServers.js'
import SilentError from './errors/SilentError.js'
import Updater, { CheckUpdateResult } from './lib/Updater.js'
import * as Config from './Configuration.js'
import * as Game from './utils/Game.js'
import * as ipc from './utils/ipc.js'
import * as IpcMessages from './IpcMessages.js'
import * as Paths from './Paths.js'
import * as PTCGLUtility from './utils/PTCGLUtility.js'
import type { GlobalState } from './types.d.ts'

process.on('uncaughtException', (err) => {
  console.error(err)
  if (import.meta.env.DEV) {
    debugger
  }
  if (app.isReady()) {
    dialog.showMessageBoxSync({
      title: app.getName(),
      type: 'error',
      message: `UncaughtException：\n${err.stack}`,
    })
  }
  process.exit()
})

const APP_NAME = 'PTCGL 第三方服务器启动器'
const TERMS_OF_USE_LATEST_VERSION = typeof import.meta.env.VITE_TERMS_OF_USE_LATEST_VERSION === 'string'
  ? Number.parseInt(import.meta.env.VITE_TERMS_OF_USE_LATEST_VERSION)
  : 0

const APP_LOGO = nativeImage.createFromPath(join(Paths.resources, 'icons/app.png'))
const BROWSER_WINDOWS: { [name: string]: BrowserWindow } = Object.create(null)
const FIRST_RUN = !fs.existsSync(join(app.getPath('userData'), 'FirstRun'))
const PRELOAD_SCRIPT = join(Paths.app, 'preload.cjs')

const SELECTION_MENU = Menu.buildFromTemplate([
  { label: '复制', role: 'copy' },
  { type: 'separator' },
  { label: '全选', role: 'selectAll' },
])

const INPUT_MENU = Menu.buildFromTemplate([
  { label: '撤销', role: 'undo' },
  { label: '重做', role: 'redo' },
  { type: 'separator' },
  { label: '剪切', role: 'cut' },
  { label: '复制', role: 'copy' },
  { label: '粘贴', role: 'paste' },
  { type: 'separator' },
  { label: '全选', role: 'selectAll' },
])

const page = (name: string) => {
  if (import.meta.env.DEV && process.env.ELECTRON_RENDERER_URL) {
    return `${process.env.ELECTRON_RENDERER_URL}/${name}/index.html`
  }
  return pathToFileURL(join(Paths.app, `pages/${name}.html`)).toString()
}
const playAccounts = new PlayAccounts(Config.store)
const publishServers = new PublishServers(Config.store)

const globalState: GlobalState = {
  checkingAppUpdate: false,
  gameInstallDirectory: Config.store.get(Config.keys.gameInstallationDirectory, ''),
  gameServerPublisher: null,
  publishServerIdentifier: (() => {
    const i = Config.store.get(Config.keys.publishServerIdentifier, 'x')
    return publishServers.exists(i) ? i : PublishServers.OFFICIAL_SERVER_IDENTIFIER
  })(),
}

const checkFilesHash = function checkFilesHash () {
  const checksumsFile = join(app.getAppPath(), 'checksums.json')
  if (!fs.existsSync(checksumsFile)) {
    return Promise.reject(new Error('checksums file does not exist'))
  }
  const checksums = JSON.parse(fs.readFileSync(checksumsFile, { encoding: 'utf8' }))
  return Promise.all<void>(checksums.map((item: any) => new Promise<void>((resolve, reject) => {
    const fullPathWithApp = join(app.getAppPath(), item.path)
    const fullPathWithAppUnpack = join(Paths.unpack, item.path)
    const path = fs.existsSync(fullPathWithApp)
      ? fullPathWithApp
      : (fs.existsSync(fullPathWithAppUnpack) ? fullPathWithAppUnpack : null)
    if (path === null) {
      reject(new Error(`'${item.path}' not found.`))
      return
    }
    fs.readFile(path, (err, data) => {
      if (err) {
        reject(err)
        return
      }
      crypto.subtle.digest('SHA-256', data)
        .then((buf) => {
          const hash = Array.prototype.map.call(new Uint8Array(buf), (x: number) => `00${x.toString(16)}`.slice(-2))
            .join('')
          if (hash === item.hash) {
            resolve()
          } else {
            reject(new Error(`'${item.path}' checksum mismatch.\nexpect: ${item.hash}\nobtain: ${hash}`))
          }
        }).catch(reject)
    })
  })))
}

const createAboutWindow = async function createAboutWindow (parent?: BrowserWindow | null) {
  const aboutWindow = new BrowserWindow({
    icon: APP_LOGO,
    width: 400,
    height: 400,
    minimizable: false,
    modal: true,
    resizable: false,
    parent: parent ?? undefined,
    show: false,
    useContentSize: true,
  })

  aboutWindow.once('ready-to-show', () => {
    aboutWindow.show()
  })

  await aboutWindow.loadURL(page('about'))
}

const createMainWindow = async function createMainWindow () {
  const dynamicSize = {
    default: { width: 1024, height: 576 },
    hd: { width: 1024, height: 576 },
    fhd: { width: 1536, height: 864 },
    qhd: { width: 1920, height: 1080 },
  }

  const mainWindow = new BrowserWindow({
    icon: APP_LOGO,
    ...DynamicWindowSize(dynamicSize),
    frame: false,
    resizable: false,
    show: false,
    useContentSize: true,
    webPreferences: {
      preload: PRELOAD_SCRIPT,
    },
  })

  BROWSER_WINDOWS.main = mainWindow

  mainWindow.once('closed', () => {
    delete BROWSER_WINDOWS.main
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('moved', setImmediate.bind(globalThis, () => {
    const size = DynamicWindowSize(dynamicSize, mainWindow.getBounds())
    const [width, height] = mainWindow.getSize()
    if (width !== size.width || height !== size.height) {
      mainWindow.setResizable(true)
      mainWindow.setSize(size.width, size.height)
      mainWindow.setResizable(false)
    }
  }))
  await mainWindow.loadURL(page('main'))
}

const createSettingsWindow = async function createSettingsWindow (parent?: BrowserWindow | null) {
  const settingsWindow = new BrowserWindow({
    icon: APP_LOGO,
    width: 800,
    height: 600,
    resizable: false,
    useContentSize: true,
    parent: parent ?? undefined,
    show: false,
    webPreferences: {
      preload: join(Paths.app, 'preload.cjs'),
    },
  })

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show()
  })

  await settingsWindow.loadURL(page('settings'))
}

const showTermsOfUse = function showTermsOfUse () {
  return new Promise<void>((resolve, reject) => {
    const window = new BrowserWindow({
      icon: APP_LOGO,
      width: 800,
      height: 600,
      minimizable: false,
      resizable: false,
      useContentSize: true,
      webPreferences: {
        preload: join(Paths.app, 'preload.cjs'),
      },
    })

    ipcMain.once(IpcMessages.termsOfUse, (_, accept: boolean) => {
      if (accept) {
        resolve()
      } else {
        reject(new Error('reject'))
      }
      window.close()
    })

    window.loadURL(page('terms-of-use')).catch(reject)
  })
}

const sendUpdateResult = function sendUpdateResult (result: CheckUpdateResult | null, error?: Error) {
  return new Promise<void>((resolve) => {
    const mainWindow = BROWSER_WINDOWS.main
    if (mainWindow && !mainWindow.webContents.isLoading()) {
      mainWindow.webContents.send(IpcMessages.app_onCheckAppUpdate, result, error)
      resolve()
      return
    }
    if (mainWindow && mainWindow.webContents.isLoading()) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send(IpcMessages.app_onCheckAppUpdate, result, error)
        resolve()
      })
      return
    }

    const onWebContentsCreated = function onWebContentsCreated () {
      if (BROWSER_WINDOWS.main) {
        app.off('web-contents-created', onWebContentsCreated)
        resolve(sendUpdateResult(result, error))
      }
    }

    app.on('web-contents-created', onWebContentsCreated)
  })
}

const checkAppUpdate = function checkAppUpdate (state: Pick<GlobalState, 'checkingAppUpdate'>, url: string) {
  if (state.checkingAppUpdate || url.trim() === '') {
    return
  }

  state.checkingAppUpdate = true

  const updater = new Updater(url)
  console.log(updater)
  updater.check()
    .then((result) => {
      return sendUpdateResult(result)
    })
    .catch((err) => {
      return sendUpdateResult(null, ipc.serializationError(err))
    })
    .finally(() => {
      state.checkingAppUpdate = false
    })
}

const handleAppProtocol = async function handleAppProtocol (request: Request): Promise<Response> {
  const url = new URL(request.url)
  if (url.hostname === 'background') {
    const matches = url.pathname.match(/^\/(\w+)/)
    if (matches === null) {
      return new Response(null, { status: 400 })
    }
    const name = matches[1]
    const path = join(Paths.externalResources, `background/${name}.webp`)
    if (!fs.existsSync(path)) {
      return new Response(null, { status: 404 })
    }
    const data = fs.readFileSync(path)
    return new Response(data, {
      headers: {
        'cache-control': 'no-cache',
        'content-length': data.length.toString(),
        'content-type': 'image/webp',
        'date': new Date().toUTCString(),
      },
    })
  }
  if (url.hostname === 'images' && url.pathname === '/logo') {
    const data = APP_LOGO.toPNG()
    return new Response(data, {
      headers: {
        'cache-control': 'no-cache',
        'content-length': data.length.toString(),
        'content-type': 'image/png',
        'date': new Date().toUTCString(),
      },
    })
  }
  return new Response(null, { status: 404 })
}

const onActivate = async function onActivate () {
  if (BROWSER_WINDOWS.main) {
    return
  }

  return createMainWindow()
}

const selectGameInstallDirectory = async function selectGameInstallDirectory (state: Pick<GlobalState, 'gameInstallDirectory'>, ev: Electron.IpcMainEvent) {
  const dir = await SelectDirectory({
    title: '选择 Pokémon TCG Live 安装目录',
    defaultPath: '~desktop',
    filters: [
      {
        name: 'Pokemon TCG Live.exe',
        extensions: ['exe'],
      },
    ],
  }, BrowserWindow.fromWebContents(ev.sender))
  if (!dir || Array.isArray(dir) || !PTCGLUtility.isPTCGLInstallDirectory(dir)) {
    return dir === null ? null : false
  }
  state.gameInstallDirectory = dir
  return true
}

const settingsValueHelper = function settingsValueHelper<Key extends Config.keys> (key: Key, value?: Config.Configuration[Key] | null): Config.Configuration[Key] | undefined {
  if (value === null) {
    Config.store.delete(key)
  } else if (typeof value !== 'undefined') {
    Config.store.set(key, value)
  }
  return Config.store.get(key)
}

const updateGameServerPublisher = function updateGameServerPublisher (state: Pick<GlobalState, 'gameServerPublisher' | 'publishServerIdentifier'>, identifier?: string) {
  const i = typeof identifier === 'string' ? identifier : PublishServers.OFFICIAL_SERVER_IDENTIFIER
  if (publishServers.exists(i)) {
    state.publishServerIdentifier = i
    Config.store.set(Config.keys.publishServerIdentifier, i)
    state.gameServerPublisher = publishServers.getPublisher(i ?? '')
  }
}

app.on('web-contents-created', (_, contents) => {
  if (import.meta.env.DEV) {
    setImmediate(contents.openDevTools.bind(contents, {
      activate: false,
      mode: 'detach',
    }))
  }

  if (import.meta.env.PROD) {
    contents.on('will-navigate', (ev) => {
      ev.preventDefault()
    })
  }

  contents.on('context-menu', (e, props) => {
    const { selectionText, isEditable } = props

    if (isEditable) {
      INPUT_MENU.popup({
        window: BrowserWindow.fromWebContents(contents) as BrowserWindow,
      })
    } else if (selectionText && selectionText.trim() !== '') {
      SELECTION_MENU.popup({
        window: BrowserWindow.fromWebContents(contents) as BrowserWindow,
      })
    }
  })

  contents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url)
      if (u.protocol === 'https:') {
        setImmediate(() => {
          shell.openExternal(u.toString()).catch(console.error)
        })
      } else if (u.protocol === 'open-path:') {
        const path = decodeURIComponent(u.pathname.substring(1))
        setImmediate(() => {
          try {
            if (fs.statSync(path).isDirectory()) {
              shell.openPath(path).catch(console.error)
            } else {
              shell.showItemInFolder(path)
            }
          } catch { }
        })
      }
    } catch { }
    return { action: 'deny' }
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

ipc.wrapper(IpcMessages.app_about, (ev) => createAboutWindow(BrowserWindow.fromWebContents(ev.sender) as BrowserWindow), {
  event: true,
  invoke: false,
})
ipc.wrapper(IpcMessages.app_getPublishServer, () => publishServers.get(globalState.publishServerIdentifier))
ipc.wrapper(IpcMessages.app_quit, () => {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.close()
  })
}, false)
ipc.wrapper(IpcMessages.app_settings, (ev) => createSettingsWindow(BrowserWindow.fromWebContents(ev.sender) as BrowserWindow), {
  event: true,
  invoke: false,
})
ipc.wrapper(IpcMessages.app_selectGameInstallDirectory, selectGameInstallDirectory.bind(this, globalState), { event: true })
ipc.wrapper(IpcMessages.app_selectPublishServer, (identifier?: string) => {
  updateGameServerPublisher(globalState, identifier)
})
ipc.wrapper(IpcMessages.app_storeGameInstallDirectory, () => {
  Config.store.set(Config.keys.gameInstallationDirectory, globalState.gameInstallDirectory)
})

ipc.wrapper(IpcMessages.game_clearBuiltinBrowserCache, Game.clearBuiltinBrowserCache)
ipc.wrapper(IpcMessages.game_detectInstallDirectory, () => {
  const dir = PTCGLUtility.detectPTCGLInstallDirectory()
  if (typeof dir === 'string' && PTCGLUtility.isPTCGLInstallDirectory(dir)) {
    globalState.gameInstallDirectory = dir
    return true
  }
  return false
})
ipc.wrapper(IpcMessages.game_getInstallDirectory, () => globalState.gameInstallDirectory)
ipc.wrapper(IpcMessages.game_isRunning, PTCGLUtility.PTCGLIsRunning)
ipc.wrapper(IpcMessages.game_start, (identifier: string, account: string) => {
  const features: Game.StartGameFeatures[] = []
  if (Config.store.get(Config.keys.fixBuiltinBrowserError)) {
    features.push('fixBuiltinBrowserError')
  }
  if (Config.store.get(Config.keys.unlockAllBeautifyDesks)) {
    features.push('unlockAllBeautifyDesks')
  }
  return Game.start({
    account,
    features,
    path: globalState.gameInstallDirectory,
    server: {
      identifier,
      publisher: globalState.gameServerPublisher ?? undefined,
    },
  })
})

ipc.wrapper(IpcMessages.gameServer_getPlayAccount, () => publishServers.getAdditionalData(globalState.publishServerIdentifier, 'playAccount') ?? null)
ipc.wrapper(IpcMessages.gameServer_setPlayAccount, (playAccount: string) => {
  publishServers.setAdditionalData(globalState.publishServerIdentifier, {
    playAccount,
  })
})

ipc.wrapper(IpcMessages.gameServer_getSelectedServer, () => publishServers.getAdditionalData(globalState.publishServerIdentifier, 'selectedServer') ?? null)
ipc.wrapper(IpcMessages.gameServer_setSelectedServer, (selectedServer: string) => {
  publishServers.setAdditionalData(globalState.publishServerIdentifier, {
    selectedServer,
  })
})
ipc.wrapper(IpcMessages.gameServer_servers, () => globalState.gameServerPublisher?.getServers())
ipc.wrapper(IpcMessages.gameServer_news, () => globalState.gameServerPublisher?.getNews())

ipc.wrapper(IpcMessages.playAccount_add, playAccounts.add.bind(playAccounts))
ipc.wrapper(IpcMessages.playAccount_list, playAccounts.list.bind(playAccounts))
ipc.wrapper(IpcMessages.playAccount_remove, playAccounts.remove.bind(playAccounts))

ipc.wrapper(IpcMessages.publishServers_add, publishServers.add.bind(publishServers))
ipc.wrapper(IpcMessages.publishServers_get, publishServers.get.bind(publishServers))
ipc.wrapper(IpcMessages.publishServers_list, publishServers.list.bind(publishServers))
ipc.wrapper(IpcMessages.publishServers_remove, (identifier) => {
  publishServers.remove(identifier)
  if (identifier === globalState.publishServerIdentifier) {
    updateGameServerPublisher(globalState)
  }
})

ipc.wrapper(IpcMessages.PTCGLUtility_isAvailable, PTCGLUtility.isAvailable)

ipc.wrapper(IpcMessages.settings_fixBuiltinBrowserError, settingsValueHelper.bind(this, Config.keys.fixBuiltinBrowserError))

ipc.wrapper(IpcMessages.settings_unlockAllBeautifyDesks, settingsValueHelper.bind(this, Config.keys.unlockAllBeautifyDesks))

ipc.wrapper(IpcMessages.window_close, (ev) => {
  BrowserWindow.fromWebContents(ev.sender)?.close()
}, { event: true, invoke: false })

ipc.wrapper(IpcMessages.window_minimize, (ev) => {
  BrowserWindow.fromWebContents(ev.sender)?.minimize()
}, { event: true, invoke: false })

ipc.wrapper(IpcMessages.window_reload, (ev) => {
  ev.sender?.reloadIgnoringCache()
}, { event: true, invoke: false })

if (!app.requestSingleInstanceLock()) {
  app.whenReady().then(() => {
    dialog.showMessageBoxSync({
      title: APP_NAME,
      type: 'info',
      message: `${APP_NAME} 已经在运行了。`,
    })
    process.exit()
  })
}

app.whenReady().then(async () => {
  if (app.isPackaged) {
    try {
      await checkFilesHash()
    } catch (err: any) {
      throw new Error('An error occurred while verifying the file：' + err.message)
    }
  }

  if (import.meta.env.VITE_VUE_DEVTOOLS_PATH) {
    await session.defaultSession.loadExtension(import.meta.env.VITE_VUE_DEVTOOLS_PATH)
  }

  const termsOfUseVersion = Config.store.get(Config.keys.termsOfUseVersion, 0)
  if (TERMS_OF_USE_LATEST_VERSION !== 0 && termsOfUseVersion !== TERMS_OF_USE_LATEST_VERSION) {
    try {
      await showTermsOfUse()
    } catch {
      throw new SilentError('User rejected terms of use.')
    }
    Config.store.set(Config.keys.termsOfUseVersion, TERMS_OF_USE_LATEST_VERSION)
  }

  if (FIRST_RUN) {
    fs.writeFileSync(join(app.getPath('userData'), 'FirstRun'), 'FirstRun')
  }

  if (globalState.gameInstallDirectory.trim() !== '' && !PTCGLUtility.isPTCGLInstallDirectory(globalState.gameInstallDirectory)) {
    globalState.gameInstallDirectory = ''
    Config.store.set(Config.keys.gameInstallationDirectory, globalState.gameInstallDirectory)
  }

  updateGameServerPublisher(globalState, globalState.publishServerIdentifier)

  checkAppUpdate(globalState, import.meta.env.VITE_APP_UPDATE_URL ?? '')
  setInterval(checkAppUpdate.bind(this, globalState), 1000 * 60 * 60 * 4)

  app.on('activate', onActivate.bind(this))
  protocol.handle('app', handleAppProtocol)
  screen.on('display-metrics-changed', () => {
    BROWSER_WINDOWS?.main?.emit('moved')
  });
}).then(onActivate).catch((err) => {
  console.error(err)
  if (!err?.isSilent) {
    dialog.showMessageBoxSync({
      title: app.getName(),
      type: 'error',
      message: err.message,
    })
  }
  app.quit()
})

axios.defaults.headers['User-Agent'] = `${app.getName()}/${app.getVersion()}`
BepInExManager.setBepInExPackage({
  BepInEx: join(Paths.externalResources, 'BepInEx_5.4.22.0.zip'),
  OSXLoader: IS_MACOS_BUILD ? join(Paths.externalResources, 'BepInExOSXLoader/Tobey.BepInEx.Bootstrap.dll') : null,
  OSXLoaderCore: IS_MACOS_BUILD ? join(Paths.externalResources, 'BepInExOSXLoader/UnityEngine.CoreModule.dll') : null,
})
Menu.setApplicationMenu(null)

if (IS_WINDOWS_BUILD && import.meta.env.PROD && typeof process.env.LOCALAPPDATA === 'string') {
  try {
    const selfDirName = parsePath(dirname(app.getPath('exe'))).name
    const updaterDir = join(process.env.LOCALAPPDATA, `${selfDirName}-updater`);
    if (fs.existsSync(updaterDir)) {
      fs.rmSync(updaterDir, { recursive: true });
    }
  } catch (err) {
    console.error(err);
  }
}
