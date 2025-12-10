import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { bulkApi } from '../misc/BulkApi'
import { useI18n } from '../context/I18nContext'
import { config } from '../Constants'

function CategoriesPage() {
  const { locale } = useI18n()
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try { const resp = await bulkApi.getCategories(); setCats(resp.data || []) }
      catch (e) { setError('Failed to load categories') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '2rem' }}>
        <h1>Категории</h1>
        {loading ? <p>Loading...</p> : error ? <p style={{ color: 'red' }}>{error}</p> : (
          <div style={styles.grid}>
            {cats.map(c => (
              <a key={c.id} href={`/?category=${encodeURIComponent(c.name)}`} style={styles.tile}>
                {c.imageUrl ? <img src={(c.imageUrl.startsWith('http') ? c.imageUrl : (config.url.API_BASE_URL.replace(/\/$/, '') + c.imageUrl))} alt={c.name} style={styles.img} /> : <div style={styles.placeholder} />}
                <div style={{ padding: '0.5rem' }}>
                  <div style={{ fontWeight: 600 }}>{locale==='en' ? (c.nameEn || c.name) : c.name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{locale==='en' ? (c.descriptionEn || c.description || '') : (c.description || '')}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' },
  tile: { background: 'var(--card)', borderRadius: '12px', boxShadow: '0 8px 20px var(--shadow)', textDecoration: 'none', color: 'inherit', overflow: 'hidden', display: 'block' },
  img: { width: '100%', height: '140px', objectFit: 'cover' },
  placeholder: { width: '100%', height: '140px', background: '#ddd' },
}

export default CategoriesPage