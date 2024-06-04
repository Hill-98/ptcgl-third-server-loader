<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { UserCircleIcon, UserIcon } from '@heroicons/vue/24/solid'
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { DEFAULT_ACCOUNT_TARGET } from '../../shared.constants.js'
import * as App from '../IpcBinding/App.js'
import * as Game from '../IpcBinding/Game.js'
import * as GameServer from '../IpcBinding/GameServer.js'
import * as PlayAccounts from '../IpcBinding/PlayAccounts.js'
import * as PopupBox from '../PopupBox.js'
import * as PublishServers from '../IpcBinding/PublishServers.js'
import type { GameServerNews, ServerItem } from '../../lib/GameServerPublisher.js'
import { PlayAccount } from '../../lib/PlayAccounts.js'
import type { PublishServerItem } from '../../lib/PublishServers.js'

import AddPublishServerModal from './AddPublishServerModal.vue'
import WindowTitleBar from './WindowTitleBar.vue'

interface ShowState {
  addPublishServer: boolean
  gameServerList: boolean
  playAccountList: boolean
}

const DEFAULT_PLAY_ACCOUNT = {
  identifier: DEFAULT_ACCOUNT_TARGET,
  name: '默认账号',
}

const AdsGallery = defineAsyncComponent({
  // @ts-ignore
  loader: async () => {
    const ms = import.meta.glob('./*.local.vue')
    return './AdsGallery.local.vue' in ms ? ms['./AdsGallery.local.vue']() : Promise.reject()
  },
  timeout: 3000,
})

const gameServers = ref<ServerItem[]>([])
const gameServerNews = ref<GameServerNews | null>(null)
const gameServerAccount = ref<string>(DEFAULT_ACCOUNT_TARGET)
const gameServersInitializing = computed(() => gameServers.value.length === 0)
const playAccounts = ref<PlayAccount[]>([DEFAULT_PLAY_ACCOUNT])
const publishServer = ref<PublishServerItem | null>(null)
const publishServers = ref<PublishServerItem[]>([])
const selectedServer = ref<ServerItem | null>(null)
const showState = ref<ShowState>({
  addPublishServer: false,
  gameServerList: false,
  playAccountList: false,
})

const reloadAlert = (message: string, cb: () => void) => {
  PopupBox.show({
    id: 'reload',
    confirmButton: '重新加载',
    icon: 'error',
    text: message,
  }).then(() => {
    cb()
  })
}

const getGameServers = async (quiet: boolean = false) => {
  const fetchPublishServer = publishServer.value
  let error: any = null
  let list: ServerItem[] = []
  try {
    list = await GameServer.servers()
  } catch (err: any) {
    error = err
  }
  if (fetchPublishServer !== publishServer.value) {
    return
  }
  if (error) {
    if (!quiet) {
      reloadAlert(`获取游戏服务器列表时发生错误：${error.message}\n${publishServer.value?.url}`, fetchData)
    }
    throw error
  }
  gameServers.value = list
  if (list.length > 0) {
    GameServer.getSelectedServer().then((s) => {
      selectedServer.value = list.find((server) => server.identifier === s) ?? null
      return selectedServer.value !== null ? Promise.resolve() : Promise.reject(new Error('select default'))
    }).catch((err) => {
      console.error(err)
      selectedServer.value = list[0]
    })
  }
}

const fetchAccounts = () => {
  PlayAccounts.list().then((accounts) => {
    playAccounts.value = [
      DEFAULT_PLAY_ACCOUNT,
      ...accounts,
    ]
  })
}

const fetchData = () => {
  gameServers.value = []
  selectedServer.value = null
  PublishServers.list().then((list) => {
    publishServers.value = list
    return App.getPublishServer()
  }).then((result) => {
    publishServer.value = result
  }).catch((err) => {
    reloadAlert(`获取发布服务器时发生错误：${err.message}`, fetchData)
  }).then(() => {
    getGameServers()
    GameServer.news().then((news) => {
      gameServerNews.value = news
    })
    GameServer.getPlayAccount().then((identifier) => {
      gameServerAccount.value = identifier ?? DEFAULT_ACCOUNT_TARGET
    })
  })
}

const addPlayAccount = async () => {
  showState.value.playAccountList = false
  const name = await PopupBox.show({
    input: true,
    text: '请输入账号槽位名称 (此名称仅用于标识作用)',
    title: '添加账号',
  })
  if (name.value) {
    await PlayAccounts.add(name.value)
  }
  await PopupBox.show('账号槽位添加完成，选择不同的账号槽位启动游戏登录账号即可。')
  fetchAccounts()
}

