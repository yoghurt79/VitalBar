import { useEffect } from 'react'
import { api } from '../lib/api'

export default function TitleBar({ dark = false }: { dark?: boolean }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F11') {
        event.preventDefault()
        void api.windowAction('maximize')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return <header className={'app-titlebar native-titlebar ' + (dark ? 'titlebar-dark' : 'titlebar-glass')}>
    <div className="titlebar-drag-region">
      <span className="titlebar-mark">元</span>
      <strong>元气条</strong>
      <span className="titlebar-divider"/>
      <small>VITALBAR · 本地离线运行</small>
    </div>
    <div className="native-window-spacer" aria-hidden="true"/>
  </header>
}
