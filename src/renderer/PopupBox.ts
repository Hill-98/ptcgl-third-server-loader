export type PopupBoxIcons = 'error' | 'info' | 'success' | 'warning'

export interface PopupBoxOption {
  cancelButton?: boolean | string
  confirmButton?: boolean | string
  html?: string | HTMLElement
  icon?: PopupBoxIcons
  id?: string
  input: boolean
  priority?: number
  text?: string
  title?: string
}

export type PopupInputBoxOption = PopupBoxOption

export type PopupMessageBoxOption = Omit<PopupBoxOption, 'input'>

export interface PopupMessageBoxResult {
  cancelled: boolean
  confirmed: boolean
}

export interface PopupInputBoxCancelResult extends PopupMessageBoxResult {
  cancelled: true
  value: null
}

export interface PopupInputBoxConfirmResult extends PopupMessageBoxResult {
  confirmed: true
  value: string
}

const ICONS: { [key in PopupBoxIcons]: string } = {
  error: `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-24 text-red-400">
  <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd" />
  </svg>
  `,
  info: `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-24 text-blue-400">
  <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd" />
  </svg>
`,
  success: `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-24 text-green-400">
    <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" />
  </svg>
  `,
  warning: `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-24 text-yellow-400">
  <path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd" />
  </svg>
  `,
}

const POPUP_BOX_TEMPLATE = `
<div class="absolute bg-black bg-opacity-40 flex items-center justify-center h-[100vh] w-[100vw] inset-0" data-popup-box="true">
<div
  class="backdrop-blur-md bg-white bg-opacity-75 max-h-[75%] p-7 rounded-md shadow shadow-slate-700 text-slate-800 w-[512px]"
  role="dialog"
  tabindex="-1"
>
<h1 class="font-bold pb-2 text-2xl text-center" data-slot="title"></h1>
<div class="flex justify-center" data-slot="icon"></div>
<div class="pt-2" data-slot="content"></div>
<div class="pt-4" data-slot="input">
<input autocomplete="off" autofocus class="bg-white p-2.5 rounded-md text-black w-full" placeholder="" type="text">
</div>
<div class="flex gap-4 justify-center pt-5" data-slot="footer">
<button
  class="text-white bg-blue-500 hover:bg-blue-700 font-medium rounded-lg text-sm px-6 py-2.5 active:brightness-90 focus:outline-none"
  data-action="confirm"
  type="button"
></button>
<button
  class="text-white bg-red-500 hover:bg-red-700 font-medium rounded-lg text-sm px-6 py-2.5 active:brightness-90 focus:outline-none"
  data-action="cancel"
  type="button"
></button>
</div>
<button
  data-action="destroy"
  hidden="hidden"
  type="button"
></button>
<div>
</div>
`

const getId = function getPopupBoxId (id: string) {
  return `popup-box-${id}`
}

export const close = function closePopupBox (id: string) {
  (document.getElementById(getId(id))?.querySelector('button[data-action=destroy]') as HTMLButtonElement)?.click()
}

