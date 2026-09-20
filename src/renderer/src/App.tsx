import { useEffect, useState } from 'react'
import { BarChart3, CalendarDays, CircleUserRound, Cloud, Coins, LayoutDashboard, LogOut, ShieldCheck, ShoppingBag, WifiOff } from 'lucide-react'
import type { BehaviorDefinition, PageKey, ShopItem, Snapshot, UserSettings } from '../../shared/types'
import { levelFromXp, levelProgress } from '../../shared/core'
import { api, isElectron } from './lib/api'
import { Avatar, Logo, Modal, Toast, userTitle } from './components/UI'
import TitleBar from './components/TitleBar'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Reports from './pages/Reports'
import Shop from './pages/Shop'
import Profile from './pages/Profile'
import Login from './pages/Login'

const navItems: Array<{ key: PageKey; label: string; caption: string; icon: typeof LayoutDashboard }> = [
  { key: 'dashboard', label: '今日状态', caption: '记录与反馈', icon: LayoutDashboard },
  { key: 'calendar', label: '日历热图', caption: '签到与趋势', icon: CalendarDays },
  { key: 'reports', label: '趋势报告', caption: '周月年数据', icon: BarChart3 },
  { key: 'shop', label: '元气商店', caption: '奖励与装扮', icon: ShoppingBag },
  { key: 'profile', label: '我的空间', caption: '称号与设置', icon: CircleUserRound }
]

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [page, setPage] = useState<PageKey>('dashboard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ message: string; tone: 'info' | 'success' | 'warning' | 'danger' } | null>(null)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('demo') !== '1') return
    const requested = params.get('page') as PageKey | null
    if (requested) setPage(requested)
    const loadDemo = async () => {
      try { setSnapshot(await api.login('元气测试员', 'secret12')) }
      catch { setSnapshot(await api.register('元气测试员', 'secret12')) }
    }
    void loadDemo()
  }, [])
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer) }, [])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 4200); return () => clearTimeout(timer) }, [toast])
  const notify = (message: string, tone: 'info' | 'success' | 'warning' | 'danger' = 'info') => setToast({ message, tone })

  const authenticate = async (mode: 'login' | 'register', username: string, password: string) => {
    setLoading(true); setError('')
    try { setSnapshot(mode === 'login' ? await api.login(username, password) : await api.register(username, password)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : '无法登录，请稍后重试') }
    finally { setLoading(false) }
  }

  const record = async (behavior: BehaviorDefinition) => {
    if (!snapshot) return
    const beforeLevel = levelProgress(snapshot.user.lifetimeXp).level
    try {
      const result = await api.recordBehavior(snapshot.user.id, behavior.key)
      setSnapshot(result.snapshot)
      const health = result.effect.effectiveHealth
      if (health === 0 && behavior.isPositive) notify('正向行为已记录；本次基础分值为 0，完成下一步行为会继续积累经验。', 'warning')
      else notify('健康 ' + (health > 0 ? '+' : '') + health + ' · 心情 ' + (behavior.moodDelta > 0 ? '+' : '') + behavior.moodDelta + ' · 元气币 +' + result.effect.coinsDelta, behavior.isPositive ? 'success' : 'warning')
      const afterLevel = levelProgress(result.snapshot.user.lifetimeXp).level
      if (afterLevel > beforeLevel) setTimeout(() => notify('升级！你已解锁称号「' + userTitle(result.snapshot.user) + '」', 'success'), 350)
    } catch (reason) { notify(reason instanceof Error ? reason.message : '记录失败', 'danger') }
  }

  const updateSettings = async (settings: UserSettings) => { if (!snapshot) return; try { setSnapshot(await api.updateSettings(snapshot.user.id, settings)); notify('提醒与系统设置已保存', 'success') } catch (reason) { notify(reason instanceof Error ? reason.message : '保存失败', 'danger') } }
  const purchase = async (item: ShopItem) => { if (!snapshot) return; try { setSnapshot(await api.purchase(snapshot.user.id, item.key)); setSnapshot(await api.equip(snapshot.user.id, item.key)) } catch (reason) { notify(reason instanceof Error ? reason.message : '兑换失败', 'danger') } }
  const equip = async (item: ShopItem) => { if (!snapshot) return; try { setSnapshot(await api.equip(snapshot.user.id, item.key)) } catch (reason) { notify(reason instanceof Error ? reason.message : '装备失败', 'danger') } }
  const exportData = async () => { if (!snapshot) return; try { const result = await api.exportData(snapshot.user.id); if (result.saved) notify('数据已导出到 ' + result.path, 'success'); else if (!isElectron) notify('浏览器预览模式不提供文件导出', 'warning') } catch (reason) { notify(reason instanceof Error ? reason.message : '导出失败', 'danger') } }

  if (!snapshot) return <><TitleBar dark/><Login onAuth={authenticate} loading={loading} error={error}/>{toast && <Toast {...toast} onClose={() => setToast(null)}/>}</>
  const title = userTitle(snapshot.user)
  const level = levelFromXp(snapshot.user.lifetimeXp)
  return <><TitleBar/><div className="app-shell top-layout">
    <div className="aurora-layer" aria-hidden="true"><i/><i/><i/></div>
    <header className="app-navbar">
      <div className="nav-brand"><Logo compact/></div>
      <nav className="nav-links">{navItems.map((item) => { const Icon = item.icon; return <button key={item.key} className={page === item.key ? 'active' : ''} onClick={() => setPage(item.key)}><i><Icon size={17}/></i><span><strong>{item.label}</strong><small>{item.caption}</small></span></button> })}</nav>
      <div className="nav-actions"><div className="nav-coin"><Coins size={15}/><span>元气币</span><strong>{snapshot.user.coins}</strong></div><div className="nav-user"><Avatar user={snapshot.user} size={38}/><div><span>{title}</span><strong>{snapshot.user.username}</strong></div></div><button className="nav-logout" title="退出登录" onClick={() => { setSnapshot(null); setPage('dashboard') }}><LogOut size={16}/></button></div>
    </header>
    <main className="workspace">
      <div className="page-scroll"><div className="page-transition" key={page}>{page === 'dashboard' && <Dashboard snapshot={snapshot} onRecord={record} onOpenRules={() => setRulesOpen(true)}/>}{page === 'calendar' && <Calendar snapshot={snapshot}/>}{page === 'reports' && <Reports snapshot={snapshot}/>}{page === 'shop' && <Shop snapshot={snapshot} onPurchase={purchase} onEquip={equip} onToast={notify}/>}{page === 'profile' && <Profile snapshot={snapshot} onSaveSettings={updateSettings} onExport={exportData} onOpenRules={() => setRulesOpen(true)} onLogout={() => { setSnapshot(null); setPage('dashboard') }}/>}</div></div>
      <footer className="status-bar"><span><WifiOff size={12}/><ShieldCheck size={12}/>所有数据仅存储于本机</span><span>{now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} · {now.toLocaleTimeString('zh-CN', { hour12: false })}</span></footer>
    </main>
    {rulesOpen && <BehaviorRules snapshot={snapshot} onClose={() => setRulesOpen(false)} onSave={async (behaviors) => { let updated = snapshot; for (const behavior of behaviors) updated = await api.updateBehavior(snapshot.user.id, behavior.key, behavior.healthDelta, behavior.moodDelta); setSnapshot(updated); setRulesOpen(false); notify('行为分值已更新', 'success') }} onRestore={async () => { const updated = await api.restoreBehaviors(snapshot.user.id); setSnapshot(updated); setRulesOpen(false); notify('已恢复默认行为分值', 'success') }}/>}
    {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
  </div></> 
}

