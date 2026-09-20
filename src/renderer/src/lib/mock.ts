import { calculateEffect, dateISO, DEFAULT_BEHAVIORS } from '../../../shared/core'
import { SHOP_ITEMS } from '../../../shared/shop'
import type { BehaviorDefinition, EventRecord, Snapshot, UserSettings, VitalBarApi } from '../../../shared/types'

const STORAGE_KEY = 'vitalbar-demo-snapshot'

function seed(): Snapshot {
  const now = new Date()
  const examples: Array<[number, string, number, number, number, number, number]> = [
    [8, '熬夜', -200, -20, 0, 0, 2], [7, '不控制饮食', -15, 20, 0, 0, 1.5], [6, '健身', 20, -10, 10, 20, 1],
    [5, '学习', 30, -20, 15, 30, 1], [3, '长时间刷视频', -30, 10, 0, 0, 1.5], [2, '健身', 25, -10, 13, 25, 1.25],
    [1, '学习', 45, -20, 23, 45, 1.5], [0, '学习', 60, -20, 30, 60, 2]
  ]
  const events: EventRecord[] = examples.map(([days, name, health, mood, coins, xp, multiplier], index) => {
    const created = new Date(now)
    created.setDate(created.getDate() - days)
    created.setHours(20, 8 + index, 0, 0)
    return { id: index + 1, userId: 1, behaviorKey: '', behaviorName: name, baseHealth: health, effectiveHealth: health, moodDelta: mood, coinsDelta: coins, xpDelta: xp, multiplier, createdAt: created.toISOString(), localDate: dateISO(created) }
  })
  return {
    user: { id: 1, username: '元气测试员', createdAt: now.toISOString(), currentHealth: 135, mood: 68, coins: 245, lifetimeXp: 680, equippedTitle: '', equippedFrame: 'frame_mist', equippedBadge: 'badge_early', equippedDecoration: 'decor_spark' },
    behaviors: structuredClone(DEFAULT_BEHAVIORS),
    events,
    purchases: ['frame_mist', 'badge_early', 'decor_spark'],
    settings: { notificationsEnabled: true, morningTime: '09:00', eveningTime: '21:00', minimizeToTray: true, launchAtStartup: false }
  }
}

export function createMockApi(): VitalBarApi {
  const load = (): Snapshot => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : seed()
    } catch { return seed() }
  }
  let snapshot = load()
  const save = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); return structuredClone(snapshot) }
  const ensureAuth = (username: string, password: string) => {
    if (username.trim().length < 2) throw new Error('用户名需为 2 至 20 个字符')
    if (password.length < 6) throw new Error('密码至少需要 6 位')
  }
  return {
    async register(username, password) { ensureAuth(username, password); snapshot.user.username = username.trim(); return save() },
    async login(username, password) { ensureAuth(username, password); snapshot.user.username = username.trim(); return save() },
    async snapshot() { return structuredClone(snapshot) },
    async recordBehavior(userId, behaviorKey) {
      const behavior = snapshot.behaviors.find((item) => item.key === behaviorKey)!
      const now = new Date()
      const today = dateISO(now)
      if (snapshot.events.some((event) => event.userId === userId && event.behaviorKey === behaviorKey && event.localDate === today)) throw new Error('今天已经完成过“' + behavior.name + '”打卡，每种行为每天只能记录一次。')
      const effect = calculateEffect(behavior, snapshot.user.mood)
      snapshot.user.currentHealth = Math.max(0, Math.min(200, snapshot.user.currentHealth + effect.effectiveHealth))
      snapshot.user.mood = Math.max(0, Math.min(100, snapshot.user.mood + effect.moodDelta))
      snapshot.user.coins = Math.max(0, snapshot.user.coins + effect.coinsDelta)
      snapshot.user.lifetimeXp += effect.xpDelta
      snapshot.events.unshift({ id: Date.now(), userId, behaviorKey, behaviorName: behavior.name, ...effect, createdAt: now.toISOString(), localDate: today })
      return { effect, snapshot: save() }
    },
    async updateBehavior(_userId, key, healthDelta, moodDelta) {
      snapshot.behaviors = snapshot.behaviors.map((item) => item.key === key ? { ...item, healthDelta, moodDelta } : item)
      return save()
    },
    async restoreBehaviors() { snapshot.behaviors = structuredClone(DEFAULT_BEHAVIORS); return save() },
    async purchase(userId, itemKey) {
      const item = SHOP_ITEMS.find((entry) => entry.key === itemKey)!
      if (!snapshot.purchases.includes(itemKey)) {
        if (snapshot.user.coins < item.price) throw new Error('元气币不足')
        snapshot.user.coins -= item.price
        snapshot.purchases.push(itemKey)
      }
      return save()
    },
    async equip(_userId, itemKey) {
      const item = SHOP_ITEMS.find((entry) => entry.key === itemKey)!
      if (item.type === 'frame') snapshot.user.equippedFrame = itemKey
      if (item.type === 'badge') snapshot.user.equippedBadge = itemKey
      if (item.type === 'decoration') snapshot.user.equippedDecoration = itemKey
      if (item.type === 'title') snapshot.user.equippedTitle = itemKey
      return save()
    },
    async updateSettings(_userId, settings: UserSettings) { snapshot.settings = { ...settings }; return save() },
    async exportData() { return { saved: false } },
    async windowAction() {}
  }
}
