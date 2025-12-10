import React, { memo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'
import { useTheme } from '../context/ThemeContext'
import BroadcastModal from './BroadcastModal'
import { useToast } from '../context/ToastContext'

function Navbar() {
  const { getUser, userIsAuthenticated, userLogout } = useAuth()
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()
  const toast = useToast()
  const user = getUser()
  const [cartCount, setCartCount] = React.useState(0)
  const [notifCount, setNotifCount] = React.useState(0)
  const [showBroadcast, setShowBroadcast] = React.useState(false)
  const [showManagerMenu, setShowManagerMenu] = React.useState(false)

  React.useEffect(() => {
    const update = async () => {
      try {
        const u = getUser()
        if (u && (u.role === 'USER' || u.role === 'CLIENT')) {
          const resp = await (await import('../misc/BulkApi')).bulkApi.getCart(u.id)
          setCartCount((resp.data?.items || []).length)
        } else {
          setCartCount(0)
        }
      } catch (_) {}
    }
    update()
    const handler = () => update()
    window.addEventListener('cart-updated', handler)
    return () => window.removeEventListener('cart-updated', handler)
  }, [getUser])

  React.useEffect(() => {
    const load = async () => {
      try {
        const api = (await import('../misc/BulkApi')).bulkApi
        const c = await api.getNotificationsCount()
        setNotifCount(c.data || 0)
      } catch {}
    }
    if (userIsAuthenticated()) load()
    const h = () => load()
    window.addEventListener('notifications-updated', h)
    return () => window.removeEventListener('notifications-updated', h)
  }, [userIsAuthenticated])

  return (
    <div>
    <nav style={styles.nav}>
      <div style={styles.logo}>Оптовые продажи</div>
      <div style={styles.menu}>
        <Link to="/" style={styles.link}>{t.home}</Link>
        {/* Публичные категории показываем только не-админам/менеджерам, чтобы не было дубля */}
        {(!userIsAuthenticated() || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) && (
          <Link to="/categories" style={styles.link}>{t.categories}</Link>
        )}
        {userIsAuthenticated() && user.role === 'ADMIN' && (
          <>
            <Link to="/adminpage" style={styles.link}>{t.users}</Link>
            <Link to="/admin/analytics" style={styles.link}>{t.analytics}</Link>
          </>
        )}
        {userIsAuthenticated() && user.role === 'MANAGER' && (
          <>
            <button title="Меню менеджера" style={styles.iconBtn} onClick={()=>setShowManagerMenu(true)}>☰ Меню</button>
          </>
        )}
        {userIsAuthenticated() && user.role === 'USER' && (
          <>
            <Link to="/cart" style={{ ...styles.link, position: 'relative' }}>
              {t.cart}
              {cartCount > 0 && (
                <span style={styles.badge}>{cartCount}</span>
              )}
            </Link>
            <Link to="/orders" style={styles.link}>{t.orders}</Link>
          </>
        )}
      </div>
      <div style={styles.authMenu}>
        {userIsAuthenticated() && (
          <Link to="/notifications" title={t.notifications || 'Уведомления'} style={{ ...styles.iconBtn, position: 'relative' }}>
            🔔
            {notifCount > 0 && <span style={styles.badge}>{notifCount}</span>}
          </Link>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginRight: '1rem' }}>
          <button title={t.lang} onClick={()=>setLocale(locale==='ru'?'en':'ru')} style={styles.iconBtn}>
            🌐 {locale.toUpperCase()}
          </button>
          <button title={t.theme} onClick={()=>setTheme(theme==='light'?'dark':'light')} style={styles.iconBtn}>
            {theme==='light' ? '🌞' : '🌙'}
          </button>
        </div>
        {!userIsAuthenticated() ? (
          <>
            <Link to="/login" style={styles.link}>{t.login}</Link>
            <Link to="/signup" style={styles.link}>{t.signup}</Link>
          </>
        ) : (
          <>
            <Link to="/userpage" title={t.dashboard} style={styles.iconBtn}>
              👤
            </Link>
            <button style={styles.logoutBtn} onClick={userLogout}>{t.logout}</button>
          </>
        )}
      </div>
    </nav>
    {showBroadcast && (
      <BroadcastModal 
        onClose={()=>setShowBroadcast(false)}
        onSuccess={()=>{
          toast?.push?.('Рассылка отправлена')
          window.dispatchEvent(new CustomEvent('notifications-updated'))
        }}
      />
    )}

    {showManagerMenu && (
      <div style={styles.drawerOverlay} onClick={()=>setShowManagerMenu(false)}>
        <aside style={styles.drawer} onClick={(e)=>e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <strong>Меню менеджера</strong>
            <button style={styles.iconBtn} onClick={()=>setShowManagerMenu(false)}>✕</button>
          </div>
          <nav style={{ display: 'grid', gap: '0.5rem' }}>
            <Link to="/admin/products" style={styles.drawerLink} onClick={()=>setShowManagerMenu(false)}>{t.products}</Link>
            <Link to="/admin/categories" style={styles.drawerLink} onClick={()=>setShowManagerMenu(false)}>{t.categories}</Link>
            <Link to="/admin/planograms" style={styles.drawerLink} onClick={()=>setShowManagerMenu(false)}>{t.planograms}</Link>
            <Link to="/admin/discounts" style={styles.drawerLink} onClick={()=>setShowManagerMenu(false)}>{t.discounts}</Link>
            <Link to="/admin/product-groups" style={styles.drawerLink} onClick={()=>setShowManagerMenu(false)}>Группировки</Link>
            <Link to="/admin/banners" style={styles.drawerLink} onClick={()=>setShowManagerMenu(false)}>Баннеры</Link>
            <Link to="/admin/orders" style={styles.drawerLink} onClick={()=>setShowManagerMenu(false)}>{t.orders}</Link>
            <Link to="/admin/analytics" style={styles.drawerLink} onClick={()=>setShowManagerMenu(false)}>{t.analytics}</Link>
            <Link to="/admin/analytics-abcxyz" style={styles.drawerLink} onClick={()=>setShowManagerMenu(false)}>ABC/XYZ анализ</Link>
            <button title="Массовая рассылка" style={{ ...styles.drawerLink, textAlign: 'left' }} onClick={()=>{ setShowBroadcast(true); setShowManagerMenu(false) }}>📢 Массовая рассылка</button>
          </nav>
        </aside>
      </div>
    )}
    </div>
  )
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    background: 'linear-gradient(90deg, #6A4C93, #BDB2FF)',
    boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    color: 'white',
  },
  logo: { fontSize: '1.8rem', fontWeight: '700' },
  menu: { display: 'flex', gap: '1.5rem' },
  authMenu: { display: 'flex', gap: '1rem', alignItems: 'center' },
  link: { 
    color: 'white', 
    textDecoration: 'none', 
    fontWeight: '500',
    padding: '0.5rem 0.8rem',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.1)',
      transform: 'translateY(-2px)'
    }
  },
  username: { fontWeight: '600' },
  logoutBtn: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.3)',
      transform: 'translateY(-2px)'
    }
  },
  select: { padding: '0.2rem 0.4rem', borderRadius: '6px', border: '1px solid #ddd' },
  iconBtn: { 
    background: 'rgba(255, 255, 255, 0.1)', 
    color: 'white', 
    border: '1px solid rgba(255, 255, 255, 0.3)', 
    borderRadius: '8px', 
    padding: '0.5rem 0.8rem', 
    cursor: 'pointer', 
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.2)',
      transform: 'translateY(-2px)'
    }
  },
  drawerOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1500, display: 'flex'
  },
  drawer: {
    width: '280px', background: 'var(--card)', color: 'var(--text)', padding: '1rem', boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
  },
  drawerLink: {
    display: 'block', padding: '0.6rem 0.8rem', textDecoration: 'none', color: 'var(--text)', border: '1px solid var(--border, #eee)', borderRadius: 8, background: 'var(--bg)'
  },
  badge: {
    position: 'absolute', 
    top: '-6px', 
    right: '-10px',
    background: '#FF6B6B', 
    color: 'white', 
    borderRadius: '999px',
    fontSize: '0.7rem', 
    padding: '0.1rem 0.4rem', 
    minWidth: '18px', 
    textAlign: 'center',
    fontWeight: '600',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  },
}

export default memo(Navbar)