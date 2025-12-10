import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { bulkApi } from '../misc/BulkApi'

function PlanogramsAdmin() {
  const { userIsAuthenticated, getUser } = useAuth()
  const currentUser = getUser()

  const [planograms, setPlanograms] = useState([])
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({ name: '', shelfNumber: 1, positionOnShelf: 1 })
  const [selectedPlanogram, setSelectedPlanogram] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (userIsAuthenticated() && (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER')) {
      load()
    }
  }, [])

  if (!userIsAuthenticated() || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) {
    return <div style={{ padding: '2rem' }}>Доступ запрещён. Только для администраторов/менеджеров.</div>
  }

  const load = async () => {
    try {
      const [pgr, pr] = await Promise.all([
        bulkApi.getPlanograms(),
        bulkApi.getAllProducts(),
      ])
      setPlanograms(pgr.data)
      setProducts(pr.data)
    } catch (e) { setError('Failed to load') }
  }

  const create = async (e) => {
    e.preventDefault()
    try {
      await bulkApi.createPlanogram({ ...form })
      setForm({ name: '', shelfNumber: 1, positionOnShelf: 1 })
      load()
    } catch (e) { setError('Failed to create') }
  }

  const remove = async (id) => { try { await bulkApi.deletePlanogram(id); setPlanograms(planograms.filter(p => p.id !== id)) } catch (e) { setError('Failed to delete') } }

  const addProduct = async (planogramId, productId) => { try { await bulkApi.planogramAddProduct(planogramId, productId); load() } catch (e) { setError('Failed to add product') } }
  const removeProduct = async (planogramId, productId) => { try { await bulkApi.planogramRemoveProduct(planogramId, productId); load() } catch (e) { setError('Failed to remove product') } }
  const toggleVisible = async (planogramId) => { try { await bulkApi.planogramToggleVisible(planogramId); load() } catch (e) { setError('Failed to toggle') } }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '2rem' }}>
        <h1>Планограммы</h1>

        <form onSubmit={create} style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Создать планограмму</h3>
          <div style={styles.row}>
            <label style={styles.label}>Название
              <input style={styles.input} placeholder="Название" value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} />
            </label>
            <label style={styles.label}>Полка #
              <input style={styles.input} placeholder="Полка #" type="number" value={form.shelfNumber} onChange={(e)=>setForm({ ...form, shelfNumber: Number(e.target.value) })} />
            </label>
            <label style={styles.label}>Позиция
              <input style={styles.input} placeholder="Позиция" type="number" value={form.positionOnShelf} onChange={(e)=>setForm({ ...form, positionOnShelf: Number(e.target.value) })} />
            </label>
            <button style={styles.button} type="submit">Создать</button>
          </div>
        </form>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <div style={styles.grid}>
          {planograms.map(pg => (
            <div key={pg.id} style={styles.pgCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>{pg.name}</h3>
                <div>
                  <button style={styles.button} onClick={() => toggleVisible(pg.id)}>{pg.visible ? 'Скрыть' : 'Показать'}</button>
                  <button style={{ ...styles.button, background: '#FF6B6B' }} onClick={() => remove(pg.id)}>Удалить</button>
                </div>
              </div>
              <p style={{ margin: '0.3rem 0' }}>Полка {pg.shelfNumber}, Позиция {pg.positionOnShelf}</p>

              {/* Фильтры по статусам для справочного списка */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <select style={styles.input} onChange={(e)=>setSelectedPlanogram({ id: pg.id, productId: Number(e.target.value) })} defaultValue="">
                  <option value="" disabled>Добавить товар...</option>
                  {products
                    .filter(p => !pg.products.some(pp => pp.id === p.id))
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <button style={styles.button} onClick={() => selectedPlanogram && selectedPlanogram.id === pg.id && selectedPlanogram.productId && addProduct(pg.id, selectedPlanogram.productId)}>Добавить</button>
              </div>

              {/* Drag-and-drop сетка товаров планограммы */}
              <div style={styles.pgRow}
                   onDragOver={(e)=>e.preventDefault()}
                   onDrop={(e)=>{
                     const pid = Number(e.dataTransfer.getData('text/plain'))
                     if (!pid) return
                     // переместим в конец при дропе на пустое место
                     if (!pg.products.some(p=>p.id===pid)) return
                     const ordered = pg.products.filter(p=>p.id!==pid).concat(pg.products.find(p=>p.id===pid))
                     setPlanograms(planograms.map(x=> x.id===pg.id ? { ...x, products: ordered } : x))
                     // отправим порядок на сервер
                     fetch(`/api/planograms/${pg.id}/reorder`, {
                       method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ordered.map(p=>p.id))
                     }).catch(()=>{})
                   }}>
                {pg.products.map((pr, idx) => (
                  <div key={pr.id}
                       draggable
                       onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', String(pr.id)) }}
                       onDragOver={(e)=>e.preventDefault()}
                       onDrop={(e)=>{
                         const pid = Number(e.dataTransfer.getData('text/plain'))
                         if (!pid || pid===pr.id) return
                         const moving = pg.products.find(p=>p.id===pid)
                         if (!moving) return
                         const rest = pg.products.filter(p=>p.id!==pid)
                         const newOrder = []
                         rest.forEach(p=>{ if (p.id===pr.id) { newOrder.push(moving) } newOrder.push(p) })
                         setPlanograms(planograms.map(x=> x.id===pg.id ? { ...x, products: newOrder } : x))
                         fetch(`/api/planograms/${pg.id}/reorder`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(newOrder.map(p=>p.id)) }).catch(()=>{})
                       }}
                       style={{ ...styles.pgItem,
                         background: pr.priority ? 'rgba(255,165,0,0.2)' : (pr.discountedPrice && pr.discountedPrice < pr.price ? 'rgba(0,128,0,0.15)' : 'rgba(0,0,0,0.05)') }}>
                    <span title={pr.name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{pr.name}</span>
                    <button style={{ ...styles.button, background: '#BDB2FF' }} onClick={() => removeProduct(pg.id, pr.id)}>Убрать</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}

const styles = {
  card: { background: 'var(--card)', padding: '1rem', borderRadius: '12px', boxShadow: '0 8px 20px var(--shadow)', marginBottom: '1rem' },
  row: { display: 'flex', gap: '1rem', alignItems: 'center' },
  input: { padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid #ddd', background: 'var(--card)', color: 'var(--text)' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.9rem' },
  button: { marginLeft: '0.5rem', padding: '0.4rem 0.8rem', border: 'none', borderRadius: '8px', background: 'var(--primary)', color: 'white', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' },
  pgCard: { background: 'var(--card)', padding: '1rem', borderRadius: '12px', boxShadow: '0 8px 20px var(--shadow)' },
  pgRow: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' },
  pgItem: { background: 'rgba(0,0,0,0.05)', padding: '0.4rem 0.6rem', borderRadius: '8px', display: 'flex', gap: '0.5rem', alignItems: 'center' },
}

export default PlanogramsAdmin


