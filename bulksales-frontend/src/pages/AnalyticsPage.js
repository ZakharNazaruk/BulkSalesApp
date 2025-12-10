import React, { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { bulkApi } from '../misc/BulkApi'
import PieChart from '../components/PieChart'

function AnalyticsPage() {
  const { userIsAuthenticated, getUser } = useAuth()
  const user = getUser()
  const [top, setTop] = useState([])
  const [sales, setSales] = useState([])
  const [aov, setAov] = useState(null)
  const [catSales, setCatSales] = useState([])
  const [vipShare, setVipShare] = useState([])
  const [error, setError] = useState('')

  const totalRevenue = useMemo(() => {
    try {
      const values = (sales || []).map(([, v]) => (typeof v === 'number' ? v : parseFloat(v || '0')))
      return values.reduce((acc, n) => acc + (isNaN(n) ? 0 : n), 0)
    } catch { return 0 }
  }, [sales])

  const vipPercent = useMemo(() => {
    try {
      const map = Object.fromEntries(vipShare || [])
      const vip = typeof map.VIP === 'number' ? map.VIP : parseFloat(map.VIP || '0')
      const nonVip = typeof map.NON_VIP === 'number' ? map.NON_VIP : parseFloat(map.NON_VIP || '0')
      const total = (isNaN(vip) ? 0 : vip) + (isNaN(nonVip) ? 0 : nonVip)
      if (total <= 0) return 0
      return Math.round((vip / total) * 100)
    } catch { return 0 }
  }, [vipShare])

  useEffect(() => {
    const load = async () => {
      try {
        const [t, s, av, cat, vip] = await Promise.all([
          bulkApi.getTopProducts(),
          bulkApi.getMonthlySales(),
          bulkApi.getAov(),
          bulkApi.getCategorySales(),
          bulkApi.getVipShare(),
        ])
        const topData = t?.data
        const salesData = s?.data
        const aovData = av?.data
        const catData = cat?.data
        const vipData = vip?.data
        setTop(Array.isArray(topData) ? topData : [])
        setSales(Object.entries(salesData || {}))
        setAov(aovData)
        setCatSales(Object.entries(catData || {}))
        setVipShare(Object.entries(vipData || {}))
      } catch (e) { setError('Failed to load analytics') }
    }
    if (userIsAuthenticated() && (user.role === 'ADMIN' || user.role === 'MANAGER')) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!userIsAuthenticated() || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
    return <div style={{ padding: '2rem' }}>Доступ ограничен. Только для Администраторов/Менеджеров.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '2rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h1 style={{ marginTop: 0, marginBottom: '1rem' }}>Аналитика</h1>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Выручка (сумма)</div>
              <div style={styles.summaryValue}>{totalRevenue.toFixed ? totalRevenue.toFixed(2) : totalRevenue}</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Средний чек (AOV)</div>
              <div style={styles.summaryValue}>{aov ?? '-'}</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Топ-товаров</div>
              <div style={styles.summaryValue}>{top.length}</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Доля VIP</div>
              <div style={styles.summaryValue}>{vipPercent}%</div>
            </div>
          </div>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div style={styles.grid}> 
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Топ товаров</h3>
            <div>
              {top.length === 0 ? <div style={{ color: 'var(--muted)' }}>Нет данных</div> : (
                <div style={{ display: 'grid', gap: '6px' }}>
                    {top.map((row, i) => {
                      const qty = row.quantity || row.qty || 0
                      const max = Math.max(1, Math.max(...top.map(r => r.quantity || r.qty || 0)))
                      const w = `${Math.round((qty / max) * 100)}%`
                      return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px', alignItems: 'center' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.productName || `#${row.productId}`}</div>
                          <div style={{ background: '#eef2ff', borderRadius: 8 }}>
                            <div style={{ width: w, background: 'var(--primary)', color: 'white', borderRadius: 8, padding: '4px 8px' }}>{qty}</div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Продажи по месяцам</h3>
            {sales.length === 0 ? <div style={{ color: 'var(--muted)' }}>Нет данных</div> : (
              <div style={{ display: 'grid', gap: '6px' }}>
                  {(() => {
                    const values = sales.map(([,v]) => (typeof v === 'number' ? v : parseFloat(v||'0')))
                    const max = Math.max(1, ...values)
                    return sales.map(([m, v]) => {
                      const vv = typeof v === 'number' ? v : parseFloat(v||'0')
                      const w = `${Math.round((vv / max) * 100)}%`
                      return (
                        <div key={m} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', alignItems: 'center' }}>
                          <div style={{ color: 'var(--muted)' }}>{m}</div>
                          <div style={{ background: '#ecfeff', borderRadius: 8 }}>
                            <div style={{ width: w, background: '#06b6d4', color: 'white', borderRadius: 8, padding: '4px 8px' }}>{vv.toFixed ? vv.toFixed(2) : vv}</div>
                          </div>
                        </div>
                      )
                    })
                  })()}
              </div>
            )}
          </div>
          <div style={styles.card}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ marginTop: 0 }}>Средний чек (AOV)</h3>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{aov ?? '-'}</div>
            </div>
          </div>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Продажи по категориям</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1rem', alignItems: 'start' }}>
              <PieChart data={catSales.map(([label, v], i) => ({ label, value: (typeof v==='number'?v:parseFloat(v||'0')), color: ['#60a5fa','#34d399','#f59e0b','#ef4444','#a78bfa','#f472b6','#22d3ee'][i%7] }))} size={160} />
              <div>
                {catSales.length === 0 ? <div style={{ color: 'var(--muted)' }}>Нет данных</div> : (
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {(() => {
                      const values = catSales.map(([,v]) => (typeof v === 'number' ? v : parseFloat(v||'0')))
                      const max = Math.max(1, ...values)
                      return catSales.map(([c, v], i) => {
                        const vv = typeof v === 'number' ? v : parseFloat(v||'0')
                        const w = `${Math.round((vv / max) * 100)}%`
                        const color = ['#60a5fa','#34d399','#f59e0b','#ef4444','#a78bfa','#f472b6','#22d3ee'][i%7]
                        return (
                          <div key={c} style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: '8px', alignItems: 'center' }}>
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
                            <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center' }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c || '(Без категории)'}</div>
                              <div style={{ background: '#f1f5f9', borderRadius: 8 }}>
                                <div style={{ width: w, background: '#10b981', color: 'white', borderRadius: 8, padding: '4px 8px' }}>{vv.toFixed ? vv.toFixed(2) : vv}</div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Доля VIP</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1rem', alignItems: 'start' }}>
              <PieChart data={vipShare.map(([label, v], i) => ({ label, value: (typeof v==='number'?v:parseFloat(v||'0')), color: label==='VIP' ? '#f97316' : '#64748b' }))} size={160} />
              <div>
                {vipShare.length === 0 ? <div style={{ color: 'var(--muted)' }}>Нет данных</div> : (
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {(() => {
                      const values = vipShare.map(([,v]) => (typeof v === 'number' ? v : parseFloat(v||'0')))
                      const max = Math.max(1, ...values)
                      return vipShare.map(([k, v]) => {
                        const vv = typeof v === 'number' ? v : parseFloat(v||'0')
                        const w = `${Math.round((vv / max) * 100)}%`
                        const color = k==='VIP' ? '#f97316' : '#64748b'
                        return (
                          <div key={k} style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: '8px', alignItems: 'center' }}>
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
                            <div style={{ display:'grid', gridTemplateColumns: '120px 1fr', gap: '8px', alignItems: 'center' }}>
                              <div style={{ color: 'var(--muted)' }}>{k === 'VIP' ? 'VIP' : 'Обычные'}</div>
                              <div style={{ background: '#fff7ed', borderRadius: 8 }}>
                                <div style={{ width: w, background: color, color: 'white', borderRadius: 8, padding: '4px 8px' }}>{vv.toFixed ? vv.toFixed(2) : vv}</div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
      </main>
      <Footer />
    </div>
  )
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem', alignItems: 'stretch' },
  card: { background: 'var(--card)', padding: '1.2rem', borderRadius: '16px', boxShadow: '0 8px 20px var(--shadow)', marginBottom: '1rem' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' },
  summaryCard: { background: 'var(--card)', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' },
  summaryLabel: { fontSize: '0.8rem', color: 'var(--muted)' },
  summaryValue: { fontSize: '1.5rem', fontWeight: 700 }
}

export default AnalyticsPage


