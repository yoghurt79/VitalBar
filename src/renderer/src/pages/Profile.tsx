import { useEffect, useState } from 'react'
import { BellRing, Database, Download, LogOut, MonitorCog, Save, ShieldCheck, Sparkles, Trophy } from 'lucide-react'
import type { Snapshot, UserSettings } from '../../../shared/types'
import { calculateStreak, LEVEL_TITLES, levelProgress } from '../../../shared/core'
import { Avatar, PageHeader, StatPill, userTitle } from '../components/UI'

interface Props {
  snapshot: Snapshot
  onSaveSettings: (settings: UserSettings) => Promise<void>
  onExport: () => Promise<void>
  onOpenRules: () => void
  onLogout: () => void
}

export default function Profile({ snapshot, onSaveSettings, onExport, onOpenRules, onLogout }: Props) {
  const [settings, setSettings] = useState(snapshot.settings)
  useEffect(() => setSettings(snapshot.settings), [snapshot.settings])
  const progress = levelProgress(snapshot.user.lifetimeXp)
  const streak = calculateStreak(snapshot.events.map((event) => event.localDate))
  const achievements = [
    { label: '初次签到', unlocked: snapshot.events.length > 0, icon: '01' },
    { label: '连续 3 天', unlocked: streak >= 3, icon: '03' },
    { label: '长期学习', unlocked: snapshot.events.some((event) => event.behaviorName === '学习'), icon: '学' },
    { label: '元气收藏家', unlocked: snapshot.purchases.length >= 2, icon: '藏' }
  ]
  return <div className="page profile-page">
    <PageHeader eyebrow="PERSONAL SPACE" title="我的空间" subtitle="管理称号、成就、提醒和本地数据，让自律形成完整闭环。" actions={<button className="ghost-button danger-ghost" onClick={onLogout}><LogOut size={15}/>退出登录</button>}/>
    <section className="profile-grid">
      <article className="glass-card identity-card">
        <div className="identity-main"><Avatar user={snapshot.user} size={118}/><div className="identity-copy"><span className="user-title">✦ {userTitle(snapshot.user)} ✦</span><h2>{snapshot.user.username}</h2><p>自律等级 Lv.{progress.level} · {LEVEL_TITLES[progress.level]}</p><div className="progress-track large"><i style={{ width: progress.percent + '%' }}/></div><small>{progress.needed ? '当前等级经验 ' + progress.current + ' / ' + progress.needed : '已达成最高等级'}</small></div></div>
        <div className="profile-stats"><StatPill label="健康值" value={snapshot.user.currentHealth + '/200'} tone="blue"/><StatPill label="心情值" value={snapshot.user.mood + '/100'} tone="purple"/><StatPill label="元气币" value={snapshot.user.coins} tone="gold"/><StatPill label="累计经验" value={snapshot.user.lifetimeXp} tone="cyan"/><StatPill label="签到天数" value={snapshot.events.length ? new Set(snapshot.events.map((event) => event.localDate)).size : 0} tone="green"/><StatPill label="连续天数" value={streak} tone="red"/></div>
      </article>
      <article className="glass-card achievements-card"><div className="card-heading"><div><span className="eyebrow">ACHIEVEMENTS</span><h3>成长徽记</h3></div><Trophy size={21}/></div><div className="achievement-grid">{achievements.map((item) => <div className={'achievement ' + (item.unlocked ? 'unlocked' : '')} key={item.label}><i>{item.unlocked ? item.icon : '锁'}</i><span>{item.label}</span></div>)}</div><button className="ghost-button full" onClick={onOpenRules}><MonitorCog size={15}/>调整行为分值</button></article>
    </section>
    <section className="profile-bottom">
      <article className="glass-card title-ladder"><div className="card-heading"><div><span className="eyebrow">TITLE JOURNEY</span><h3>自律称号阶梯</h3></div><Sparkles size={20}/></div><div className="title-ladder-grid">{LEVEL_TITLES.map((title, index) => { const unlocked = progress.level >= index; return <div className={'title-step step-' + index + (unlocked ? ' unlocked' : '')} key={title}><span>{unlocked ? '✦' : '锁'}</span><strong>{title}</strong><small>Lv.{index}</small></div> })}</div></article>
      <article className="glass-card settings-card"><div className="card-heading"><div><span className="eyebrow">PREFERENCES</span><h3>提醒与系统设置</h3></div><BellRing size={20}/></div><SettingSwitch label="启用早晚打卡提醒" checked={settings.notificationsEnabled} onChange={(value) => setSettings({ ...settings, notificationsEnabled: value })}/><div className="time-grid"><label><span>早间提醒</span><input type="time" value={settings.morningTime} onChange={(event) => setSettings({ ...settings, morningTime: event.target.value })}/></label><label><span>晚间提醒</span><input type="time" value={settings.eveningTime} onChange={(event) => setSettings({ ...settings, eveningTime: event.target.value })}/></label></div><SettingSwitch label="关闭窗口后驻留系统托盘" checked={settings.minimizeToTray} onChange={(value) => setSettings({ ...settings, minimizeToTray: value })}/><SettingSwitch label="开机自动启动" checked={settings.launchAtStartup} onChange={(value) => setSettings({ ...settings, launchAtStartup: value })}/><div className="settings-actions"><button className="primary-button" onClick={() => void onSaveSettings(settings)}><Save size={15}/>保存设置</button><button className="ghost-button" onClick={() => void onExport()}><Download size={15}/>导出数据</button></div></article>
    </section>
    <section className="glass-card storage-card"><i><Database size={20}/></i><div><strong>本地离线存储</strong><p>账户密码使用 PBKDF2 加盐哈希，行为记录与购买信息只保存在本机。</p></div><span><ShieldCheck size={16}/>无需联网</span></section>
  </div>
}

function SettingSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="switch-row"><span>{label}</span><button type="button" className={'switch ' + (checked ? 'on' : '')} onClick={() => onChange(!checked)}><i/></button></label> }
