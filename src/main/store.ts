import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { clamp, calculateEffect, dateISO, DEFAULT_BEHAVIORS } from '../shared/core'
import { SHOP_ITEMS } from '../shared/shop'
import type { BehaviorDefinition, EventRecord, Snapshot, UserRecord, UserSettings } from '../shared/types'

interface PersistedUser extends UserRecord {
  passwordHash: string
  salt: string
  behaviorOverrides: Record<string, { healthDelta: number; moodDelta: number }>
}

interface PersistedData {
  version: number
  nextIds: { user: number; event: number }
  users: PersistedUser[]
  events: EventRecord[]
  purchases: Array<{ userId: number; itemKey: string; purchasedAt: string }>
  settings: Record<string, UserSettings>
}

const DEFAULT_SETTINGS: UserSettings = {
  notificationsEnabled: true,
  morningTime: '09:00',
  eveningTime: '21:00',
  minimizeToTray: true,
  launchAtStartup: false
}

export class LocalStore {
  private data: PersistedData

  constructor(private readonly filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true })
    this.data = this.load()
  }

  private load(): PersistedData {
    if (existsSync(this.filePath)) {
      try {
        const parsed = JSON.parse(readFileSync(this.filePath, 'utf8')) as PersistedData
        parsed.users ??= []
        parsed.events ??= []
        parsed.purchases ??= []
        parsed.settings ??= {}
        parsed.nextIds ??= { user: 1, event: 1 }
        return parsed
      } catch {
        const backup = this.filePath + '.broken-' + Date.now()
        renameSync(this.filePath, backup)
      }
    }
    return { version: 1, nextIds: { user: 1, event: 1 }, users: [], events: [], purchases: [], settings: {} }
  }

  private save() {
    const temporary = this.filePath + '.tmp'
    writeFileSync(temporary, JSON.stringify(this.data, null, 2), 'utf8')
    renameSync(temporary, this.filePath)
  }

  private hash(password: string, salt: string) {
    return pbkdf2Sync(password, Buffer.from(salt, 'hex'), 180000, 32, 'sha256').toString('hex')
  }

  private publicUser(user: PersistedUser): UserRecord {
    const { passwordHash: _password, salt: _salt, behaviorOverrides: _overrides, ...safe } = user
    return safe
  }

  private findUser(id: number) {
    const user = this.data.users.find((item) => item.id === id)
    if (!user) throw new Error('用户不存在')
    return user
  }

  register(username: string, password: string): Snapshot {
    const normalized = username.trim()
    if ([...normalized].length < 2 || [...normalized].length > 20) throw new Error('用户名需为 2 至 20 个字符')
    if (password.length < 6) throw new Error('密码至少需要 6 位')
    if (this.data.users.some((user) => user.username.toLowerCase() === normalized.toLowerCase())) throw new Error('该用户名已被使用')
    const salt = randomBytes(16).toString('hex')
    const user: PersistedUser = {
      id: this.data.nextIds.user++,
      username: normalized,
      createdAt: new Date().toISOString(),
      currentHealth: 0,
      mood: 0,
      coins: 0,
      lifetimeXp: 0,
      equippedTitle: '',
      equippedFrame: '',
      equippedBadge: '',
      equippedDecoration: '',
      passwordHash: this.hash(password, salt),
      salt,
      behaviorOverrides: {}
    }
    this.data.users.push(user)
    this.data.settings[String(user.id)] = { ...DEFAULT_SETTINGS }
    this.save()
    return this.snapshot(user.id)
  }

  login(username: string, password: string): Snapshot {
    const user = this.data.users.find((item) => item.username.toLowerCase() === username.trim().toLowerCase())
    if (!user) throw new Error('用户名或密码不正确')
    const candidate = Buffer.from(this.hash(password, user.salt), 'hex')
    const expected = Buffer.from(user.passwordHash, 'hex')
    if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) throw new Error('用户名或密码不正确')
    return this.snapshot(user.id)
  }

  snapshot(userId: number): Snapshot {
    const user = this.findUser(userId)
    return {
      user: this.publicUser(structuredClone(user)),
      behaviors: this.behaviors(user),
      events: this.data.events.filter((event) => event.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      purchases: this.data.purchases.filter((item) => item.userId === userId).map((item) => item.itemKey),
      settings: { ...DEFAULT_SETTINGS, ...(this.data.settings[String(userId)] ?? {}) }
    }
  }

  private behaviors(user: PersistedUser): BehaviorDefinition[] {
    return DEFAULT_BEHAVIORS.map((behavior) => ({ ...behavior, ...(user.behaviorOverrides[behavior.key] ?? {}) }))
  }

  recordBehavior(userId: number, behaviorKey: string) {
    const user = this.findUser(userId)
    const behavior = this.behaviors(user).find((item) => item.key === behaviorKey)
    if (!behavior) throw new Error('行为不存在')
    const now = new Date()
    const today = dateISO(now)
    const alreadyRecorded = this.data.events.some((event) => event.userId === userId && event.behaviorKey === behaviorKey && event.localDate === today)
    if (alreadyRecorded) throw new Error('今天已经完成过“' + behavior.name + '”打卡，每种行为每天只能记录一次。')
    const effect = calculateEffect(behavior, user.mood)
    user.currentHealth = clamp(user.currentHealth + effect.effectiveHealth, 0, 200)
    user.mood = clamp(user.mood + effect.moodDelta)
    user.coins = Math.max(0, user.coins + effect.coinsDelta)
    user.lifetimeXp += effect.xpDelta
    this.data.events.push({
      id: this.data.nextIds.event++,
      userId,
      behaviorKey,
      behaviorName: behavior.name,
      ...effect,
      createdAt: now.toISOString(),
      localDate: today
    })
    this.save()
    return { effect, snapshot: this.snapshot(userId) }
  }

  updateBehavior(userId: number, behaviorKey: string, healthDelta: number, moodDelta: number) {
    if (!Number.isInteger(healthDelta) || !Number.isInteger(moodDelta) || healthDelta < -500 || healthDelta > 500 || moodDelta < -100 || moodDelta > 100) throw new Error('分值需在合理范围内')
    const user = this.findUser(userId)
    if (!DEFAULT_BEHAVIORS.some((item) => item.key === behaviorKey)) throw new Error('未找到该行为')
    user.behaviorOverrides[behaviorKey] = { healthDelta, moodDelta }
    this.save()
    return this.snapshot(userId)
  }

  restoreBehaviors(userId: number) {
    this.findUser(userId).behaviorOverrides = {}
    this.save()
    return this.snapshot(userId)
  }

  purchase(userId: number, itemKey: string) {
    const item = SHOP_ITEMS.find((entry) => entry.key === itemKey)
    if (!item) throw new Error('商品不存在')
    if (this.data.purchases.some((entry) => entry.userId === userId && entry.itemKey === itemKey)) throw new Error('你已经拥有这件商品')
    const user = this.findUser(userId)
    if (user.coins < item.price) throw new Error('元气币不足')
    user.coins -= item.price
    this.data.purchases.push({ userId, itemKey, purchasedAt: new Date().toISOString() })
    this.save()
    return this.snapshot(userId)
  }

  equip(userId: number, itemKey: string) {
    const item = SHOP_ITEMS.find((entry) => entry.key === itemKey)
    if (!item) throw new Error('商品不存在')
    if (!this.data.purchases.some((entry) => entry.userId === userId && entry.itemKey === itemKey)) throw new Error('尚未拥有该商品')
    const user = this.findUser(userId)
    if (item.type === 'frame') user.equippedFrame = itemKey
    if (item.type === 'badge') user.equippedBadge = itemKey
    if (item.type === 'decoration') user.equippedDecoration = itemKey
    if (item.type === 'title') user.equippedTitle = itemKey
    this.save()
    return this.snapshot(userId)
  }

  updateSettings(userId: number, settings: UserSettings) {
    for (const value of [settings.morningTime, settings.eveningTime]) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('提醒时间格式应为 HH:MM')
    }
    this.data.settings[String(userId)] = { ...settings }
    this.save()
    return this.snapshot(userId)
  }

  getSettings(userId: number) {
    return { ...DEFAULT_SETTINGS, ...(this.data.settings[String(userId)] ?? {}) }
  }

  exportData(userId: number) {
    const snapshot = this.snapshot(userId)
    const record = this.data.users.find((user) => user.id === userId)!
    const { passwordHash: _password, salt: _salt, ...safeUser } = record
    return { app: '元气条 Electron', version: 2, exportedAt: new Date().toISOString(), ...snapshot, user: safeUser }
  }

  seedDemo() {
    if (this.data.users.length) return
    const snapshot = this.register('元气测试员', 'secret12')
    const user = this.findUser(snapshot.user.id)
    const now = new Date()
    const rows: Array<[number, string, string, number, number, number, number, number]> = [
      [8, 'stay_up', '熬夜', -200, -20, 0, 0, 2],
      [7, 'uncontrolled_diet', '不控制饮食', -15, 20, 0, 0, 1.5],
      [6, 'exercise', '健身', 20, -10, 10, 20, 1],
      [5, 'study', '学习', 30, -20, 15, 30, 1],
      [3, 'short_video', '长时间刷视频', -30, 10, 0, 0, 1.5],
      [2, 'exercise', '健身', 25, -10, 13, 25, 1.25],
      [1, 'study', '学习', 45, -20, 23, 45, 1.5],
      [0, 'study', '学习', 60, -20, 30, 60, 2]
    ]
    rows.forEach(([daysAgo, behaviorKey, behaviorName, health, mood, coins, xp, multiplier], index) => {
      const created = new Date(now)
      created.setDate(created.getDate() - daysAgo)
      created.setHours(20, 8 + index, 0, 0)
      this.data.events.push({ id: this.data.nextIds.event++, userId: user.id, behaviorKey, behaviorName, baseHealth: health, effectiveHealth: health, moodDelta: mood, coinsDelta: coins, xpDelta: xp, multiplier, createdAt: created.toISOString(), localDate: dateISO(created) })
    })
    user.currentHealth = 135
    user.mood = 68
    user.coins = 245
    user.lifetimeXp = 680
    user.equippedFrame = 'frame_mist'
    user.equippedBadge = 'badge_early'
    user.equippedDecoration = 'decor_spark'
    this.data.purchases.push({ userId: user.id, itemKey: 'frame_mist', purchasedAt: now.toISOString() }, { userId: user.id, itemKey: 'badge_early', purchasedAt: now.toISOString() }, { userId: user.id, itemKey: 'decor_spark', purchasedAt: now.toISOString() })
    this.save()
  }

  checkIntegrity() {
    return createHash('sha256').update(JSON.stringify({ users: this.data.users.map((user) => user.id), events: this.data.events.length })).digest('hex').slice(0, 12)
  }
}
