import React, { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { bulkApi } from '../misc/BulkApi'

function OrdersAdmin() {
  const { userIsAuthenticated, getUser } = useAuth()
  const user = getUser()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('ALL')

  useEffect(() => {
    if (!userIsAuthenticated() || user.role !== 'MANAGER') { setLoading(false); return }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = async () => {
    try {
      const resp = await bulkApi.getAllOrders()
      setOrders(Array.isArray(resp.data) ? resp.data : (resp.data?.content ?? []))
    } catch (e) { setError('Failed to load orders') } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    if (status === 'ALL') return orders
    return orders.filter(o => (o.status || '') === status)
  }, [orders, status])

 const changeStatus = async (id, value) => {
  try {
    await bulkApi.updateOrderStatus(id, value);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: value } : o));
  } catch (e) {
    console.error(e);
    setError(e.response?.data?.message || 'Failed to update status');
  }
};


  if (!userIsAuthenticated() || user.role !== 'MANAGER') return <div style={{ padding: '2rem' }}>Access denied. Managers only.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '2rem' }}>
        <h1>Заказы (менеджер)</h1>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label>Статус
            <select style={styles.input} value={status} onChange={(e)=>setStatus(e.target.value)}>
              <option value="ALL">Все</option>
              <option value="PENDING_CONFIRMATION">Ожидает подтверждения</option>
              <option value="APPROVED">Одобрен</option>
              <option value="REJECTED">Отклонен</option>
              <option value="SHIPPED">Отгружен</option>
            </select>
          </label>
        </div>

        {loading ? (<p>Loading...</p>) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Пользователь</th>
                  <th style={styles.th}>Создан</th>
                  <th style={styles.th}>Статус</th>
                  <th style={styles.th}>Сумма</th>
                  <th style={styles.th}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} style={styles.tr}>
                    <td style={styles.td}>{o.id}</td>
                    <td style={styles.td}>{o.userEmail || o.userId}</td>
                    <td style={styles.td}>{o.createdAt ?? ''}</td>
                    <td style={styles.td}><span style={{...styles.chip, background: (o.status||'')==='APPROVED'? '#d1fae5': (o.status||'')==='REJECTED'? '#fee2e2' : '#e0e7ff', color: '#111'}}>{o.status || 'PENDING_CONFIRMATION'}</span></td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{o.totalPrice ?? ''}</td>
                    <td style={styles.td}>
                      <button style={styles.btn} onClick={()=>changeStatus(o.id, 'APPROVED')}>Одобрить</button>
                      <button style={{ ...styles.btn, background: '#FF6B6B' }} onClick={()=>changeStatus(o.id, 'REJECTED')}>Отклонить</button>
                      <button style={{ ...styles.btn, background: '#BDB2FF' }} onClick={()=>changeStatus(o.id, 'SHIPPED')}>Отгрузить</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

const styles = {
  card: { background: 'var(--card)', padding: '1rem', borderRadius: '12px', boxShadow: '0 8px 20px var(--shadow)', marginBottom: '1rem' },
  input: { padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid #ddd', background: 'var(--card)', color: 'var(--text)' },
  tableWrap: { overflowX: 'auto', background: 'var(--card)', borderRadius: 12, boxShadow: '0 8px 20px var(--shadow)' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  th: { textAlign: 'left', padding: '0.75rem 0.9rem', borderBottom: '1px solid #eee', background: 'var(--card)' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '0.75rem 0.9rem' },
  chip: { padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.85rem' },
  btn: { padding: '0.4rem 0.8rem', border: 'none', borderRadius: '8px', background: 'var(--primary)', color: 'white', cursor: 'pointer', marginRight: '0.4rem' },
}

export default OrdersAdmin