const addPublishServer = (name: string, url: string) => {
  showState.value.addPublishServer = false

  if (name?.trim() === '' || url?.trim() === '') {
    PopupBox.show({
      id: 'addPublishServer',
      icon: 'error',
      text: '发布服务器信息填写不完整，拒绝添加。',
    })
    return
  }
  const u = url.trim()
  if (!URL.canParse(u) || !u.match(/^https?:/)) {
    PopupBox.show({
      id: 'addPublishServer',
      icon: 'error',
      text: '发布服务器链接格式错误，拒绝添加。',
    })
    return
  }
  PublishServers.add({
    name,
    url: u,
  }).then(fetchData).catch((err) => {
    PopupBox.show({
      id: 'addPublishServer',
      icon: 'error',
      text: `发布服务器添加失败：${err.message}`,
    })
  })
}

const removePlayAccount = async (identifier: string) => {
  await PlayAccounts.remove(identifier)
  fetchAccounts()
}

const removePublishServer = async (server: PublishServerItem) => {
  const result = await PopupBox.show({
    id: 'deletePublishServer',
    cancelButton: true,
    icon: 'warning',
    priority: 10,
    text: `你确定要删除发布服务器 ${server.name} 吗？`,
  })
  if (result.confirmed) {
    try {
      await PublishServers.remove(server.identifier)
      selectGameServer()
    } catch (err: any) {
      await PopupBox.show({
        id: 'deletePublishServer',
        icon: 'error',
        text: `删除发布服务器时发生错误：${err.message}`,
      })
    }
  }
}

const selectGameServer = (server?: PublishServerItem) => {
  PopupBox.close('reload')
  gameServers.value = []
  gameServerNews.value = null
  App.selectPublishServer(server?.identifier)
  fetchData()
}

const startGame = async () => {
  const server = selectedServer.value
  if (!server) {
    return
  }

  if (await Game.isRunning()) {
    await PopupBox.show({
      id: 'startGame',
      icon: 'warning',
      text: '检测到 Pokémon TCG Live 正在运行，请关闭游戏后重试。',
    })
    return
  }

  try {
    await GameServer.setPlayAccount(playAccount.value.identifier)
    await GameServer.setSelectedServer(server.identifier)
  } catch { }

  const players = server.playerCount ?? 0
  const playersLimit = server.playerCountLimit ?? Infinity
  if (players >= playersLimit) {
    await PopupBox.show({
      id: 'startGame',
      icon: 'warning',
      text: `${server.name} 服务器玩家数量已达到上限 (${playersLimit})，请选择其他游戏服务器。`,
    })
    await getGameServers(true)
    return
  } else {
    try {
      await Game.start(server.identifier, playAccount.value.identifier)
      await window.renderer.close()
    } catch (err: any) {
      await PopupBox.show({
        id: 'startGame',
        icon: 'error',
        text: `启动游戏时发生错误：${err.message}`,
      })
    }
  }
}

const playAccount = computed(() => playAccounts.value.find((a) => a.identifier === gameServerAccount.value) ?? DEFAULT_PLAY_ACCOUNT)

watch(showState, () => {
  const triggerKeys: (keyof ShowState)[] = ['gameServerList', 'playAccountList']
  triggerKeys.forEach((key) => {
    if (showState.value[key]) {
      document.body.addEventListener('click', () => {
        showState.value[key] = false
      }, { once: true })
    }
  });
}, { deep: true })

onMounted(() => {
  fetchAccounts()
  fetchData()
  setInterval(fetchData, 1000 * 60 * 10)
})
</script>

