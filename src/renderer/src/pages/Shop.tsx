import { useState } from 'react'
import { Check, Coins, LockKeyhole, Sparkles } from 'lucide-react'
import type { ShopItem, Snapshot } from '../../../shared/types'
import { SHOP_ITEMS } from '../../../shared/shop'
import { Modal, PageHeader, ShopGlyph } from '../components/UI'

const filters = [
  ['all', '全部'], ['frame', '头像框'], ['badge', '徽章'], ['decoration', '装饰'], ['title', '专属称号']
] as const

export default function Shop({ snapshot, onPurchase, onEquip, onToast }: { snapshot: Snapshot; onPurchase: (item: ShopItem) => Promise<void>; onEquip: (item: ShopItem) => Promise<void>; onToast: (message: string, tone?: 'info' | 'success' | 'warning' | 'danger') => void }) {
  const [filter, setFilter] = useState<(typeof filters)[number][0]>('all')
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null)
  const items = SHOP_ITEMS.filter((item) => filter === 'all' || item.type === filter)
  const equippedKey = (item: ShopItem) => item.type === 'frame' ? snapshot.user.equippedFrame : item.type === 'badge' ? snapshot.user.equippedBadge : item.type === 'decoration' ? snapshot.user.equippedDecoration : snapshot.user.equippedTitle

  const act = async (item: ShopItem) => {
    const owned = snapshot.purchases.includes(item.key)
    if (owned) { await onEquip(item); onToast('已装备「' + item.name + '」', 'success'); return }
    if (snapshot.user.coins < item.price) { onToast('还需要 ' + (item.price - snapshot.user.coins) + ' 枚元气币，继续完成正向行为即可积累。', 'warning'); return }
    setConfirmItem(item)
  }

  return <div className="page shop-page">
    <PageHeader eyebrow="REWARD LOOP" title="元气商店" subtitle="正向行为赚取元气币，把自律变成值得收藏的成长印记。" actions={<div className="coin-balance"><Coins size={19}/><span>当前元气币</span><strong>{snapshot.user.coins}</strong></div>}/>
    <div className="shop-toolbar"><div className="filter-tabs">{filters.map(([key, label]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}</button>)}</div><span><Sparkles size={15}/>代码绘制的离线装扮，不依赖网络图片</span></div>
    <section className="shop-grid">{items.map((item) => {
      const owned = snapshot.purchases.includes(item.key)
      const equipped = equippedKey(item) === item.key
      return <article className={'shop-card ' + (equipped ? 'equipped' : '')} key={item.key}><div className="shop-card-top"><ShopGlyph item={item}/><span className={'shop-type type-' + item.type}>{item.type === 'frame' ? '头像框' : item.type === 'badge' ? '徽章' : item.type === 'decoration' ? '装饰' : '专属称号'}</span></div><h3>{item.name}</h3><p>{item.description}</p><div className="shop-card-footer"><span className="price"><Coins size={15}/>{item.price}</span><button className={equipped ? 'equipped-button' : owned ? 'primary-button compact' : 'gold-button'} onClick={() => void act(item)}>{equipped ? <><Check size={15}/>已装备</> : owned ? '立即装备' : <><LockKeyhole size={14}/>购买并装备</>}</button></div></article>
    })}</section>
    {confirmItem && <Modal title={'兑换「' + confirmItem.name + '」？'} onClose={() => setConfirmItem(null)}><div className="purchase-preview"><ShopGlyph item={confirmItem}/><div><strong>{confirmItem.name}</strong><span>将消耗 {confirmItem.price} 枚元气币</span><small>兑换后永久保存在当前账户，并立即装备。</small></div></div><div className="modal-actions"><button className="ghost-button" onClick={() => setConfirmItem(null)}>取消</button><button className="gold-button" onClick={async () => { const item = confirmItem; setConfirmItem(null); await onPurchase(item); onToast('兑换成功，已装备「' + item.name + '」', 'success') }}>确认兑换</button></div></Modal>}
  </div>
}
