import React, { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { bulkApi } from '../misc/BulkApi'

function Badge({ children, color = '#6b7280' }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      background: color, color: 'white', fontSize: 12, fontWeight: 700
    }}>{children}</span>
  )
}

function AnalyticsAbcXyz() {
  const { userIsAuthenticated, getUser } = useAuth()
  const user = getUser()
  const [abc, setAbc] = useState(null)
  const [xyz, setXyz] = useState(null)
  const [matrix, setMatrix] = useState(null)
  const [params, setParams] = useState({ daysBack: 90, a: 80, b: 15, x: 0.1, y: 0.25, bucket: 'WEEK', zeroMode: 'INCLUDE' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const matrixPairs = useMemo(()=>[
    ['AX','#22c55e'],['AY','#84cc16'],['AZ','#f59e0b'],
    ['BX','#06b6d4'],['BY','#3b82f6'],['BZ','#8b5cf6'],
    ['CX','#14b8a6'],['CY','#a855f7'],['CZ','#ef4444'],
  ], [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [abcResp, xyzResp, mixResp] = await Promise.all([
          bulkApi.getAbc(params),
          bulkApi.getXyz(params),
          bulkApi.getAbcXyz(params),
        ])
        setAbc(abcResp.data?.data)
        setXyz(xyzResp.data?.data)
        setMatrix(mixResp.data?.data)
      } catch (e) {
        setError('Не удалось загрузить ABC/XYZ аналитику')
      } finally {
        setLoading(false)
      }
    }
    if (userIsAuthenticated() && (user.role === 'ADMIN' || user.role === 'MANAGER')) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.daysBack, params.a, params.b, params.x, params.y])

  if (!userIsAuthenticated() || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
    return <div style={{ padding: '2rem' }}>Доступ ограничен. Только для Администраторов/Менеджеров.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '2rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h1 style={{ marginTop: 0, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{display:'inline-block', width:10, height:10, borderRadius:999, background:'#2563eb'}} />
            ABC/XYZ анализ
          </h1>
          {/* Controls */}
          <div style={styles.controls}>
            <div style={styles.controlItem}>
              <div style={styles.lbl}>Период, дней</div>
              <input type="number" min={7} max={365} value={params.daysBack} onChange={e=>setParams(p=>({...p, daysBack: parseInt(e.target.value||'0',10)}))} style={styles.input}/>
            </div>
            <div style={styles.controlItem}>
              <div style={styles.lbl}>A%</div>
              <input type="number" min={10} max={90} value={params.a} onChange={e=>setParams(p=>({...p, a: parseInt(e.target.value||'0',10)}))} style={styles.input}/>
            </div>
            <div style={styles.controlItem}>
              <div style={styles.lbl}>B%</div>
              <input type="number" min={5} max={80} value={params.b} onChange={e=>setParams(p=>({...p, b: parseInt(e.target.value||'0',10)}))} style={styles.input}/>
            </div>
            <div style={styles.controlItem}>
              <div style={styles.lbl}>X (CV)</div>
              <input type="number" step={0.01} value={params.x} onChange={e=>setParams(p=>({...p, x: parseFloat(e.target.value||'0')}))} style={styles.input}/>
            </div>
            <div style={styles.controlItem}>
              <div style={styles.lbl}>Y (CV)</div>
              <input type="number" step={0.01} value={params.y} onChange={e=>setParams(p=>({...p, y: parseFloat(e.target.value||'0')}))} style={styles.input}/>
            </div>
            <div style={styles.controlItem}>
              <div style={styles.lbl}>Интервал</div>
              <select value={params.bucket} onChange={e=>setParams(p=>({...p, bucket: e.target.value}))} style={styles.select}>
                <option value="DAY">День</option>
                <option value="WEEK">Неделя</option>
              </select>
            </div>
            <div style={styles.controlItem}>
              <div style={styles.lbl}>Нули</div>
              <select value={params.zeroMode} onChange={e=>setParams(p=>({...p, zeroMode: e.target.value}))} style={styles.select}>
                <option value="INCLUDE">Учитывать</option>
                <option value="EXCLUDE">Исключать</option>
              </select>
            </div>
          </div>

          {/* Export buttons */}
          <div style={{ display:'flex', gap:'0.5rem', margin:'0.5rem 0' }}>
            <button style={styles.btn} onClick={async()=>{
              const resp = await bulkApi.downloadAbcCsv(params); downloadBlob('abc.csv', resp.data)
            }}>⬇️ ABC CSV</button>
            <button style={styles.btn} onClick={async()=>{
              const resp = await bulkApi.downloadXyzCsv(params); downloadBlob('xyz.csv', resp.data)
            }}>⬇️ XYZ CSV</button>
            <button style={styles.btn} onClick={async()=>{
              const resp = await bulkApi.downloadMatrixCsv(params); downloadBlob('abc_xyz_matrix.csv', resp.data)
            }}>⬇️ Матрица CSV</button>
            <button style={{ ...styles.btn, background:'#10b981' }} onClick={async()=>{
              const resp = await bulkApi.downloadAbcXyzExcel(params); downloadBlob('abc_xyz.xlsx', resp.data)
            }}>⬇️ Excel (ABC+XYZ+Matrix)</button>
          </div>

          {loading ? <div>Загрузка…</div> : error ? <div style={{ color: 'red' }}>{error}</div> : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* ABC table */}
              <div style={styles.card}>
                <h3 style={{ marginTop: 0 }}>ABC (вклад в выручку)</h3>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>A={abc?.thresholds?.A}% B={abc?.thresholds?.B}% C={abc? (100-abc.thresholds.A-abc.thresholds.B): ''}%</div>
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Товар</th>
                        <th>Выручка</th>
                        <th>Доля</th>
                        <th>Кумул.</th>
                        <th>Класс</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(abc?.items||[]).map((r)=>{
                        const color = r.class==='A'?'#22c55e':(r.class==='B'?'#3b82f6':'#ef4444')
                        return (
                          <tr key={r.productId}>
                            <td style={{maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{r.productName}</td>
                            <td>{(r.revenue&&r.revenue.toFixed)? r.revenue.toFixed(2) : (''+r.revenue)}</td>
                            <td>{Math.round((r.share||0)*100)}%</td>
                            <td>{Math.round((r.cumulativeShare||0)*100)}%</td>
                            <td><Badge color={color}>{r.class}</Badge></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* XYZ table */}
              <div style={styles.card}>
                <h3 style={{ marginTop: 0 }}>XYZ (стабильность спроса)</h3>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Пороги: X≤{params.x}, Y≤{params.y}</div>
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Товар</th>
                        <th>CV</th>
                        <th>Средн. кол-во</th>
                        <th>Дней</th>
                        <th>Класс</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(xyz?.items||[]).map((r)=>{
                        const color = r.class==='X'?'#22c55e':(r.class==='Y'?'#f59e0b':'#ef4444')
                        return (
                          <tr key={r.productId}>
                            <td style={{maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{r.productName}</td>
                            <td>{(r.cv||0).toFixed(2)}</td>
                            <td>{(r.meanQty||0).toFixed(2)}</td>
                            <td>{r.days}</td>
                            <td><Badge color={color}>{r.class}</Badge></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Matrix */}
              <div style={{ gridColumn: '1 / -1', ...styles.card }}>
                <h3 style={{ marginTop: 0 }}>Матрица ABC×XYZ</h3>
                <div style={{ display:'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {matrixPairs.map(([k,color])=>{
const v = Number(matrix?.matrix?.[k] ?? 0)
                    const max = Math.max(1, ...matrixPairs.map(([kk]) => Number(matrix?.matrix?.[kk] ?? 0)))
                    const w = `${Math.round((v / max) * 100)}%`
                    return (
                      <div key={k} style={{ background: 'var(--card)', border:'1px solid #eee', borderRadius: 12, padding: '0.8rem' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <strong>{k}</strong>
                          <Badge color={color}>{v}</Badge>
                        </div>
                        <div style={{ height: 4, background:'#f3f4f6', borderRadius: 999, marginTop: 8 }}>
                          <div style={{ width: w, height: 4, background: color, borderRadius: 999 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function downloadBlob(filename, blob) {
  try {
    const url = window.URL.createObjectURL(new Blob([blob]))
    const a = document.createElement('a')
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    a.remove(); window.URL.revokeObjectURL(url)
  } catch {}
}

const styles = {
  controls: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:'0.8rem', margin:'1rem 0' },
  controlItem: { background:'#ffffff', border:'1px solid #e5e7eb', padding:'0.75rem', borderRadius:12 },
  card: { background: 'var(--card)', border:'1px solid #e5e7eb', padding: '1.2rem', borderRadius: '16px', boxShadow: '0 8px 20px rgba(0,0,0,0.05)', marginBottom: '1rem' },
  input: { marginLeft: '0.5rem', width: 80, padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', background:'#ffffff', color:'var(--text)' },
  select: { width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', background:'#ffffff', color:'var(--text)' },
  tableWrap: { overflowX:'auto' },
  table: { width:'100%', borderCollapse:'collapse' },
  btn: { padding:'0.6rem 0.9rem', border:'1px solid #4f46e5', background:'#4f46e5', color:'white', borderRadius:10, cursor:'pointer' },
  lbl: { fontSize: '0.8rem', color: 'var(--muted)' }
}

export default AnalyticsAbcXyz
