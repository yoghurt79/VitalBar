import { useMemo, useState, type ReactNode } from 'react'
import ReactECharts from 'echarts-for-react'
import { ArrowDownRight, ArrowUpRight, Bot, CalendarRange, Coins, Gauge, Sparkles } from 'lucide-react'
import type { EventRecord, Snapshot } from '../../../shared/types'
import { addDays, dateISO, startOfWeek, summarize } from '../../../shared/core'
import { PageHeader } from '../components/UI'

type Period = 'week' | 'month' | 'year'

export default function Reports({ snapshot }: { snapshot: Snapshot }) {
  const [period, setPeriod] = useState<Period>('week')
  const data = useMemo(() => buildReport(snapshot.events, period), [snapshot.events, period])
  const summary = summarize(data.events, data.dayCount)
  const chartOption = useMemo(() => ({
    animationDuration: 900,
    grid: { left: 44, right: 18, top: 24, bottom: 38 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(11,55,110,.94)', borderWidth: 0, textStyle: { color: '#fff' }, formatter: (params: Array<{ axisValue: string; value: number }>) => params[0].axisValue + '<br/>健康变化 <b>' + (params[0].value > 0 ? '+' : '') + params[0].value + '</b>' },
    xAxis: { type: 'category', data: data.labels, axisLine: { lineStyle: { color: '#dce8f7' } }, axisTick: { show: false }, axisLabel: { color: '#70849b', interval: data.labels.length > 14 ? Math.ceil(data.labels.length / 8) : 0 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#edf3fb', type: 'dashed' } }, axisLabel: { color: '#70849b' } },
    series: [{ type: 'bar', data: data.values.map((value) => ({ value, itemStyle: { color: value >= 0 ? '#2f6fed' : '#ea6a67', borderRadius: value >= 0 ? [8, 8, 2, 2] : [2, 2, 8, 8] } })), barMaxWidth: 26, emphasis: { itemStyle: { shadowBlur: 16, shadowColor: 'rgba(47,111,237,.28)' } } }]
  }), [data])
  return <div className="page reports-page">
    <PageHeader eyebrow="HEALTH ANALYTICS" title="趋势报告" subtitle="让数据替你看见长期变化，找到真正的增益来源和健康值杀手。" actions={<div className="segmented">{(['week', 'month', 'year'] as Period[]).map((item) => <button key={item} className={period === item ? 'active' : ''} onClick={() => setPeriod(item)}>{item === 'week' ? '周报' : item === 'month' ? '月报' : '年度报告'}</button>)}</div>} />
    <section className="stats-grid report-stats"><Metric icon={<Gauge size={18}/>} label="健康净变化" value={(summary.totalHealth > 0 ? '+' : '') + summary.totalHealth} tone={summary.totalHealth >= 0 ? 'blue' : 'red'}/><Metric icon={<CalendarRange size={18}/>} label="签到天数" value={summary.checkinDays + ' 天'} tone="cyan"/><Metric icon={<Coins size={18}/>} label="获得元气币" value={'+' + summary.totalCoins} tone="gold"/><Metric icon={<Sparkles size={18}/>} label="心情净变化" value={(summary.totalMood > 0 ? '+' : '') + summary.totalMood} tone="purple"/></section>
    <section className="report-layout">
      <article className="glass-card chart-card"><div className="card-heading"><div><span className="eyebrow">TREND VISUALIZATION</span><h3>健康变化趋势</h3></div><span className="muted-label">{data.range}</span></div><ReactECharts option={chartOption} style={{ height: 330, width: '100%' }}/></article>
      <aside className="report-side"><article className="glass-card insight-card"><div className="card-heading"><div><span className="eyebrow">BEHAVIOR INSIGHT</span><h3>行为洞察</h3></div></div><div className="insight-row gain"><i><ArrowUpRight size={18}/></i><div><span>增益最多</span><strong>{summary.topGain ? summary.topGain[0] + '  +' + summary.topGain[1] : '暂无正向记录'}</strong></div></div><div className="insight-row loss"><i><ArrowDownRight size={18}/></i><div><span>健康值杀手</span><strong>{summary.topLoss ? summary.topLoss[0] + '  -' + summary.topLoss[1] : '暂无负向记录'}</strong></div></div><p>本周期平均每日健康变化 {summary.averageDailyHealth > 0 ? '+' : ''}{summary.averageDailyHealth.toFixed(1)}。</p></article><article className="glass-card ai-advice"><i><Bot size={22}/></i><div><span className="eyebrow">LOCAL AI SUGGESTION</span><h3>下一步建议</h3><p>{reportAdvice(summary.topLoss?.[0] ?? null, summary.totalHealth, snapshot.user.mood)}</p></div></article></aside>
    </section>
  </div>
}

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) { return <article className={'glass-card metric-card tone-' + tone}><i>{icon}</i><span>{label}</span><strong>{value}</strong></article> }

function buildReport(events: EventRecord[], period: Period) {
  const now = new Date()
  let start: Date
  let end: Date
  if (period === 'week') { start = startOfWeek(now); end = addDays(start, 7) }
  else if (period === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 1) }
  else { start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear() + 1, 0, 1) }
  const startKey = dateISO(start); const endKey = dateISO(end)
  const selected = events.filter((event) => event.localDate >= startKey && event.localDate < endKey)
  if (period === 'year') {
    const values = Array(12).fill(0) as number[]
    selected.forEach((event) => { values[Number(event.localDate.slice(5, 7)) - 1] += event.effectiveHealth })
    return { events: selected, values, labels: values.map((_, index) => (index + 1) + '月'), dayCount: 365, range: start.getFullYear() + ' 年' }
  }
  const count = Math.round((end.getTime() - start.getTime()) / 86400000)
  const values = Array(count).fill(0) as number[]
  selected.forEach((event) => { const index = Math.floor((new Date(event.localDate + 'T00:00:00').getTime() - start.getTime()) / 86400000); if (index >= 0) values[index] += event.effectiveHealth })
  const labels = Array.from({ length: count }, (_, index) => { const day = addDays(start, index); return period === 'week' ? (day.getMonth() + 1) + '/' + day.getDate() : String(day.getDate()) })
  return { events: selected, values, labels, dayCount: count, range: startKey.replaceAll('-', '.') + ' — ' + dateISO(addDays(end, -1)).replaceAll('-', '.') }
}

function reportAdvice(loss: string | null, health: number, mood: number) {
  if (loss === '熬夜') return '把今晚的关灯时间提前 30 分钟，连续执行三次后再比较报告。'
  if (health < 0) return '下一周期只选一个最主要的负向行为进行干预，不要同时改变所有习惯。'
  if (mood > 60) return '心情倍率正处于高收益区，安排一次 25 分钟专注学习或健身打卡。'
  return '保持当前正向行为的时间段和频率，先稳定节律，再逐步增加强度。'
}
