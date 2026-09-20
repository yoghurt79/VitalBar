import { FormEvent, useState } from 'react'
import { ArrowRight, CalendarDays, Coins, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles, TrendingUp, UserRound } from 'lucide-react'
import { Logo } from '../components/UI'
import { isElectron } from '../lib/api'

export default function Login({ onAuth, loading, error }: { onAuth: (mode: 'login' | 'register', username: string, password: string) => Promise<void>; loading: boolean; error: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError('')
    if (mode === 'register' && password !== confirm) { setLocalError('两次输入的密码不一致'); return }
    await onAuth(mode, username, password)
  }

  return <main className="auth-shell">
    <section className="auth-visual">
      <div className="auth-grid"/>
      <Logo/>
      <div className="auth-hero-copy"><span className="eyebrow light">YOUR DAILY VITALITY OS</span><h1>让自律<br/><em>看得见。</em></h1><p>把每一天的真实行动变成元气、等级、称号与可收藏的成长印记。</p></div>
      <div className="floating-dashboard">
        <div className="float-card float-health"><span>今日元气</span><strong>+135</strong><i><b style={{ width: '68%' }}/></i></div>
        <div className="float-card float-level"><TrendingUp size={20}/><div><small>自律等级</small><strong>Lv.2 · 节律</strong></div></div>
        <div className="float-card float-coin"><Coins size={20}/><div><small>元气币</small><strong>245</strong></div></div>
      </div>
      <div className="auth-features"><span><CalendarDays size={16}/>现实日历签到</span><span><Sparkles size={16}/>称号与装扮</span><span><ShieldCheck size={16}/>本地隐私存储</span></div>
    </section>
    <section className="auth-panel">
      <div className="auth-card">
        <div className="auth-mobile-logo"><Logo compact/></div>
        <span className="eyebrow">WELCOME BACK</span><h2>{mode === 'login' ? '继续你的元气节奏' : '创建独立自律账户'}</h2><p>{mode === 'login' ? '登录后继续积累每一次正向行动。' : '数据只保存在这台电脑，不连接云端。'}</p>
        <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>登录</button><button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>注册</button></div>
        <form onSubmit={submit}>
          <label className="form-field"><span>用户名</span><div><UserRound size={17}/><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="2–20 个字符" autoFocus/></div></label>
          <label className="form-field"><span>密码</span><div><LockKeyhole size={17}/><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位"/><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>
          {mode === 'register' && <label className="form-field"><span>确认密码</span><div><LockKeyhole size={17}/><input type={showPassword ? 'text' : 'password'} value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="再次输入密码"/></div></label>}
          {(localError || error) && <div className="form-error">{localError || error}</div>}
          <button className="auth-submit" disabled={loading}>{loading ? '正在连接本地存储…' : mode === 'login' ? '登录元气条' : '创建账户'}<ArrowRight size={17}/></button>
        </form>
        {!isElectron && <div className="demo-hint">当前为浏览器预览模式，输入任意 6 位密码即可查看演示数据。</div>}
        <div className="auth-security"><ShieldCheck size={15}/><span>密码使用 PBKDF2 加盐哈希，仅保存在本机</span></div>
      </div>
      <p className="auth-footer">元气条 VitalBar · 让坚持自然发生</p>
    </section>
  </main>
}
