const { join } = require('node:path')

module.exports = {
  appId: 'github.hill98.ptcgl_third_server_loader',
  copyright: 'Copyright (c) 2024 Hill-98@GitHub',
  mac: {
    category: 'Games',
    target: 'zip',
  },
  win: {
    target: 'nsis',
  },
  nsis: {
    installerIcon: join(__dirname, 'resources/icons/app.ico'),
    installerHeaderIcon: join(__dirname, 'resources/icons/app.ico'),
    installerLanguages: ['en_US', 'zh_CN', 'zh_TW'],
    packElevateHelper: false,
    shortcutName: 'PTCGL 第三方服务器启动器',
  },
  publish: [],
}
