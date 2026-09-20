import { contextBridge, ipcRenderer } from 'electron'
import type { UserSettings, VitalBarApi } from '../shared/types'

const api: VitalBarApi = {
  register: (username, password) => ipcRenderer.invoke('auth:register', username, password),
  login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
  snapshot: (userId) => ipcRenderer.invoke('data:snapshot', userId),
  recordBehavior: (userId, behaviorKey) => ipcRenderer.invoke('behavior:record', userId, behaviorKey),
  updateBehavior: (userId, behaviorKey, healthDelta, moodDelta) => ipcRenderer.invoke('behavior:update', userId, behaviorKey, healthDelta, moodDelta),
  restoreBehaviors: (userId) => ipcRenderer.invoke('behavior:restore', userId),
  purchase: (userId, itemKey) => ipcRenderer.invoke('shop:purchase', userId, itemKey),
  equip: (userId, itemKey) => ipcRenderer.invoke('shop:equip', userId, itemKey),
  updateSettings: (userId: number, settings: UserSettings) => ipcRenderer.invoke('settings:update', userId, settings),
  exportData: (userId) => ipcRenderer.invoke('data:export', userId),
  windowAction: (action) => ipcRenderer.invoke('window:action', action)
}

contextBridge.exposeInMainWorld('vitalbar', api)