function BehaviorRules({ snapshot, onClose, onSave, onRestore }: { snapshot: Snapshot; onClose: () => void; onSave: (items: BehaviorDefinition[]) => Promise<void>; onRestore: () => Promise<void> }) {
  const [items, setItems] = useState(() => snapshot.behaviors.map((item) => ({ ...item })))
  const setValue = (key: string, field: 'healthDelta' | 'moodDelta', value: string) => setItems((current) => current.map((item) => item.key === key ? { ...item, [field]: Number(value) } : item))
  return <Modal title="调整行为分值" onClose={onClose}><p className="modal-description">分值仅用于之后的记录，不会改写历史数据。</p><div className="rules-table"><div className="rules-head"><span>行为</span><span>健康值</span><span>心情值</span></div>{items.map((item) => <div className="rules-row" key={item.key}><strong>{item.name}</strong><input type="number" value={item.healthDelta} onChange={(event) => setValue(item.key, 'healthDelta', event.target.value)}/><input type="number" value={item.moodDelta} onChange={(event) => setValue(item.key, 'moodDelta', event.target.value)}/></div>)}</div><div className="modal-actions"><button className="ghost-button" onClick={() => void onRestore()}>恢复默认</button><button className="ghost-button" onClick={onClose}>取消</button><button className="primary-button" onClick={() => void onSave(items)}>保存设置</button></div></Modal>
}
