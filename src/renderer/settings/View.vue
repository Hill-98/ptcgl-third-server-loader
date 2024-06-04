<script setup lang="ts">
import { InformationCircleIcon } from '@heroicons/vue/24/solid/index.js'
import { onMounted, ref, watch } from 'vue'
import PopupBox from '../PopupBox.js'
import * as app from '../IpcBinding/App.js'
import * as game from '../IpcBinding/Game.js'
import * as settings from '../IpcBinding/Settings.js'

// noinspection PointlessBooleanExpressionJS
const isWindows = !!IS_WINDOWS_BUILD // This allows ESBuild(?) to clean up dead code (why?)

const fixBuiltinBrowserError = ref(false)
const gameInstallDirectory = ref('')
const unlockAllBeautifyDesks = ref(false)

const clearBuiltinBrowserCache = async () => {
  try {
    await game.clearBuiltinBrowserCache()
    await PopupBox('游戏内置浏览器缓存清除完成。', undefined, 'info')
  } catch (err: any) {
    await PopupBox(`清除游戏内置浏览器缓存时发生错误：${err.message}`, undefined, 'error')
  }
}

const selectGameInstallDirectory = async () => {
  try {
    if (await app.selectGameInstallDirectory() === false) {
      await PopupBox('你选择的不是 Pokémon TCG Live 安装目录', undefined, 'error')
    }
  } catch (err: any) {
    await PopupBox(`选择 Pokémon TCG Live 安装目录发生错误：${err.message}`, undefined, 'error')
  }
  await app.storeGameInstallDirectory()
  gameInstallDirectory.value = await game.getInstallDirectory()
}

watch(fixBuiltinBrowserError, settings.fixBuiltinBrowserError)

watch(unlockAllBeautifyDesks, settings.unlockAllBeautifyDesks)

onMounted(async () => {
  fixBuiltinBrowserError.value = !!(await settings.fixBuiltinBrowserError())
  gameInstallDirectory.value = await game.getInstallDirectory()
  unlockAllBeautifyDesks.value = !!(await settings.unlockAllBeautifyDesks())
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="isWindows">
      <label for="game-install-directory" class="block mb-2 ml-1 text-sm">
        游戏安装路径
      </label>
      <div class="flex flex-row gap-2">
        <input
          id="game-install-directory"
          class="bg-gray-50 border border-gray-600 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          readonly
          tabindex="-1"
          :value="gameInstallDirectory"
        />
        <button
          class="bg-blue-500 font-medium px-5 py-2.5 rounded-lg text-sm text-white w-24 active:brightness-90 hover:bg-blue-600"
          @click="selectGameInstallDirectory"
        >
          选择
        </button>
      </div>
    </div>
    <div>
      <div class="flex flex-row items-center">
        <input
          id="unlock-all-beautify-desks"
          type="checkbox"
          class="size-5 text-blue-600"
          :checked="unlockAllBeautifyDesks"
          @click="unlockAllBeautifyDesks = !unlockAllBeautifyDesks"
        >
        <label for="unlock-all-beautify-desks" class="ms-2">
          强制解锁所有卡组装扮
        </label>
      </div>
      <p class="mt-2 text-gray-600 text-xs">
        <information-circle-icon class="inline pb-0.5 size-5"></information-circle-icon>
        仅在使用第三方服务器启动游戏时生效。
      </p>
    </div>
    <div>
      <div class="flex flex-row items-center">
        <input
          id="fix-builtin-browser-error"
          type="checkbox"
          class="size-5 text-blue-600"
          :checked="fixBuiltinBrowserError"
          @click="fixBuiltinBrowserError = !fixBuiltinBrowserError"
        >
        <label for="fix-builtin-browser-error" class="ms-2">
          修复游戏内置浏览器错误
        </label>
      </div>
      <p class="mt-2 text-gray-600 text-xs">
        <information-circle-icon class="inline pb-0.5 size-5"></information-circle-icon>
        尝试修复游戏内置浏览器的一些错误，有助于解决登录界面加载时出现的 “ERROR 15” 错误。
      </p>
    </div>
    <div v-if="isWindows">
      <button
        class="bg-blue-500 font-medium px-5 py-2.5 rounded-lg text-sm text-white active:brightness-90 hover:bg-blue-600"
        @click="clearBuiltinBrowserCache"
      >
        清除游戏内置浏览器缓存
      </button>
      <p class="mt-2 text-gray-600 text-xs">
        <information-circle-icon class="inline pb-0.5 size-5"></information-circle-icon>
        清除游戏内置浏览器缓存，有助于解决登录界面加载时出现的 “ERROR 15” 错误。
        <br>
        （推荐启用 [修复内置浏览器错误] 后使用）
      </p>
    </div>
  </div>
</template>
