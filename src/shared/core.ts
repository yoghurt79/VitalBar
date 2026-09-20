import type { BehaviorDefinition, EventRecord, ReportSummary } from './types'

export const LEVEL_TITLES = ['初醒', '微光', '节律', '自律者', '掌控者', '元气大师'] as const
export const LEVEL_DELTAS = [200, 380, 722, 1372, 2607]
export const LEVEL_THRESHOLDS = LEVEL_DELTAS.reduce<number[]>((items, value) => [...items, items.at(-1)! + value], [0])

export const DEFAULT_BEHAVIORS: BehaviorDefinition[] = [
  { key: 'stay_up', name: '熬夜', icon: 'moon', healthDelta: -100, moodDelta: -20, isPositive: false, description: '晚睡对身体与第二天状态的双重消耗' },
  { key: 'study', name: '学习', icon: 'book', healthDelta: 30, moodDelta: -20, isPositive: true, description: '专注学习，短期辛苦但长期增值' },
  { key: 'exercise', name: '健身', icon: 'dumbbell', healthDelta: 20, moodDelta: -10, isPositive: true, description: '身体活动带来的健康积累' },
  { key: 'gaming', name: '长时间打游戏', icon: 'gamepad', healthDelta: -30, moodDelta: 10, isPositive: false, description: '即时快乐，但会消耗健康' },
  { key: 'short_video', name: '长时间刷视频', icon: 'video', healthDelta: -20, moodDelta: 10, isPositive: false, description: '碎片娱乐带来的时间与健康损耗' },
  { key: 'uncontrolled_diet', name: '不控制饮食', icon: 'utensils', healthDelta: -10, moodDelta: 20, isPositive: false, description: '饮食放纵带来的心情补偿与健康成本' }
]

export function clamp(value: number, low = 0, high = 100) {
  return Math.max(low, Math.min(high, Math.round(value)))
}

export function levelFromXp(xp: number) {
  let level = 0
  LEVEL_THRESHOLDS.forEach((threshold, index) => { if (xp >= threshold) level = index })
  return Math.min(level, LEVEL_TITLES.length - 1)
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp)
  if (level >= LEVEL_TITLES.length - 1) return { level, current: xp - LEVEL_THRESHOLDS[level], needed: 0, percent: 100 }
  const current = xp - LEVEL_THRESHOLDS[level]
  const needed = LEVEL_THRESHOLDS[level + 1] - LEVEL_THRESHOLDS[level]
  return { level, current, needed, percent: Math.min(100, (current / needed) * 100) }
}

export function healthGainMultiplier(mood: number) {
  const value = clamp(mood)
  if (value <= 0) return 0.5
  if (value < 30) return 0.5
  if (value <= 60) return 1
  return Math.min(2, 1 + (value - 60) / 40)
}

export function healthLossMultiplier(mood: number) {
  const value = clamp(mood)
  if (value <= 0) return 2
  if (value < 30) return 1.5
  if (value <= 60) return 1
  return Math.max(0, (100 - value) / 40)
}

export function calculateEffect(behavior: BehaviorDefinition, mood: number) {
  const multiplier = behavior.healthDelta > 0 ? healthGainMultiplier(mood) : healthLossMultiplier(mood)
  const roundedHealth = Math.round(behavior.healthDelta * multiplier)
  const effectiveHealth = Object.is(roundedHealth, -0) ? 0 : roundedHealth
  const coinsDelta = effectiveHealth > 0 ? Math.max(1, Math.round(effectiveHealth * 0.5)) : 0
  return { baseHealth: behavior.healthDelta, effectiveHealth, moodDelta: behavior.moodDelta, coinsDelta, xpDelta: Math.max(0, effectiveHealth), multiplier }
}

export function summarize(events: EventRecord[], dayCount?: number): ReportSummary {
  const gains: Record<string, number> = {}
  const losses: Record<string, number> = {}
  const totals: Record<string, number> = {}
  const dates = new Set<string>()
  const daily: Record<string, number> = {}
  const result: ReportSummary = { totalHealth: 0, positiveHealth: 0, negativeHealth: 0, totalMood: 0, totalCoins: 0, totalXp: 0, eventCount: events.length, checkinDays: 0, topGain: null, topLoss: null, behaviorTotals: totals }
  events.forEach((event) => {
    result.totalHealth += event.effectiveHealth
    result.totalMood += event.moodDelta
    result.totalCoins += event.coinsDelta
    result.totalXp += event.xpDelta
    totals[event.behaviorName] = (totals[event.behaviorName] ?? 0) + event.effectiveHealth
    if (event.effectiveHealth > 0) {
      result.positiveHealth += event.effectiveHealth
      gains[event.behaviorName] = (gains[event.behaviorName] ?? 0) + event.effectiveHealth
    } else if (event.effectiveHealth < 0) {
      result.negativeHealth += event.effectiveHealth
      losses[event.behaviorName] = (losses[event.behaviorName] ?? 0) + Math.abs(event.effectiveHealth)
    }
    dates.add(event.localDate)
    daily[event.localDate] = (daily[event.localDate] ?? 0) + event.effectiveHealth
  })
  result.checkinDays = dates.size
  result.topGain = Object.entries(gains).sort((a, b) => b[1] - a[1])[0] ?? null
  result.topLoss = Object.entries(losses).sort((a, b) => b[1] - a[1])[0] ?? null
  result.averageDailyHealth = dayCount ? Object.values(daily).reduce((sum, value) => sum + value, 0) / dayCount : 0
  return result
}

export function dateISO(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

export function startOfWeek(date: Date) {
  const copy = new Date(date)
  const day = copy.getDay() || 7
  copy.setDate(copy.getDate() - day + 1)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function calculateStreak(dates: string[], today = new Date()) {
  const unique = new Set(dates)
  let cursor = dateISO(today)
  if (!unique.has(cursor)) cursor = dateISO(addDays(today, -1))
  let count = 0
  while (unique.has(cursor)) {
    count += 1
    const parts = cursor.split('-').map(Number)
    cursor = dateISO(addDays(new Date(parts[0], parts[1] - 1, parts[2]), -1))
  }
  return count
}
