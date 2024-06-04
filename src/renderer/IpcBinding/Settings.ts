import * as IpcMessages from '../../IpcMessages.js'
import type { Configuration } from '../../Configuration.js'

export const fixBuiltinBrowserError = (value?: Configuration['fixBuiltinBrowserError']) => window.ipc.invoke<boolean | undefined>(IpcMessages.settings_fixBuiltinBrowserError, value)

export const unlockAllBeautifyDesks = (value?: Configuration['unlockAllBeautifyDesks']) => window.ipc.invoke<boolean | undefined>(IpcMessages.settings_unlockAllBeautifyDesks, value)
