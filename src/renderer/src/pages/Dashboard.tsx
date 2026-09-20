import { useMemo, useState, type CSSProperties } from 'react'
import { ArrowUpRight, CalendarCheck2, CheckCircle2, CircleHelp, Coins, Flame, Rocket, Sparkles, TimerReset } from 'lucide-react'
import type { BehaviorDefinition, Snapshot } from '../../../shared/types'
import { calculateEffect, dateISO, healthGainMultiplier, healthLossMultiplier, levelProgress, summarize } from '../../../shared/core'
import { BehaviorGlyph, EnergyGauge, Modal, PageHeader, StatPill } from '../components/UI'

interface Props {
  snapshot: Snapshot
  onRecord: (behavior: BehaviorDefinition) => Promise<void>
  onOpenRules: () => void
}

function adviceText(snapshot: Snapshot, totalEvents: number, gain: string | null, loss: string | null, mood: number) {
  if (!totalEvents) return '先完成一次学习或健身打卡；今天不要追求满分，只建立一个可延续的起点。'
  if (mood <= 0) return '心情已触底，但不会阻止打卡；健身、学习等正向行为仍按 ×0.5 获得健康值，完成后再安排一次放松提升心情。'
  if (loss === '熬夜') return '今晚把手机放到床外，并在 23:30 前关灯；先让熬夜从本周损耗榜首位移开。'
  if (gain) return '趁心情倍率生效，再完成一次 25 分钟专注学习，把今天的正向收益继续放大。'
  return '每完成一个明确行动就立即签到，连续的真实记录比偶尔满分更有价值。'
}

