<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { ref } from 'vue'

interface Emits {
  (e: 'cancel'): void

  (e: 'confirm', name: string, url: string): void
}

defineEmits<Emits>()

const name = ref('')
const url = ref('')
</script>

<template>
  <div class="absolute bg-black bg-opacity-40 h-[100vh] w-[100vw] inset-0">
    <div
      class="[&>div]:py-5 bg-white divide-y mx-auto mt-16 px-5 rounded-md shadow shadow-slate-700 text-black max-h-[75vh] w-3/5 lg:w-1/2"
      role="dialog"
    >
      <div class="flex items-center">
        <h1 class="flex-auto text-xl">添加发布服务器</h1>
        <button aria-label="关闭" class="hover:bg-gray-200 active:brightness-90 p-1 text-gray-600 rounded-full" title="关闭" @click="$emit('cancel')">
          <x-mark-icon class="size-6"></x-mark-icon>
        </button>
      </div>
      <div class="flex flex-col gap-3">
        <div>
          <label for="name" class="block mb-2 ml-1 text-sm text-gray-900">
            名称 <span class="text-red-500">*</span>
          </label>
          <input
            id="name"
            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="服务器名称"
            required
            v-model="name"
          />
        </div>
        <div>
          <label for="name" class="block mb-2 ml-1 text-sm text-gray-900">
            链接 <span class="text-red-500">*</span>
          </label>
          <input
            id="name"
            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="服务器发布链接"
            required
            v-model="url"
          />
        </div>
      </div>
      <div class="flex gap-4 justify-end">
        <button
          class="bg-blue-500 font-medium px-5 py-2.5 rounded-lg text-sm text-white w-24 active:brightness-90 hover:bg-blue-600"
          @click="$emit('confirm', name, url)"
        >确定
        </button>
        <button
          class="border border-gray-400 font-medium px-5 py-2.5 rounded-lg text-sm text-black w-24 active:brightness-90 hover:bg-gray-200"
          @click="$emit('cancel')"
        >取消
        </button>
      </div>
    </div>
  </div>
</template>
