export type PageKey = 'dashboard' | 'calendar' | 'reports' | 'shop' | 'profile'

export interface BehaviorDefinition {
  key: string
  name: string
  icon: string
  healthDelta: number
  moodDelta: number
  isPositive: boolean
  description: string
}

export interface UserRecord {
  id: number
  username: string
  createdAt: string
  currentHealth: number
  mood: number
  coins: number
  lifetimeXp: number
  equippedTitle: string
  equippedFrame: string
  equippedBadge: string
  equippedDecoration: string
}

export interface EventRecord {
  id: number
  userId: number
  behaviorKey: string
  behaviorName: string
  baseHealth: number
  effectiveHealth: number
  moodDelta: number
  coinsDelta: number
  xpDelta: number
  multiplier: number
  createdAt: string
  localDate: string
}

export interface UserSettings {
  notificationsEnabled: boolean
  morningTime: string
  eveningTime: string
  minimizeToTray: boolean
  launchAtStartup: boolean
}

export interface Snapshot {
  user: UserRecord
  behaviors: BehaviorDefinition[]
  events: EventRecord[]
  purchases: string[]
  settings: UserSettings
}

export interface RecordResult {
  effect: EffectResult
  snapshot: Snapshot
}

export interface EffectResult {
  baseHealth: number
  effectiveHealth: number
  moodDelta: number
  coinsDelta: number
  xpDelta: number
  multiplier: number
}

export interface ShopItem {
  key: string
  name: string
  type: 'frame' | 'badge' | 'decoration' | 'title'
  price: number
  color: string
  accent: string
  description: string
}

export interface ReportSummary {
  totalHealth: number
  positiveHealth: number
  negativeHealth: number
  totalMood: number
  totalCoins: number
  totalXp: number
  eventCount: number
  checkinDays: number
  averageDailyHealth: number
  topGain: [string, number] | null
  topLoss: [string, number] | null
  behaviorTotals: Record<string, number>
}

export interface VitalBarApi {
  register(username: string, password: string): Promise<Snapshot>
  login(username: string, password: string): Promise<Snapshot>
  snapshot(userId: number): Promise<Snapshot>
  recordBehavior(userId: number, behaviorKey: string): Promise<RecordResult>
  updateBehavior(userId: number, behaviorKey: string, healthDelta: number, moodDelta: number): Promise<Snapshot>
  restoreBehaviors(userId: number): Promise<Snapshot>
  purchase(userId: number, itemKey: string): Promise<Snapshot>
  equip(userId: number, itemKey: string): Promise<Snapshot>
  updateSettings(userId: number, settings: UserSettings): Promise<Snapshot>
  exportData(userId: number): Promise<{ saved: boolean; path?: string }>
  windowAction(action: 'minimize' | 'maximize' | 'close'): Promise<void>
}
