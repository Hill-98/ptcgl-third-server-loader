import { createApp } from 'vue'
import { danger } from '../Messages.js'
import PopupBox from '../PopupBox.js'
import * as App from '../IpcBinding/App.js'
import * as Game from '../IpcBinding/Game.js'
import * as IpcMessages from '../../IpcMessages.js'
import * as PTCGLUtility from '../IpcBinding/PTCGLUtility.js'
import type { CheckUpdateResult } from '../../lib/Updater.js'

import View from './View.vue'

import '../app.css'

const quitAlert = async (message: string) => {
  return PopupBox({
    confirmButton: '退出',
    id: 'exit-app',
    icon: 'error',
    priority: 2147483647,
    text: message,
  }).then(() => {
    window.app.quit()
  })
}

window.ipc.on(IpcMessages.app_onCheckAppUpdate, (_, result: CheckUpdateResult, err: Error) => {
  if (err) {
    danger({
      border: 'accent',
      content: `检查更新失败：${err.message}`,
      icon: true,
    }).catch(console.error)
    return
  }
  if (!result.updatable) {
    return
  }

  result.downloadUrl = 'https://mivm.cn';

  const timer = setInterval(() => {
    if (!document.querySelector('main')) {
      return
    }
    clearInterval(timer)
    PopupBox({
      confirmButton: '退出',
      html: `<p class="text-center">检测到新版本启动器，请更新至最新版本。</p>
  <div class="mt-2 mx-4 text-left">
  <p>更新日志：</p><pre class="font-sans">${result.changelog}</pre>
  </div>
<p class="mt-2 text-center ${result.downloadUrl ? '' : 'hidden'}">
<a class="link" href="${result.downloadUrl}" target="_blank" rel="external">下载地址</a>
</p>`,
      icon: 'info',
      id: 'check-update',
      priority: 2147483647,
    }).then(() => {
      window.app.quit()
    })
  }, 100)
})

const main = async function main () {
  if (!await PTCGLUtility.isAvailable()) {
    await quitAlert('PTCGL 实用工具不可用')
  }
  if (await Game.getInstallDirectory() === '') {
    const dir = await Game.detectInstallDirectory() ? await Game.getInstallDirectory() : null

    if (!IS_WINDOWS_BUILD && dir === null) {
      await quitAlert('未检测到 Pokémon TCG Live 安装目录，请检查游戏是否已安装，或者尝试重新安装。')
      return
    }
    if (IS_WINDOWS_BUILD && dir === null) {
      await PopupBox({
        icon: 'warning',
        text: '未检测到 Pokémon TCG Live 安装目录，请点击确定后手动选择安装目录。',
      })
    }

    let select = IS_WINDOWS_BUILD
    if (IS_WINDOWS_BUILD && dir) {
      const p = document.createElement('p')
      p.innerHTML = `已检测到 Pokémon TCG Live 安装目录：
<b><a class="link" href="open-path://dir/${encodeURIComponent(dir)}" target="_blank" title="打开此目录" rel="external">${dir}</a></b><br>
是否需要选择其他安装目录？`
      select = (await PopupBox({
        cancelButton: '否',
        confirmButton: '是',
        icon: 'info',
        html: p,
      })).confirmed
      p.remove()
    }

    if (select) {
      try {
        const result = await App.selectGameInstallDirectory()
        if (result === null) {
          window.app.quit()
          return
        }
        if (!result) {
          await quitAlert('你选择的不是 Pokémon TCG Live 安装目录')
          return
        }
      } catch (err: any) {
        await quitAlert(`选择 Pokémon TCG Live 安装目录发生错误：${err.message}`)
        return
      }
    }

    await App.storeGameInstallDirectory()
  }
}

main().then(() => {
  createApp(View).mount('#view')
}).catch((err) => {
  console.error(err)
  alert(`初始化过程发生错误：${err.message}`)
  window.app.quit()
})
