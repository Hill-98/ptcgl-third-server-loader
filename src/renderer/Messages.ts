export type AlertTypes = 'danger' | 'dark' | 'info' | 'success' | 'warning'

export interface AlertOption {
  border?: 'accent' | boolean
  closeButton?: boolean
  content: string | HTMLElement
  icon?: boolean
  time?: number
  type?: AlertTypes
}

const CONTAINER_ID = `message-container-${Math.random().toString().replace('.', '').substring(0, 4)}`
const CLOSE_ICON_SVG = `
  <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
  </svg>
`
const INFO_ICON_SVG = `
<svg class="flex-shrink-0 inline w-4 h-4 me-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
  <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
</svg>
`
const MESSAGES_COLOR_CLASS: { [name in AlertTypes]: string } = {
  danger: 'bg-red-50 text-red-800 dark:bg-gray-800 dark:text-red-400',
  dark: 'bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  info: 'bg-blue-50 text-blue-800 dark:bg-gray-800 dark:text-blue-400',
  success: 'bg-green-50 text-green-800 dark:bg-gray-800 dark:text-green-400',
  warning: 'bg-yellow-50 text-yellow-800 dark:bg-gray-800 dark:text-yellow-300',
}
const MESSAGES_COLOR_BORDER_CLASS: { [name in AlertTypes]: string } = {
  danger: 'border-red-300 dark:border-red-800',
  dark: 'border-gray-300 dark:border-gray-600',
  info: 'border-blue-300 dark:border-blue-800',
  success: 'border-green-300 dark:border-green-800',
  warning: 'border-yellow-300 dark:border-yellow-800',
}
const MESSAGES_COLOR_CLOSE_BUTTON_CLASS: { [name in AlertTypes]: string } = {
  danger: 'bg-red-50 text-red-500 focus:ring-red-400 hover:bg-red-200 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700',
  dark: 'bg-gray-50 text-gray-500 focus:ring-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white',
  info: 'bg-blue-50 text-blue-500 focus:ring-blue-400 hover:bg-blue-200  dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700',
  success: 'bg-green-50 text-green-500 focus:ring-green-400 hover:bg-green-200 dark:bg-gray-800 dark:text-green-400 dark:hover:bg-gray-700',
  warning: 'bg-yellow-50 text-yellow-500 focus:ring-yellow-400 hover:bg-yellow-200 dark:bg-gray-800 dark:text-yellow-300 dark:hover:bg-gray-700',
}

const createMessages = function createMessages (option: AlertOption) {
  const container = document.createElement('div')
  container.role = 'alert'
  container.classList.add('flex', 'items-center', 'p-4', 'rounded-lg', 'text-sm')
  container.classList.add(...MESSAGES_COLOR_CLASS[option.type ?? 'info'].split(' '))
  if (option.border) {
    container.classList.add(...MESSAGES_COLOR_BORDER_CLASS[option.type ?? 'info'].split(' '))
    container.classList.add(option.border === 'accent' ? 'border-t-4' : 'border')
  }
  if (option.icon) {
    container.innerHTML += INFO_ICON_SVG
    container.innerHTML += `<span class="sr-only">Info</span>`
  }
  if (typeof option.content === 'string') {
    container.innerHTML += `<div>${option.content}</div>`
  } else {
    container.append(option.content)
  }
  if (option.closeButton) {
    const button = document.createElement('button')
    button.classList.add('ms-auto', '-m-1.5', 'rounded-lg', 'focus:ring-2', 'p-1.5', 'inline-flex', 'items-center', 'justify-center', 'size-8')
    container.classList.add(...MESSAGES_COLOR_CLOSE_BUTTON_CLASS[option.type ?? 'info'].split(' '))
    button.setAttribute('aria-label', 'Close')
    button.setAttribute('data-action', 'close')
    button.type = 'button'
    button.innerHTML += CLOSE_ICON_SVG
    button.innerHTML += `<span class="sr-only">Close</span>`
    container.append(button)
  }
  return container
}

const createContainer = function createContainer () {
  let container = document.getElementById(CONTAINER_ID)
  if (!container) {
    container = document.createElement('div')
    container.className = 'fixed flex flex-col gap-2 items-center left-0 top-12 text-white w-full [z-index:99999999]'
    container.id = CONTAINER_ID
    document.body.append(container)
  }
  return container
}

function showMessage (message: string): Promise<boolean>
function showMessage (options: AlertOption): Promise<boolean>
function showMessage (option: string | AlertOption): Promise<boolean> {
  const opt = {
    time: 5,
    ...(typeof option === 'string' ? { content: option } : option),
  }
  return new Promise<boolean>((resolve) => {
    const alert = createMessages(opt)
    const animationTime = 600
    const container = createContainer()
    const closeButton = alert.querySelector('button[data-action=close]')
    const startTime = Date.now() - animationTime / 2
    alert.classList.add('opacity-0')
    alert.classList.add('ease-in-out', 'duration-300', 'transition')
    setTimeout(() => {
      alert.classList.remove('opacity-0')
    })
    if (opt.time > 0) {
      const timerCallback = () => {
        if (Date.now() - startTime < opt.time * 1000) {
          return
        }
        clearInterval(timer)
        setTimeout(() => {
          alert.classList.add('opacity-0')
        })
        setTimeout(() => {
          alert.remove()
          resolve(false)
        }, 300)
      }
      let timer = setInterval(timerCallback, 10)
      alert.addEventListener('mouseenter', () => {
        clearInterval(timer)
      })
      alert.addEventListener('mouseleave', () => {
        timer = setInterval(timerCallback, 10)
      })
      closeButton?.addEventListener('click', () => {
        clearInterval(timer)
      })
    }
    closeButton?.addEventListener('click', () => {
      alert.remove()
      resolve(true)
    })
    container.append(alert)
  })
}

export const show = showMessage

export const danger = (option: string | AlertOption) => show({
  ...(typeof option === 'string' ? { content: option } : option),
  type: 'danger',
})

export const dark = (option: string | AlertOption) => show({
  ...(typeof option === 'string' ? { content: option } : option),
  type: 'dark',
})

export const info = (option: string | AlertOption) => show({
  ...(typeof option === 'string' ? { content: option } : option),
  type: 'info',
})

export const success = (option: string | AlertOption) => show({
  ...(typeof option === 'string' ? { content: option } : option),
  type: 'success',
})

export const warning = (option: string | AlertOption) => show({
  ...(typeof option === 'string' ? { content: option } : option),
  type: 'warning',
})
