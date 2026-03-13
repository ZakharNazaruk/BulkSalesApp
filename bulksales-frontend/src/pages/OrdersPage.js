import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { bulkApi } from '../misc/BulkApi'

function OrdersPage() {
  const { userIsAuthenticated, getUser } = useAuth()
  const user = getUser()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      if (!userIsAuthenticated() || (user.role !== 'USER' && user.role !== 'CLIENT')) { setLoading(false); return }
      try {
        const meResp = await bulkApi.getMe()
        await load(meResp.data?.id)
      } catch (_) {
        await load(null) // fallback to /me
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = async (uid) => {
    try {
      const resp = uid ? await bulkApi.getOrdersByUser(uid) : await bulkApi.getMyOrders()
      const data = resp && resp.data ? resp.data : []
      setOrders(Array.isArray(data) ? data : (data?.content ?? []))
    } catch (e) {
      setError('Failed to load orders')
    } finally { setLoading(false) }
  }

  if (!userIsAuthenticated() || (user.role !== 'USER' && user.role !== 'CLIENT')) return <div style={{ padding: '2rem' }}>Please login as USER to view orders.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '2rem' }}>
        <h1 style={{ marginTop: 0 }}>Your Orders</h1>
        {loading ? (<p>Loading...</p>) : error ? (<>
          <p style={{ color: 'red' }}>{error}</p>
          <p style={{ color: 'var(--muted)' }}>Проверьте, что вы авторизованы как USER. Если проблема сохраняется, уточните сообщение ошибки в консоли.</p>
        </>) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {!Array.isArray(orders) ? (
              <p style={{ color: 'red' }}>Unexpected response format</p>
            ) : orders.length === 0 ? (
              <p>No orders yet.</p>
            ) : (
              <>
                <div style={styles.totalBar}>
                  <div style={{ fontWeight: 700 }}>Общая сумма заказов</div>
                  <div style={{ fontWeight: 800 }}>{orders.reduce((acc, o) => {
                    const v = typeof o.totalPrice === 'number' ? o.totalPrice : parseFloat(o.totalPrice || '0')
                    return acc + (isNaN(v) ? 0 : v)
                  }, 0).toFixed(2)}</div>
                </div>
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>ID</th>
                        <th style={styles.th}>Создан</th>
                        <th style={styles.th}>Статус</th>
                        <th style={styles.th}>Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id} style={styles.tr}>
                          <td style={styles.td}>{o.id}</td>
                          <td style={styles.td}>{o.createdAt ?? ''}</td>
                          <td style={styles.td}><span style={{...styles.chip, background: (o.status||'')==='APPROVED'? '#d1fae5': (o.status||'')==='REJECTED'? '#fee2e2' : '#e0e7ff', color: '#111'}}>{o.status || 'PENDING_CONFIRMATION'}</span></td>
                          <td style={{ ...styles.td, fontWeight: 700 }}>{o.totalPrice != null ? `${o.totalPrice} р` : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

const styles = {
  tableWrap: { overflowX: 'auto', background: 'var(--card)', borderRadius: 12, boxShadow: '0 8px 20px var(--shadow)' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  th: { textAlign: 'left', padding: '0.75rem 0.9rem', borderBottom: '1px solid #eee', background: 'var(--card)' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '0.75rem 0.9rem' },
  chip: { padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.85rem' },
  totalBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', background: 'var(--card)', borderRadius: 12, boxShadow: '0 8px 20px var(--shadow)' }
}

export default OrdersPage


