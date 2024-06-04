import { screen } from 'electron'

export interface DynamicWindowSizeOption {
  default: Electron.Size
  hd: Electron.Size
  fhd: Electron.Size
  qhd: Electron.Size
}

export default function DynamicWindowSize (option: DynamicWindowSizeOption, bounds?: Electron.Rectangle): Electron.Size {
  const display = bounds ? screen.getDisplayMatching(bounds) : screen.getPrimaryDisplay()
  const screenWidth = Math.floor(display.size.width * display.scaleFactor)
  const screenHeight = Math.floor(display.size.height * display.scaleFactor)

  let size = {
    width: Math.ceil(option.default.width / display.scaleFactor),
    height: Math.ceil(option.default.height / display.scaleFactor),
  }

  if (screenWidth >= 3800 && screenHeight >= 2100) { // 2160P
    size = {
      width: Math.ceil(option.qhd.width / display.scaleFactor),
      height: Math.ceil(option.qhd.height / display.scaleFactor),
    }
  } else if (screenWidth >= 1900 && screenHeight >= 1000) { // 1080P
    size = {
      width: Math.ceil(option.fhd.width / display.scaleFactor),
      height: Math.ceil(option.fhd.height / display.scaleFactor),
    }
  } else if (screenWidth >= 1200 && screenWidth >= 700) { // 720P
    size = {
      width: Math.ceil(option.hd.width / display.scaleFactor),
      height: Math.ceil(option.hd.height / display.scaleFactor),
    }
  }

  return size
}
