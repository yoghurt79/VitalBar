import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Notification, Tray } from 'electron'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { LocalStore } from './store'
import type { UserSettings } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let store: LocalStore
let activeUserId: number | null = null
let quitting = false
const notified = new Set<string>()

const assetPath = (name: string) => join(app.isPackaged ? process.resourcesPath : join(__dirname, '../..'), 'assets', name)

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1160,
    minHeight: 720,
    show: false,
    title: '元气条',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#081e3c', symbolColor: '#e9f8ff', height: 48 },
    roundedCorners: true,
    icon: assetPath('icon.ico'),
    backgroundColor: '#eef5ff',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('close', (event) => {
    if (!quitting && activeUserId && store.getSettings(activeUserId).minimizeToTray) {
      event.preventDefault()
      mainWindow?.hide()
      if (Notification.isSupported()) new Notification({ title: '元气条仍在运行', body: '应用已最小化到系统托盘，早晚提醒会继续生效。', icon: assetPath('icon.png') }).show()
    }
  })
  mainWindow.on('closed', () => { mainWindow = null })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { import('electron').then(({ shell }) => shell.openExternal(url)); return { action: 'deny' } })
  const demo = process.env.VITALBAR_DEMO === '1'
  const page = process.env.VITALBAR_CAPTURE_PAGE || 'dashboard'
  if (process.env.VITALBAR_WINDOW_ACTION_TEST) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const action = process.env.VITALBAR_WINDOW_ACTION_TEST!
        const selectors: Record<string, string> = { minimize: '.window-controls button:nth-child(1)', maximize: '.window-controls button:nth-child(2)', close: '.window-controls button:nth-child(3)' }
        await mainWindow!.webContents.executeJavaScript(`const b=document.querySelector('${selectors[action]}'); b?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'mouse'}))`)
        await new Promise((resolve) => setTimeout(resolve, 500))
        const result = { action, minimized: mainWindow?.isMinimized() ?? false, maximized: mainWindow?.isMaximized() ?? false, visible: mainWindow?.isVisible() ?? false, destroyed: mainWindow?.isDestroyed() ?? true }
        writeFileSync(join(process.env.VITALBAR_CAPTURE_DIR!, 'window-' + action + '.json'), JSON.stringify(result, null, 2), 'utf8')
        if (result.minimized) mainWindow?.restore()
        if (result.maximized) mainWindow?.unmaximize()
        if (!result.visible) mainWindow?.show()
        app.quit()
      }, 1500)
    })
  }
  if (process.env.VITALBAR_CAPTURE_DIR && !process.env.VITALBAR_WINDOW_ACTION_TEST) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const action = process.env.VITALBAR_CAPTURE_ACTION
        if (action === 'positive') await mainWindow!.webContents.executeJavaScript("document.querySelector('.behavior-card.positive')?.click()")
        if (action === 'negative') await mainWindow!.webContents.executeJavaScript("document.querySelector('.behavior-card.negative')?.click()")
        if (action) await new Promise((resolve) => setTimeout(resolve, 700))
        const image = await mainWindow!.webContents.capturePage()
        writeFileSync(join(process.env.VITALBAR_CAPTURE_DIR!, page + '.png'), image.toPNG())
        app.quit()
      }, 1400)
    })
  }
  if (process.env.ELECTRON_RENDERER_URL) mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL + (demo ? '?demo=1&page=' + page : ''))
  else mainWindow.loadFile(join(__dirname, '../renderer/index.html'), demo ? { query: { demo: '1', page } } : undefined)
}

function createTray() {
  const image = nativeImage.createFromPath(assetPath('icon.png')).resize({ width: 18, height: 18 })
  if (image.isEmpty()) return
  tray = new Tray(image)
  tray.setToolTip('元气条')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开元气条', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: '退出', click: () => { quitting = true; app.quit() } }
  ]))
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })
}

function configureStartup(userId: number) {
  const settings = store.getSettings(userId)
  app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup })
}

function checkNotifications() {
  if (!activeUserId || !Notification.isSupported()) return
  const settings = store.getSettings(activeUserId)
  if (!settings.notificationsEnabled) return
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  for (const [slot, configured] of [['morning', settings.morningTime], ['evening', settings.eveningTime]] as const) {
    const [hour, minute] = configured.split(':').map(Number)
    const target = hour * 60 + minute
    const key = dateISO(now) + ':' + slot
    if (currentMinutes >= target && currentMinutes < target + 20 && !notified.has(key)) {
      notified.add(key)
      new Notification({
        title: '元气打卡提醒',
        body: slot === 'morning' ? '早上好，先用一次小行动定下今天的节奏。' : '今天还没有完成的行动吗？现在签到，让进步留下痕迹。',
        icon: assetPath('icon.png')
      }).show()
    }
  }
}

function dateISO(date: Date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

function registerIpc() {
  ipcMain.handle('auth:register', (_event, username, password) => {
    const snapshot = store.register(username, password)
    activeUserId = snapshot.user.id
    configureStartup(activeUserId)
    return snapshot
  })
  ipcMain.handle('auth:login', (_event, username, password) => {
    const snapshot = store.login(username, password)
    activeUserId = snapshot.user.id
    configureStartup(activeUserId)
    return snapshot
  })
  ipcMain.handle('data:snapshot', (_event, userId: number) => store.snapshot(userId))
  ipcMain.handle('behavior:record', (_event, userId: number, key: string) => store.recordBehavior(userId, key))
  ipcMain.handle('behavior:update', (_event, userId: number, key: string, health: number, mood: number) => store.updateBehavior(userId, key, health, mood))
  ipcMain.handle('behavior:restore', (_event, userId: number) => store.restoreBehaviors(userId))
  ipcMain.handle('shop:purchase', (_event, userId: number, key: string) => store.purchase(userId, key))
  ipcMain.handle('shop:equip', (_event, userId: number, key: string) => store.equip(userId, key))
  ipcMain.handle('settings:update', (_event, userId: number, settings: UserSettings) => {
    const snapshot = store.updateSettings(userId, settings)
    configureStartup(userId)
    return snapshot
  })
  ipcMain.handle('data:export', async (_event, userId: number) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '导出元气条数据',
      defaultPath: '元气条数据-' + new Date().toISOString().slice(0, 10) + '.json',
      filters: [{ name: 'JSON 数据', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return { saved: false }
    writeFileSync(result.filePath, JSON.stringify(store.exportData(userId), null, 2), 'utf8')
    return { saved: true, path: result.filePath }
  })
  ipcMain.handle('window:action', (event, action: 'minimize' | 'maximize' | 'close') => {
    const target = BrowserWindow.fromWebContents(event.sender) ?? mainWindow
    if (!target) return
    if (action === 'minimize') target.minimize()
    if (action === 'maximize') target.isMaximized() ? target.unmaximize() : target.maximize()
    if (action === 'close') target.close()
  })
}

app.setAppUserModelId('com.vitalbar.desktop')
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()
else {
  app.on('second-instance', () => { mainWindow?.show(); mainWindow?.focus() })
  app.whenReady().then(() => {
    const dataRoot = process.env.VITALBAR_DATA_DIR || app.getPath('userData')
    mkdirSync(dataRoot, { recursive: true })
    store = new LocalStore(join(dataRoot, 'vitalbar-store.json'))
    if (process.env.VITALBAR_DEMO === '1') store.seedDemo()
    registerIpc()
    createWindow()
    createTray()
    setInterval(checkNotifications, 30000)
  })
}

app.on('before-quit', () => { quitting = true })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (!mainWindow) createWindow(); else { mainWindow.show(); mainWindow.focus() } })
