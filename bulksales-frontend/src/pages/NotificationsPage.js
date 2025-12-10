import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { bulkApi } from '../misc/BulkApi'
import { useAuth } from '../context/AuthContext'

function NotificationsPage() {
  const { userIsAuthenticated, getUser } = useAuth()
  const user = getUser()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    if (!userIsAuthenticated()) {
      setError('Пожалуйста, войдите в систему для просмотра уведомлений')
      setLoading(false)
      return
    }

    try {
      console.log('Загрузка уведомлений для пользователя:', user?.username)
      const resp = await bulkApi.getNotifications()
      console.log('Полный ответ API:', resp)
      console.log('Тип данных resp.data:', typeof resp.data)
      console.log('Это массив?', Array.isArray(resp.data))
      
      // Обработка различных форматов ответа
      let notifications = []
      if (Array.isArray(resp.data)) {
        notifications = resp.data
      } else if (resp.data && Array.isArray(resp.data.content)) {
        // Если данные в формате Page (Spring Data)
        notifications = resp.data.content
      } else if (resp.data && Array.isArray(resp.data.notifications)) {
        notifications = resp.data.notifications
      } else if (resp.data) {
        console.warn('Неожиданный формат данных:', resp.data)
        notifications = []
      }
      
      console.log('Обработанные уведомления:', notifications)
      setItems(notifications)
      setError('')
    } catch (e) {
      console.error('Ошибка загрузки уведомлений:', e)
      console.error('Детали ошибки:', {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message
      })
      const errorMsg = e?.response?.data?.message || e?.message || 'Не удалось загрузить уведомления'
      setError(`Ошибка: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markRead = async (id) => {
    try { await bulkApi.markNotificationRead(id); load(); window.dispatchEvent(new CustomEvent('notifications-updated')) } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0 }}>🔔 Уведомления</h1>
          {!loading && !error && items.length > 0 && (
            <button 
              style={{ ...styles.btn, background: '#10b981' }}
              onClick={() => {
                items.filter(n => !n.readFlag).forEach(n => markRead(n.id))
              }}
            >
              Отметить все прочитанными
            </button>
          )}
        </div>
        {loading ? (
          <div style={styles.centerContent}>
            <div style={styles.spinner}></div>
            <p>Загрузка...</p>
          </div>
        ) : error ? (
          <div style={styles.errorBox}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>{error}</p>
            {!userIsAuthenticated() && (
              <a href="/login" style={styles.linkBtn}>Перейти ко входу</a>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {items.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>
                <h3>Нет уведомлений</h3>
                <p style={{ color: 'var(--muted)' }}>У вас пока нет ни одного уведомления</p>
              </div>
            ) : (
              items.map(n => (
                <div 
                  key={n.id} 
                  style={{ 
                    ...styles.item, 
                    opacity: n.readFlag ? 0.7 : 1, 
                    borderLeft: `4px solid ${n.severity==='CRITICAL' ? '#ef4444' : n.severity==='WARNING' ? '#f59e0b' : '#3b82f6'}`,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{n.title}</div>
                        {!n.readFlag && <span style={styles.unreadBadge}>Новое</span>}
                      </div>
                      <div style={{ color: 'var(--muted)', marginBottom: '0.5rem', lineHeight: 1.5 }}>{n.message}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                        {new Date(n.createdAt).toLocaleString('ru-RU', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    {!n.readFlag && (
                      <button style={styles.btn} onClick={() => markRead(n.id)}>
                        ✓ Прочитано
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

const styles = {
  item: { 
    background: 'var(--card)', 
    padding: '1.2rem 1.5rem', 
    borderRadius: 12, 
    boxShadow: '0 4px 12px var(--shadow)',
    border: '1px solid var(--border)'
  },
  btn: { 
    padding: '0.5rem 1rem', 
    border: 'none', 
    borderRadius: 8, 
    background: 'var(--primary)', 
    color: 'white', 
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '0.9rem',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  },
  unreadBadge: {
    background: '#3b82f6',
    color: 'white',
    padding: '0.2rem 0.5rem',
    borderRadius: 12,
    fontSize: '0.75rem',
    fontWeight: 600
  },
  centerContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    gap: '1rem'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid var(--border)',
    borderTop: '4px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 2rem',
    background: 'var(--card)',
    borderRadius: 16,
    textAlign: 'center',
    border: '1px solid var(--border)'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    background: 'var(--card)',
    borderRadius: 16,
    textAlign: 'center',
    border: '1px solid var(--border)'
  },
  linkBtn: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    background: 'var(--primary)',
    color: 'white',
    borderRadius: 8,
    textDecoration: 'none',
    fontWeight: 600,
    marginTop: '1rem',
    transition: 'all 0.2s ease'
  }
}

export default NotificationsPage