function showPopupBox (text: string, title?: string, icon?: PopupBoxIcons): Promise<PopupMessageBoxResult>
function showPopupBox (options: PopupInputBoxOption): Promise<PopupInputBoxCancelResult | PopupInputBoxConfirmResult>
function showPopupBox (options: PopupMessageBoxOption): Promise<PopupMessageBoxResult>
function showPopupBox (text: string | PopupInputBoxOption | PopupMessageBoxOption, title?: string, icon?: PopupBoxIcons): Promise<PopupInputBoxCancelResult | PopupInputBoxConfirmResult | PopupMessageBoxResult> {
  const opt: PopupBoxOption = {
    confirmButton: true,
    input: false,
    icon,
    title,
    ...(typeof text === 'string' ? { text } : text),
  }

  if (opt.input && typeof opt.cancelButton === 'undefined') {
    opt.cancelButton = true
  }

  const container = Object.assign(document.createElement('template'), { innerHTML: POPUP_BOX_TEMPLATE }).content.firstElementChild as HTMLDivElement
  const popupBox = container.querySelector('div') as HTMLDivElement
  const contentSlot = popupBox.querySelector('div[data-slot=content]') as HTMLDivElement
  const inputSlot = popupBox.querySelector('div[data-slot=input]') as HTMLDivElement
  const footerSlot = popupBox.querySelector('div[data-slot=footer]') as HTMLDivElement
  const iconSlot = popupBox.querySelector('div[data-slot=icon]') as HTMLDivElement
  const titleSlot = popupBox.querySelector('h1[data-slot=title]') as HTMLHeadingElement
  const cancelButton = popupBox.querySelector('button[data-action=cancel]') as HTMLButtonElement
  const confirmButton = popupBox.querySelector('button[data-action=confirm]') as HTMLButtonElement
  const destroyButton = popupBox.querySelector('button[data-action=destroy]') as HTMLButtonElement
  const inputBox = inputSlot.querySelector('input') as HTMLInputElement

  if (opt.id) {
    close(opt.id)
    container.id = getId(opt.id)
  }

  if (opt.icon) {
    iconSlot.innerHTML = ICONS[opt.icon]
  } else {
    iconSlot.remove()
  }

  if (opt.title) {
    titleSlot.textContent = opt.title
  } else {
    titleSlot.remove()
  }

  if (opt.html) {
    if (typeof opt.html === 'string') {
      contentSlot.innerHTML = opt.html
    } else {
      contentSlot.append(opt.html)
    }
  } else if (opt.text) {
    const p = document.createElement('p')
    p.classList.add('text-center')
    p.textContent = opt.text
    p.innerHTML = p.innerHTML.replaceAll('\n', '<br>')
    contentSlot.append(p)
  } else {
    contentSlot.remove()
  }

  if (!opt.input) {
    inputSlot.remove()
  }

  if (opt.cancelButton) {
    cancelButton.textContent = typeof opt.cancelButton === 'string' ? opt.cancelButton : '取消'
  } else {
    cancelButton.remove()
  }

  if (opt.confirmButton) {
    confirmButton.textContent = typeof opt.confirmButton === 'string' ? opt.confirmButton : '确定'
  } else {
    confirmButton.remove()
  }

  if (!opt.cancelButton && !opt.confirmButton) {
    footerSlot.remove()
  }

  container.style.zIndex = opt.priority?.toString() ?? '1'
  popupBox.classList.add('ease-in-out', 'duration-300')
  popupBox.classList.add('scale-50')
  document.body.append(container)
  setTimeout(popupBox.classList.remove.bind(popupBox.classList, 'scale-50'), 10)
  if (opt.input) {
    setTimeout(inputBox.focus.bind(inputBox), 500)
  }

  const p = new Promise<PopupInputBoxCancelResult | PopupInputBoxConfirmResult | PopupMessageBoxResult>((resolve, reject) => {
    const result = {
      cancelled: false,
      confirmed: false,
    }
    cancelButton.addEventListener('click', () => {
      result.cancelled = true
      resolve(Object.assign(result, opt.input ? {
        value: null,
      } : Object.create(null)))
    }, { once: true })
    confirmButton.addEventListener('click', () => {
      result.confirmed = true
      resolve(Object.assign(result, opt.input ? {
        value: inputBox.value,
      } : Object.create(null)))
    }, { once: true })
    destroyButton.addEventListener('click', () => {
      reject(new Error('PopupBox destroyed'))
    }, { once: true })
  })

  p.finally(() => {
    container.classList.add('ease-in-out', 'duration-100')
    setTimeout(container.classList.add.bind(popupBox.classList, 'bg-opacity-0', 'scale-0'))
    setTimeout(container.remove.bind(container), 150)
  })

  return p
}

export const show = showPopupBox

export default show
