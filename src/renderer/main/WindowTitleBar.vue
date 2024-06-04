<script setup lang="ts">
import { Cog6ToothIcon, MinusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { PlayIcon } from '@heroicons/vue/24/solid'
import { ref, watch } from 'vue'
import { OFFICIAL_SERVER_IDENTIFIER } from '../../shared.constants.js'
import type { PublishServerItem } from '../../lib/PublishServers.js'

interface Emits {
  (e: 'addPublishServer'): void

  (e: 'deletePublishServer', server: PublishServerItem): void

  (e: 'selectPublishServer', server: PublishServerItem): void
}

interface Props {
  currentPublishServer: PublishServerItem | null
  publishServers: PublishServerItem[]
}

defineProps<Props>()
defineEmits<Emits>()

const showPublishServerList = ref(false)
const title = ref(document.title)

const about = window.app.about
const close = window.renderer.close
const minimize = window.renderer.minimize
const setting = window.app.settings

watch(showPublishServerList, (value) => {
  if (value) {
    document.body.addEventListener('click', () => {
      showPublishServerList.value = false
    }, { once: true })
  }
}, { deep: true })
</script>

<template>
  <header id="window-title-bar" class="bg-black bg-opacity-50 flex flex-row text-slate-100 w-full">
    <div class="drag flex flex-row h-full items-center ml-3">
      <img class="inline h-3/4" :src="'app://images/logo'" alt="icon">
      <p class="pl-2 pr-4 text-xl" v-text="title"></p>
      <div class="relative mb-1" v-if="currentPublishServer">
        <button
          class="no-drag flex flex-row font-bold h-full gap-0.5 items-center mt-1"
          @click.stop="showPublishServerList = !showPublishServerList"
        >
          <span v-text="currentPublishServer.name"></span>
          <play-icon class="inline rotate-90 size-4 opacity-80"></play-icon>
        </button>
        <div
          class="absolute mt-2 w-48 bg-white rounded-lg shadow shadow-slate-600 text-sm 2xl:text-base text-black z-20"
          v-show="showPublishServerList"
        >
          <ul class="divide-y divide-gray-300 max-h-[50vh] overflow-y-auto py-1 px-2">
            <li
              class="flex px-2 py-1.5"
              :class="currentPublishServer?.identifier === server.identifier ? 'font-bold' : ''"
              :title="server.name"
              role="option"
              v-for="server in publishServers"
            >
              <button
                class="flex-auto overflow-hidden text-left text-ellipsis whitespace-nowrap active:text-yellow-700 hover:text-yellow-500"
                :class="server.identifier === currentPublishServer.identifier ? 'font-bold' : ''"
                v-text="server.name"
                @click="$emit('selectPublishServer', server)"
              ></button>
              <button
                aria-label="删除"
                class="cursor-pointer h-full text-red-500"
                title="删除"
                v-if="server.identifier !== OFFICIAL_SERVER_IDENTIFIER"
                @click="$emit('deletePublishServer', server)"
              >
                <x-mark-icon class="size-5"></x-mark-icon>
              </button>
            </li>

            <li
              class="px-2 py-1.5"
              @click="showPublishServerList = false"
            >
              <button
                class="text-blue-500 active:text-blue-700 hover:text-blue-400"
                @click="$emit('addPublishServer')"
              >
                添加服务器
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="drag flex-auto h-full"></div>
    <div class="flex flex-row h-full items-center justify-end">
      <button
        class="aspect-square flex h-full items-center justify-center active:text-sky-500"
        title="关于"
        @click="about"
      >
        关于
      </button>
      <button
        aria-label="设置"
        class="aspect-square active:brightness-90 hover:bg-sky-600 flex h-full items-center justify-center"
        title="设置"
        @click="setting"
      >
        <cog6-tooth-icon class="size-3/5"></cog6-tooth-icon>
      </button>
      <button
        aria-label="最小化"
        class="aspect-square active:brightness-90 hover:bg-yellow-600 flex h-full items-center justify-center"
        title="最小化"
        @click="minimize"
      >
        <minus-icon class="size-3/4"></minus-icon>
      </button>
      <button
        aria-label="关闭"
        class="aspect-square active:brightness-90 hover:bg-red-600 flex h-full items-center justify-center"
        title="关闭"
        @click="close"
      >
        <x-mark-icon class="size-3/4"></x-mark-icon>
      </button>
    </div>
  </header>
</template>
