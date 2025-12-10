import React from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { bulkApi } from '../misc/BulkApi'
import { useAuth } from '../context/AuthContext'

function BannersAdmin() {
  const { getUser, userIsAuthenticated } = useAuth()
  const user = getUser()
  const [items, setItems] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [form, setForm] = React.useState({ title: '', description: '', imageUrl: '', backgroundColor: '#3b82f6', textColor: '#ffffff', displayOrder: 0, active: true })
  const [editingId, setEditingId] = React.useState(null)
  const [file, setFile] = React.useState(null)

  const load = async () => {
    try {
      const resp = await bulkApi.getAllBanners()
      setItems(Array.isArray(resp.data) ? resp.data : [])
      setError('')
    } catch (e) {
      setError('Не удалось загрузить баннеры')
    } finally { setLoading(false) }
  }

  React.useEffect(()=>{ load() }, [])

  if (!userIsAuthenticated() || (user.role !== 'MANAGER' && user.role !== 'ADMIN')) {
    return <div style={{ padding: '2rem' }}>Доступ только для менеджеров/админов.</div>
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    try {
      if (!form.title.trim()) { setError('Введите заголовок'); return }
      if (editingId) {
        if (file) await bulkApi.updateBannerWithImage(editingId, form, file)
        else await bulkApi.updateBanner(editingId, form)
      } else {
        if (file) await bulkApi.createBannerWithImage(form, file)
        else await bulkApi.createBanner(form)
      }
      setForm({ title: '', description: '', imageUrl: '', backgroundColor: '#3b82f6', textColor: '#ffffff', displayOrder: 0, active: true })
      setEditingId(null)
      setFile(null)
      load()
    } catch (e) { setError(e?.response?.data?.message || 'Не удалось сохранить баннер') }
  }

  const onEdit = (b) => {
    setEditingId(b.id)
    setForm({
      title: b.title || '',
      description: b.description || '',
      imageUrl: b.imageUrl || '',
      backgroundColor: b.backgroundColor || '#3b82f6',
      textColor: b.textColor || '#ffffff',
      displayOrder: b.displayOrder ?? 0,
      active: b.active !== false
    })
  }

  const onDelete = async (id) => { if (!window.confirm('Удалить баннер?')) return; try { await bulkApi.deleteBanner(id); load() } catch {} }
  const onToggle = async (id) => { try { await bulkApi.toggleBannerActive(id); load() } catch {} }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
        <h1>Баннеры</h1>

        <form onSubmit={onSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'var(--card)', padding: '1rem', borderRadius: 12, boxShadow: '0 8px 20px var(--shadow)', marginBottom: '1rem' }}>
          <label>Заголовок<input style={styles.input} value={form.title} onChange={e=>setForm({ ...form, title: e.target.value })} /></label>
          <label>Описание<input style={styles.input} value={form.description} onChange={e=>setForm({ ...form, description: e.target.value })} /></label>
          <label>Картинка (URL)<input style={styles.input} value={form.imageUrl} onChange={e=>setForm({ ...form, imageUrl: e.target.value })} placeholder="http(s)://... или /uploads/banner.jpg" /></label>
          <label>Выбор файла<input style={styles.input} type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0] || null)} /></label>
          <label>Цвет фона<input style={styles.input} type="color" value={form.backgroundColor} onChange={e=>setForm({ ...form, backgroundColor: e.target.value })} /></label>
          <label>Цвет текста<input style={styles.input} type="color" value={form.textColor} onChange={e=>setForm({ ...form, textColor: e.target.value })} /></label>
          <label>Порядок<input style={styles.input} type="number" value={form.displayOrder} onChange={e=>setForm({ ...form, displayOrder: Number(e.target.value) })} /></label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={form.active} onChange={e=>setForm({ ...form, active: e.target.checked })} /> Активен
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <button style={styles.btn} type="submit">{editingId ? 'Сохранить' : 'Добавить'}</button>
            {editingId && <button type="button" style={{ ...styles.btn, background: '#BDB2FF', marginLeft: '0.5rem' }} onClick={()=>{ setEditingId(null); setForm({ title: '', description: '', imageUrl: '', backgroundColor: '#3b82f6', textColor: '#ffffff', displayOrder: 0, active: true }) }}>Отмена</button>}
            {error && <span style={{ marginLeft: '0.5rem', color: 'red' }}>{error}</span>}
          </div>
        </form>

        {loading ? (
          <div>Загрузка...</div>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {items.map(b => (
              <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'center', background: 'var(--card)', padding: '0.8rem', borderRadius: 12, boxShadow: '0 8px 20px var(--shadow)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{b.title} {b.active === false && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(выключен)</span>}</div>
                  <div style={{ color: 'var(--muted)' }}>{b.description}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>order: {b.displayOrder} | colors: {b.backgroundColor} / {b.textColor}</div>
                  {b.imageUrl && <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{b.imageUrl}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={styles.btn} onClick={()=>onEdit(b)}>Редактировать</button>
                  <button style={{ ...styles.btn, background: '#f59e0b' }} onClick={()=>onToggle(b.id)}>{b.active === false ? 'Включить' : 'Выключить'}</button>
                  <button style={{ ...styles.btn, background: '#ef4444' }} onClick={()=>onDelete(b.id)}>Удалить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

const styles = {
  input: { width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', background: 'var(--card)', color: 'var(--text)' },
  btn: { padding: '0.5rem 0.9rem', border: 'none', borderRadius: 8, background: 'var(--primary)', color: 'white', cursor: 'pointer' },
}

export default BannersAdmin
