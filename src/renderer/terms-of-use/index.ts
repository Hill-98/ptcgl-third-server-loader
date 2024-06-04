import { createApp } from 'vue'
import * as IpcMessages from '../../IpcMessages.js'

import '../app.css'

const ms = import.meta.glob('./View.*.vue')
if ('./View.local.vue' in ms) {
  const m = await ms['./View.local.vue']()
  // @ts-ignore
  createApp(m.default).mount('#view')
  window.addEventListener('beforeunload', () => {
    window.ipc.send(IpcMessages.termsOfUse, false)
  })
} else {
  window.ipc.send(IpcMessages.termsOfUse, true)
}
