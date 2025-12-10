import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { bulkApi } from '../misc/BulkApi'
import { config } from '../Constants'

function CategoriesAdmin() {
  const { userIsAuthenticated, getUser } = useAuth()
  const currentUser = getUser()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ name: '', nameEn: '', description: '', descriptionEn: '' })
  const [imageFile, setImageFile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [editingCategory, setEditingCategory] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => { if (userIsAuthenticated() && (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER')) load() }, [])

  if (!userIsAuthenticated() || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) return <div style={{ padding: '2rem' }}>Доступ запрещён. Только для администраторов/менеджеров.</div>

  const validateForm = (formData) => {
    const errors = {}
    if (!formData.name?.trim()) {
      errors.name = 'Название (RU) обязательно'
    }
    if (!formData.nameEn?.trim()) {
      errors.nameEn = 'Название (EN) обязательно'
    }
    return errors
  }

  const load = async () => {
    try {
      const resp = await bulkApi.getCategories()
      setCategories(resp.data)
    } catch (e) { setError('Failed to load categories') }
    finally { setLoading(false) }
  }

  const create = async (e) => {
    e.preventDefault()
    
    const errors = validateForm(form)
    setFormErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      setError('Пожалуйста, исправьте ошибки в форме')
      return
    }
    
    setSaving(true)
    setError('')
    
    try {
      if (imageFile) {
        await bulkApi.createCategoryWithImage({ ...form }, imageFile)
      } else {
        await bulkApi.createCategory({ ...form })
      }
      setForm({ name: '', nameEn: '', description: '', descriptionEn: '' })
      setImageFile(null)
      setFormErrors({})
      load()
      setError('')
    } catch (e) { 
      setError('Не удалось создать категорию') 
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = (category) => {
    setEditingCategory(category)
    setShowEditModal(true)
    setFormErrors({})
  }

  const closeEditModal = () => {
    setEditingCategory(null)
    setShowEditModal(false)
    setFormErrors({})
  }

  const updateCategory = async (updatedData, imageFile) => {
    if (!editingCategory) return
    
    const errors = validateForm(updatedData)
    setFormErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      setError('Пожалуйста, исправьте ошибки в форме')
      return
    }
    
    setSaving(true)
    setError('')
    
    try {
      if (imageFile) {
        // Если есть API для обновления с изображением, используйте его
        await bulkApi.updateCategory(editingCategory.id, updatedData)
      } else {
        await bulkApi.updateCategory(editingCategory.id, updatedData)
      }
      await load()
      closeEditModal()
      setError('')
    } catch {
      setError('Не удалось обновить категорию')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => { 
    if (!window.confirm('Удалить категорию?')) return
    try { 
      await bulkApi.deleteCategory(id); 
      setCategories(categories.filter(c => c.id !== id)) 
    } catch (e) { 
      setError('Не удалось удалить категорию') 
    } 
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '2rem' }}>
        <h1>Категории</h1>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={create} style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Создать категорию</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'start' }}>
            <label style={styles.label}>Название (RU)
              <input style={{ ...styles.input, borderColor: formErrors.name ? '#ff4757' : '#ddd' }} placeholder="Название" value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} />
              {formErrors.name && <span style={styles.errorText}>{formErrors.name}</span>}
            </label>
            <label style={styles.label}>Название (EN)
              <input style={{ ...styles.input, borderColor: formErrors.nameEn ? '#ff4757' : '#ddd' }} placeholder="Name (EN)" value={form.nameEn} onChange={(e)=>setForm({ ...form, nameEn: e.target.value })} />
              {formErrors.nameEn && <span style={styles.errorText}>{formErrors.nameEn}</span>}
            </label>
            <label style={styles.label}>Описание (RU)
              <input style={styles.input} placeholder="Описание" value={form.description} onChange={(e)=>setForm({ ...form, description: e.target.value })} />
            </label>
            <label style={styles.label}>Description (EN)
              <input style={styles.input} placeholder="Description (EN)" value={form.descriptionEn} onChange={(e)=>setForm({ ...form, descriptionEn: e.target.value })} />
            </label>
            <label style={styles.label}>Изображение
              <input style={styles.input} type="file" accept="image/*" onChange={(e)=>setImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
            </label>
            <button style={{ ...styles.button, opacity: saving ? 0.7 : 1 }} type="submit" disabled={saving}>
              {saving ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>

        {loading ? (<p>Loading...</p>) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr><th style={styles.th}>ID</th><th style={styles.th}>Название</th><th style={styles.th}>Описание</th><th style={styles.th}>Изображение</th><th style={styles.th}>Действия</th></tr>
              </thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id}>
                    <td style={styles.td}>{c.id}</td>
                    <td style={styles.td}>{c.name}</td>
                    <td style={styles.td}>{c.description}</td>
                    <td style={styles.td}>{c.imageUrl ? <img src={(c.imageUrl.startsWith('http') ? c.imageUrl : (config.url.API_BASE_URL.replace(/\/$/, '') + c.imageUrl))} alt="cat" style={{ height: 40, borderRadius: 6 }} /> : '-'}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button style={{ ...styles.button, background: '#3742fa', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => openEditModal(c)}>Редактировать</button>
                        <button style={{ ...styles.button, background: '#FF6B6B', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => remove(c.id)}>Удалить</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
      
      {/* Модальное окно редактирования */}
      {showEditModal && editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          errors={formErrors}
          saving={saving}
          onSave={updateCategory}
          onClose={closeEditModal}
        />
      )}
    </div>
  )
}

// ----------------- Модальное окно редактирования -----------------
function EditCategoryModal({ category, errors, saving, onSave, onClose }) {
  const [formData, setFormData] = React.useState({
    name: category.name || '',
    nameEn: category.nameEn || '',
    description: category.description || '',
    descriptionEn: category.descriptionEn || ''
  })
  const [imageFile, setImageFile] = React.useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData, imageFile)
  }

  const fieldStyle = (field) => ({
    ...styles.input,
    borderColor: errors && errors[field] ? '#ff4757' : '#ddd'
  })

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Редактирование категории</h3>
          <button style={{ ...styles.button, background: '#ddd', color: '#333' }} onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
            <label style={styles.label}>Название (RU)
              <input style={fieldStyle('name')} value={formData.name} onChange={(e)=>setFormData({ ...formData, name: e.target.value })} />
              {errors?.name && <span style={styles.errorText}>{errors.name}</span>}
            </label>
            
            <label style={styles.label}>Название (EN)
              <input style={fieldStyle('nameEn')} value={formData.nameEn} onChange={(e)=>setFormData({ ...formData, nameEn: e.target.value })} />
              {errors?.nameEn && <span style={styles.errorText}>{errors.nameEn}</span>}
            </label>
            
            <label style={styles.label}>Описание (RU)
              <input style={styles.input} value={formData.description} onChange={(e)=>setFormData({ ...formData, description: e.target.value })} />
            </label>
            
            <label style={styles.label}>Description (EN)
              <input style={styles.input} value={formData.descriptionEn} onChange={(e)=>setFormData({ ...formData, descriptionEn: e.target.value })} />
            </label>
            
            <label style={styles.label}>Новое изображение (опционально)
              <input style={styles.input} type="file" accept="image/*" onChange={(e)=>setImageFile(e.target.files?.[0] || null)} />
            </label>
            
            {category.imageUrl && (
              <div>
                <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Текущее изображение:</div>
                <img src={(category.imageUrl.startsWith('http') ? category.imageUrl : (`${config.url.API_BASE_URL.replace(/\/$/, '')}${category.imageUrl}`))} alt="" style={{ height: 60, borderRadius: 6 }} />
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" style={{ ...styles.button, background: '#BDB2FF' }} onClick={onClose}>Отмена</button>
            <button type="submit" style={{ ...styles.button, opacity: saving ? 0.7 : 1 }} disabled={saving}>
              {saving ? 'Обновление...' : 'Обновить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  card: { background: 'var(--card)', padding: '1rem', borderRadius: '12px', boxShadow: '0 8px 20px var(--shadow)', marginBottom: '1rem' },
  row: { display: 'flex', gap: '1rem', alignItems: 'center' },
  input: { padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid #ddd', flex: 1, background: 'var(--card)', color: 'var(--text)' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.9rem' },
  button: { padding: '0.4rem 0.8rem', border: 'none', borderRadius: '8px', background: 'var(--primary)', color: 'white', cursor: 'pointer' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'var(--card)', color: 'var(--text)' },
  th: { textAlign: 'left', padding: '0.6rem', borderBottom: '1px solid #eee' },
  td: { padding: '0.6rem', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' },
  errorText: { fontSize: '0.75rem', color: '#ff4757', marginTop: '0.2rem' },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: 'var(--card)',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    color: 'var(--text)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
  },
}

export default CategoriesAdmin