<template>
  <window-title-bar
    class="fixed top-0 left-0 h-8 md:h-10 xl:h-12 z-[2147483]"
    :current-publish-server="publishServer"
    :publish-servers="publishServers"
    @add-publish-server="showState.addPublishServer = true"
    @delete-publish-server="removePublishServer"
    @select-publish-server="selectGameServer"
  ></window-title-bar>
  <main
    class="flex flex-row h-full pt-8 md:pt-10 xl:pt-12">
    <div class="basis-8/12">
      <ads-gallery class="aspect-video backdrop-blur-md ml-[5%] mt-[7%] text-white"></ads-gallery>
    </div>
    <div class="basis-4/12 flex flex-col">
      <div class="h-[9%] relative">
        <button
          class="absolute backdrop-blur-xl bg-white bg-opacity-30 py-1 px-3 rounded-md right-8 shadow shadow-slate-600 top-1 lg:top-2 xl:top-3 2xl:top-4 font-bold text-xs lg:text-base text-white"
          @click.stop="showState.playAccountList = !showState.playAccountList"
        >
          <user-circle-icon class="inline mb-0.5 size-4 lg:size-5"></user-circle-icon>
          {{ playAccount.name }}
        </button>
        <div
          class="absolute top-14 right-8 w-4/12 bg-white rounded-lg shadow-md shadow-gray-600 text-sm text-black z-20"
          v-show="showState.playAccountList"
        >
          <ul class="divide-y max-h-[50vh] overflow-y-auto py-1 scrollbar">
            <li
              class="flex flex-row px-2 py-1.5"
              :title="account.name"
              role="option"
              v-for="account in playAccounts"
            >
              <button
                class="flex-auto overflow-hidden text-left text-ellipsis whitespace-nowrap active:text-green-700 hover:text-green-500"
                :class="account.identifier === playAccount.identifier ? 'font-bold' : ''"
                v-text="account.name"
                @click="gameServerAccount = account.identifier"
              ></button>
              <button
                aria-label="删除"
                class="cursor-pointer h-full text-red-500"
                title="删除"
                v-if="account.identifier !== DEFAULT_ACCOUNT_TARGET"
                @click="removePlayAccount(account.identifier)"
              >
                <x-mark-icon class="size-5"></x-mark-icon>
              </button>
            </li>
            <li
              class="cursor-pointer px-2 py-1.5 text-blue-400 active:text-blue-700 hover:text-blue-500"
              @click="addPlayAccount"
            >
              添加账号
            </li>
          </ul>
        </div>
      </div>
      <div
        class="backdrop-blur-md bg-white bg-opacity-85 flex flex-auto flex-col mx-8 mb-4 rounded-md text-black text-sm 2xl:text-base"
        :class="showState.gameServerList ? 'opacity-15' : ''"
        v-if="gameServerNews?.type === 'text' && gameServerNews.content.trim() !== ''"
      >
        <div class="bg-white bg-opacity-30 font-bold py-1 text-center text-lg">服务器公告</div>
        <textarea
          class="bg-transparent font-sans overflow-y-auto px-4 py-2 resize-none scrollbar select-text flex-auto"
          contenteditable="true"
          readonly
          :value="gameServerNews.content"
        ></textarea>
      </div>
      <div class="flex-auto" v-else></div>
      <div class="flex flex-col w-full justify-end items-center pb-[8vh]">
        <div class="relative flex flex-col items-center w-full">
          <div
            class="absolute bottom-14 w-12/12 lg:w-8/12 xl:w-6/12 backdrop-blur-md bg-black bg-opacity-75 rounded-lg shadow shadow-slate-600 text-sm 2xl:text-base text-white z-20"
            v-show="showState.gameServerList"
          >
            <ul class="max-h-[50vh] overflow-y-auto py-2 scrollbar">
              <li
                class="cursor-pointer grid grid-cols-12 px-2 py-1.5 active:text-pink-700 hover:text-pink-500"
                :class="selectedServer?.identifier === server.identifier ? 'font-bold' : ''"
                :title="server.name"
                role="option"
                @click="selectedServer = server"
                v-for="server in gameServers"
              >
                <span
                  class="col-span-8 overflow-hidden text-center text-ellipsis whitespace-nowrap"
                  v-text="server.name"
                ></span>
                <span aria-label="在线玩家数量" class="col-span-4 pl-4" v-if="typeof server?.playerCount === 'number'">
                  <user-icon class="inline mb-0.5 size-4"></user-icon> {{ server.playerCount }}
              </span>
              </li>
            </ul>
          </div>
          <button
            class="backdrop-blur-md flex gap-2 items-center justify-center mb-4 px-2 md:px-4 py-0.5 md:py-1 rounded-full text-sm lg:text-xl text-white"
            :disabled="gameServersInitializing"
            @click.stop="showState.gameServerList = !showState.gameServerList"
          >
            <svg
              class="animate-spin p-1 size-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
              viewBox="0 0 24 24"
              v-if="gameServersInitializing"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <template v-else>
              <span v-text="selectedServer?.name"></span>
              <span aria-label="在线玩家数量" v-if="typeof selectedServer?.playerCount === 'number'">
                  <user-icon class="inline mb-0.5 size-5"></user-icon> {{ selectedServer.playerCount }}
                </span>
            </template>
          </button>
        </div>
        <button
          class="bg-gradient-to-br from-blue-300 to-yellow-200 font-bold h-16 lg:h-20 2xl:h-24 w-[55%] rounded-2xl text-gray-800 text-lg lg:text-2xl enabled:active:brightness-90 focus:ring-0 hover:bg-gradient-to-l"
          :disabled="!selectedServer"
          @click="startGame"
        >
          <span>启 动 游 戏</span>
        </button>
      </div>
    </div>
  </main>
  <add-publish-server-modal
    @cancel="showState.addPublishServer = false"
    @confirm="addPublishServer"
    v-if="showState.addPublishServer"
  ></add-publish-server-modal>
</template>
