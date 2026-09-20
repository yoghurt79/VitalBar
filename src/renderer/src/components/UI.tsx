import type { CSSProperties, ReactNode } from 'react'
import { Activity, BookOpen, Dumbbell, Gamepad2, Minus, Moon, Sparkles, Utensils, Video, X } from 'lucide-react'
import type { BehaviorDefinition, ShopItem, UserRecord } from '../../../shared/types'
import { api } from '../lib/api'
import { levelFromXp, LEVEL_TITLES } from '../../../shared/core'
import { SHOP_ITEMS } from '../../../shared/shop'

export const behaviorIcons: Record<string, typeof Activity> = {
  moon: Moon,
  book: BookOpen,
  dumbbell: Dumbbell,
  gamepad: Gamepad2,
  video: Video,
  utensils: Utensils
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return <div className={`brand-logo ${compact ? 'compact' : ''}`}><span>元</span><div><strong>元气条</strong><small>VITALBAR</small></div></div>
}

export function WindowBar() {
  const action = (value: 'minimize' | 'maximize' | 'close') => void api.windowAction(value)
  return <div className="window-bar no-drag"><button type="button" className="window-button" onMouseDown={(event) => event.stopPropagation()} onClick={() => action('minimize')} aria-label="最小化"><Minus size={14}/></button><button type="button" className="window-button" onMouseDown={(event) => event.stopPropagation()} onClick={() => action('maximize')} aria-label="全屏 / 最大化"><span className="maximize-icon"/></button><button type="button" className="window-button close" onMouseDown={(event) => event.stopPropagation()} onClick={() => action('close')} aria-label="关闭"><X size={14}/></button></div>
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle: string; actions?: ReactNode }) {
  return <header className="page-header"><div><span className="eyebrow">{eyebrow ?? 'VITALBAR'}</span><h1>{title}</h1><p>{subtitle}</p></div>{actions && <div className="header-actions">{actions}</div>}</header>
}

export function Avatar({ user, size = 64, className = '' }: { user: UserRecord; size?: number; className?: string }) {
  const initial = [...user.username][0] ?? '元'
  const style = { '--avatar-size': size + 'px' } as CSSProperties
  return <div className={`avatar avatar-${user.equippedFrame || 'default'} ${className}`} style={style}><div className="avatar-core"><span>{initial}</span></div>{user.equippedBadge && <i className="avatar-badge"><Sparkles size={10}/></i>}{user.equippedDecoration === 'decor_cloud' && <i className="avatar-cloud"/>}{user.equippedFrame === 'frame_crown' && <i className="avatar-crown">♛</i>}</div>
}

export function userTitle(user: UserRecord) {
  const shopTitle = SHOP_ITEMS.find((item) => item.key === user.equippedTitle)
  return shopTitle?.name ?? LEVEL_TITLES[levelFromXp(user.lifetimeXp)]
}

export function EnergyGauge({ value, max = 200, label = '健康值', color = '#2f6fed' }: { value: number; max?: number; label?: string; color?: string }) {
  const percent = Math.max(0, Math.min(100, value / max * 100))
  return <div className="energy-gauge" style={{ '--gauge': percent * 3.6 + 'deg', '--gauge-color': color } as CSSProperties}><div className="energy-gauge-inner"><strong>{value}</strong><span>/ {max}</span><small>{label}</small></div></div>
}

export function BehaviorGlyph({ behavior, size = 24 }: { behavior: BehaviorDefinition; size?: number }) {
  const Icon = behaviorIcons[behavior.icon] ?? Activity
  return <Icon size={size} strokeWidth={2.2}/>
}

export function ShopGlyph({ item }: { item: ShopItem }) {
  if (item.type === 'frame') return <div className="shop-glyph frame-glyph" style={{ '--item': item.color, '--item-soft': item.accent } as CSSProperties}><span>元</span></div>
  if (item.type === 'badge') return <div className="shop-glyph badge-glyph" style={{ '--item': item.color, '--item-soft': item.accent } as CSSProperties}><Sparkles size={28}/></div>
  if (item.type === 'decoration') return <div className="shop-glyph decor-glyph" style={{ '--item': item.color, '--item-soft': item.accent } as CSSProperties}><i/><i/><i/></div>
  return <div className="shop-glyph title-glyph" style={{ '--item': item.color, '--item-soft': item.accent } as CSSProperties}><span>称</span><small>专属</small></div>
}

export function Modal({ title, children, onClose, danger = false }: { title: string; children: ReactNode; onClose: () => void; danger?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}><section className={`modal-card ${danger ? 'danger' : ''}`}><button className="modal-close" onClick={onClose}><X size={17}/></button><h3>{title}</h3>{children}</section></div>
}

export function Toast({ message, tone = 'info', onClose }: { message: string; tone?: 'info' | 'success' | 'warning' | 'danger'; onClose: () => void }) {
  return <div className={`toast toast-${tone}`}><span className="toast-dot"/><div><strong>{tone === 'danger' ? '操作失败' : tone === 'warning' ? '请注意' : tone === 'success' ? '操作成功' : '元气条'}</strong><p>{message}</p></div><button onClick={onClose}><X size={15}/></button></div>
}

export function StatPill({ label, value, tone = 'blue' }: { label: string; value: string | number; tone?: 'blue' | 'cyan' | 'purple' | 'gold' | 'green' | 'red' }) {
  return <div className={`stat-pill tone-${tone}`}><span>{label}</span><strong>{value}</strong></div>
}
