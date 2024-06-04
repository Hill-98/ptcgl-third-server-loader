import * as IpcMessages from '../../IpcMessages.js'

export const isAvailable = () => window.ipc.invoke<boolean>(IpcMessages.PTCGLUtility_isAvailable)
