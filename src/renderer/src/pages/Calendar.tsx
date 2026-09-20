import { useMemo, useState, type CSSProperties } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, LocateFixed, Sparkles } from 'lucide-react'
import type { Snapshot } from '../../../shared/types'
import { dateISO } from '../../../shared/core'
import { behaviorIcons, PageHeader, StatPill } from '../components/UI'

const weekdays = ['一', '二', '三', '四', '五', '六', '日']

export default function Calendar({ snapshot }: { snapshot: Snapshot }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(dateISO(today))
  const cells = useMemo(() => makeMonth(snapshot, year, month), [snapshot, year, month])
  const byDate = useMemo(() => {
    const map = new Map<string, typeof snapshot.events>()
    snapshot.events.forEach((event) => map.set(event.localDate, [...(map.get(event.localDate) ?? []), event]))
    return map
  }, [snapshot.events])
  const selectedEvents = byDate.get(selected) ?? []
  const selectedHealth = selectedEvents.reduce((sum, event) => sum + event.effectiveHealth, 0)
  const move = (value: number) => {
    const date = new Date(year, month + value, 1)
    setYear(date.getFullYear()); setMonth(date.getMonth()); setSelected(dateISO(date))
  }
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(dateISO(today)) }

  return <div className="page calendar-page">
    <PageHeader eyebrow="REAL CALENDAR" title="日历热图" subtitle="现实日期同步，签到对勾与颜色深浅记录每天的元气变化。" actions={<div className="month-controls"><button className="icon-button" onClick={() => move(-1)}><ChevronLeft size={18}/></button><strong>{year} 年 {month + 1} 月</strong><button className="icon-button" onClick={() => move(1)}><ChevronRight size={18}/></button><button className="ghost-button" onClick={goToday}><LocateFixed size={15}/>回到本月</button></div>} />
    <section className="calendar-layout">
      <article className="glass-card calendar-card">
        <div className="calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">{cells.map((cell) => <button key={cell.key} disabled={!cell.day || cell.future} className={`calendar-cell ${cell.isToday ? 'today' : ''} ${selected === cell.key ? 'selected' : ''} ${heatClass(cell.health)} ${cell.future ? 'future' : ''}`} onClick={() => cell.day && setSelected(cell.key)} style={{ '--heat': heatAlpha(cell.health) } as CSSProperties}><span className="day-number">{cell.day || ''}</span>{cell.checked && <span className="checkmark"><Check size={13}/></span>}{cell.day && cell.health !== 0 && <strong>{cell.health > 0 ? '+' : ''}{cell.health}</strong>}</button>)}</div>
        <div className="calendar-legend"><span><i className="legend-high"/>高健康</span><span><i className="legend-low"/>低健康</span><span><i className="legend-empty"/>未签到</span><span><i className="legend-today"/>今天</span></div>
      </article>
      <aside className="glass-card day-detail">
        <div className="detail-date"><span className="eyebrow">DAY DETAIL</span><h3>{selected.replaceAll('-', ' / ')}</h3><p>{selectedEvents.length ? '这一天留下了真实的行为记录。' : '这一天尚未签到。'}</p></div>
        <div className="detail-kpis"><StatPill label="健康变化" value={`${selectedHealth > 0 ? '+' : ''}${selectedHealth}`} tone={selectedHealth >= 0 ? 'green' : 'red'} /><StatPill label="打卡次数" value={`${selectedEvents.length} 次`} tone="blue"/></div>
        <div className="day-timeline">{selectedEvents.length ? selectedEvents.map((event) => {
          const Icon = behaviorIcons[(snapshot.behaviors.find((item) => item.key === event.behaviorKey)?.icon) ?? 'book'] ?? Sparkles
          return <div className="day-event" key={event.id}><i className={event.effectiveHealth >= 0 ? 'positive' : 'negative'}><Icon size={15}/></i><div><strong>{event.behaviorName}</strong><span>{new Date(event.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} · 心情 {event.moodDelta > 0 ? '+' : ''}{event.moodDelta}</span></div><b className={event.effectiveHealth >= 0 ? 'positive' : 'negative'}>{event.effectiveHealth > 0 ? '+' : ''}{event.effectiveHealth}</b></div>
        }) : <div className="empty-state large"><CalendarDays size={28}/><strong>暂无记录</strong><span>在“今日状态”完成打卡后，这里会自动出现对勾。</span></div>}</div>
      </aside>
    </section>
  </div>
}

function makeMonth(snapshot: Snapshot, year: number, month: number) {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const total = new Date(year, month + 1, 0).getDate()
  const today = dateISO(new Date())
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1
    const valid = day >= 1 && day <= total
    const date = new Date(year, month, valid ? day : 1)
    if (!valid) return { key: `empty-${index}`, day: 0, health: 0, checked: false, future: false, isToday: false }
    const key = dateISO(date)
    const dayEvents = snapshot.events.filter((event) => event.localDate === key)
    return { key, day, health: dayEvents.reduce((sum, event) => sum + event.effectiveHealth, 0), checked: dayEvents.length > 0, future: key > today, isToday: key === today }
  })
}

function heatClass(value: number) { return value > 0 ? 'heat-positive' : value < 0 ? 'heat-negative' : 'heat-neutral' }
function heatAlpha(value: number) { return Math.min(0.8, Math.abs(value) / 140) }