export default function Dashboard({ snapshot, onRecord, onOpenRules }: Props) {
  const [confirmBehavior, setConfirmBehavior] = useState<BehaviorDefinition | null>(null)
  const today = dateISO(new Date())
  const todayEvents = snapshot.events.filter((event) => event.localDate === today)
  const completedKeys = new Set(todayEvents.map((event) => event.behaviorKey))
  const summary = useMemo(() => summarize(todayEvents, 1), [todayEvents])
  const progress = levelProgress(snapshot.user.lifetimeXp)
  const gainMultiplier = healthGainMultiplier(snapshot.user.mood)
  const lossMultiplier = healthLossMultiplier(snapshot.user.mood)
  const positives = snapshot.behaviors.filter((item) => item.isPositive)
  const negatives = snapshot.behaviors.filter((item) => !item.isPositive)
  const latest = snapshot.events.slice(0, 5)

  const choose = (behavior: BehaviorDefinition) => {
    if (behavior.isPositive) void onRecord(behavior)
    else setConfirmBehavior(behavior)
  }
  const effect = confirmBehavior ? calculateEffect(confirmBehavior, snapshot.user.mood) : null

  return <div className="page dashboard-page">
    <PageHeader eyebrow="DAILY ENERGY" title={`${new Date().getHours() < 11 ? '早上好' : new Date().getHours() < 18 ? '下午好' : '晚上好'}，${snapshot.user.username}`} subtitle="把真实行为变成看得见的元气，让今天的节奏胜过昨天。" actions={<StatPill label="元气币" value={snapshot.user.coins} tone="gold"/>} />
    <section className="dashboard-hero-grid">
      <article className="glass-card health-hero">
        <div className="card-glow"/>
        <div className="health-hero-copy"><span className="eyebrow">TODAY VITALITY</span><h2>今日元气 <b>{summary.totalHealth >= 0 ? '+' : ''}{summary.totalHealth}</b></h2><p>短期健康会随行为升降，长期经验只增长、不重置。</p><div className="hero-kpis"><StatPill label="今日打卡" value={`${summary.eventCount} 次`} tone="blue"/><StatPill label="连续签到" value={calculateLocalStreak(snapshot)} tone="green"/></div></div>
        <EnergyGauge value={snapshot.user.currentHealth} />
      </article>
      <article className="glass-card level-card">
        <div className="card-heading"><div><span className="eyebrow">SELF DISCIPLINE</span><h3>Lv.{progress.level} · {snapshot.user.equippedTitle ? '专属称号已装备' : '成长进行中'}</h3></div><Rocket size={24}/></div>
        <p className="level-hint">下一等级还需 <strong>{Math.max(0, progress.needed - progress.current)}</strong> 长期经验</p>
        <div className="progress-track large"><i style={{ width: progress.percent + '%' }}/></div>
        <div className="level-details"><span>累计经验 <b>{snapshot.user.lifetimeXp}</b></span><span>当前等级 <b>{progress.level}</b></span></div>
      </article>
      <article className="glass-card mood-card">
        <div className="mood-orb" style={{ '--mood': snapshot.user.mood + '%' } as CSSProperties}><div><strong>{snapshot.user.mood}</strong><span>心情</span></div></div>
        <div className="mood-copy"><span className="eyebrow">MOOD MULTIPLIER</span><h3>{snapshot.user.mood > 60 ? '高能状态' : snapshot.user.mood >= 30 ? '平稳状态' : '需要补给'}</h3><p>正向收益 <b>×{gainMultiplier.toFixed(1)}</b></p><p>负向损失 <b>×{lossMultiplier.toFixed(1)}</b></p></div>
      </article>
    </section>

    <section className="section-block">
      <div className="section-heading"><div><span className="eyebrow">CHECK-IN CALCULATOR</span><h2>手动打卡</h2><p>正向行为一键记录；负向行为需要二次确认。</p></div><button className="ghost-button" onClick={onOpenRules}><TimerReset size={15}/>调整分值</button></div>
      <div className="behavior-group"><div className="group-label positive"><i/><span>正向积累</span></div><div className="behavior-grid">{positives.map((behavior) => <BehaviorCard key={behavior.key} behavior={behavior} completed={completedKeys.has(behavior.key)} onClick={() => choose(behavior)} />)}</div></div>
      <div className="behavior-group"><div className="group-label negative"><i/><span>负向记录</span></div><div className="behavior-grid">{negatives.map((behavior) => <BehaviorCard key={behavior.key} behavior={behavior} completed={completedKeys.has(behavior.key)} onClick={() => choose(behavior)} />)}</div></div>
    </section>

    <section className="two-column-grid">
      <article className="glass-card timeline-card"><div className="card-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h3>最近记录</h3></div><CalendarCheck2 size={21}/></div><div className="timeline-list">{latest.length ? latest.map((event) => <div className="timeline-item" key={event.id}><i className={event.effectiveHealth >= 0 ? 'positive' : 'negative'}/><div><strong>{event.behaviorName}</strong><span>{new Date(event.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} · 心情 {event.moodDelta > 0 ? '+' : ''}{event.moodDelta}</span></div><b className={event.effectiveHealth >= 0 ? 'positive' : 'negative'}>{event.effectiveHealth > 0 ? '+' : ''}{event.effectiveHealth}</b></div>) : <div className="empty-state">还没有记录，从上方选择一项真实行为开始。</div>}</div></article>
      <article className="glass-card advice-card"><div className="advice-orb"><Sparkles size={24}/></div><div><span className="eyebrow">LOCAL INTELLIGENCE</span><h3>今日可执行建议</h3><p>{adviceText(snapshot, summary.eventCount, summary.topGain?.[0] ?? null, summary.topLoss?.[0] ?? null, snapshot.user.mood)}</p><button className="text-button">记录一次行动 <ArrowUpRight size={15}/></button></div></article>
    </section>

    {confirmBehavior && effect && <Modal title={`确认记录${confirmBehavior.name}？`} danger onClose={() => setConfirmBehavior(null)}><div className="confirm-effect"><BehaviorGlyph behavior={confirmBehavior} size={30}/><div><b>健康值 {confirmBehavior.healthDelta > 0 ? '+' : ''}{confirmBehavior.healthDelta}</b><span>心情值 {confirmBehavior.moodDelta > 0 ? '+' : ''}{confirmBehavior.moodDelta}</span></div></div><div className="modal-tip"><CircleHelp size={16}/><span>当前心情倍率 ×{effect.multiplier.toFixed(1)}，实际健康值约 {effect.effectiveHealth > 0 ? '+' : ''}{effect.effectiveHealth}。</span></div><div className="modal-actions"><button className="ghost-button" onClick={() => setConfirmBehavior(null)}>取消</button><button className="danger-button" onClick={() => { const item = confirmBehavior; setConfirmBehavior(null); void onRecord(item) }}>确认记录</button></div></Modal>}
  </div>
}

function BehaviorCard({ behavior, completed, onClick }: { behavior: BehaviorDefinition; completed: boolean; onClick: () => void }) {
  return <button disabled={completed} className={`behavior-card ${behavior.isPositive ? 'positive' : 'negative'} ${completed ? 'completed' : ''}`} onClick={onClick}><span className="behavior-icon">{completed ? <CheckCircle2 size={22}/> : <BehaviorGlyph behavior={behavior}/>}</span><span className="behavior-copy"><strong>{behavior.name}</strong><small>{completed ? '今天已完成，明天可再次打卡' : `健康 ${behavior.healthDelta > 0 ? '+' : ''}${behavior.healthDelta} · 心情 ${behavior.moodDelta > 0 ? '+' : ''}${behavior.moodDelta}`}</small></span><span className="behavior-action">{completed ? '✓' : behavior.isPositive ? '+' : '!'}</span></button>
}

function calculateLocalStreak(snapshot: Snapshot) {
  const dates = new Set(snapshot.events.map((event) => event.localDate))
  const cursor = new Date()
  let count = 0
  if (!dates.has(dateISO(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (dates.has(dateISO(cursor))) { count += 1; cursor.setDate(cursor.getDate() - 1) }
  return count + ' 天'
}
