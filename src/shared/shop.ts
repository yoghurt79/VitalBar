import type { ShopItem } from './types'

export const SHOP_ITEMS: ShopItem[] = [
  { key: 'frame_mist', name: '晨雾光环', type: 'frame', price: 60, color: '#79c7f7', accent: '#dff4ff', description: '清透蓝环，记录每一次清醒的清晨。' },
  { key: 'frame_pulse', name: '蓝色脉冲', type: 'frame', price: 120, color: '#3a75f2', accent: '#dce8ff', description: '连续脉冲象征稳定积累的自律能量。' },
  { key: 'frame_galaxy', name: '星河框', type: 'frame', price: 220, color: '#7b6be8', accent: '#eeeaff', description: '深蓝星河环绕头像，适合节律以上的自律者。' },
  { key: 'frame_crown', name: '元气王冠', type: 'frame', price: 360, color: '#e0a329', accent: '#fff1c6', description: '金色王冠与蓝色光环，展示长期掌控力。' },
  { key: 'badge_early', name: '早起星', type: 'badge', price: 80, color: '#f1a93b', accent: '#fff0cb', description: '把早起这件事，变成随身闪烁的星。' },
  { key: 'badge_seven', name: '节律徽章', type: 'badge', price: 100, color: '#21b8ad', accent: '#d9f8f5', description: '奖励持续建立生活节律的你。' },
  { key: 'badge_master', name: '元气徽章', type: 'badge', price: 260, color: '#2f6fed', accent: '#dae8ff', description: '高等级自律者的专属蓝色徽章。' },
  { key: 'decor_cloud', name: '云朵陪伴', type: 'decoration', price: 90, color: '#8ecbff', accent: '#e2f3ff', description: '一小朵云停在个人信息卡角落，提醒你慢一点、稳一点。' },
  { key: 'decor_spark', name: '元气星光', type: 'decoration', price: 150, color: '#49d5df', accent: '#dcfbfc', description: '细碎星光点缀主页，低调但精致。' },
  { key: 'title_early_sleeper', name: '连续早睡7天·节律者', type: 'title', price: 180, color: '#2f6fed', accent: '#dce9ff', description: '商店专属称号，会展示在用户名上方。' }
]
