/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ADS_URL?: string
  readonly VITE_APP_UPDATE_URL?: string
  readonly VITE_VUE_DEVTOOLS_PATH?: string
  readonly VITE_TERMS_OF_USE_LATEST_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const BUILD_PLATFORM: 'darwin' | 'win32'
declare const IS_MACOS_BUILD: boolean
declare const IS_WINDOWS_BUILD: boolean
declare const MAIN_APP_PATH: string
declare const RENDERER_PKG: Record<'name' | 'productName' | 'version' | 'homepage', string>
