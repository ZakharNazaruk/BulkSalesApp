import React, { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { bulkApi } from '../misc/BulkApi'

function DiscountsAdmin() {
  const { userIsAuthenticated, getUser } = useAuth()
  const currentUser = getUser()

  const [discounts, setDiscounts] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [formPercent, setFormPercent] = useState({ name: '', scope: 'PRODUCT', percent: 0, startDate: '', endDate: '', productId: '', category: '' })
  const [formQty, setFormQty] = useState({ name: '', scope: 'PRODUCT', minQuantity: 0, percent: 0, startDate: '', endDate: '', productId: '', category: '' })
  const [formBxgy, setFormBxgy] = useState({ name: '', scope: 'PRODUCT', buyQty: 0, freeQty: 0, startDate: '', endDate: '', productId: '', category: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [editingDiscount, setEditingDiscount] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const productsById = useMemo(
    () => Object.fromEntries((products || []).map(p => [p.id, p])),
    [products]
  )

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
      const [dsc, pr, cats] = await Promise.all([
        bulkApi.getDiscounts(),
        bulkApi.getAllProducts(),
        bulkApi.getCategories()
      ])

      const list = Array.isArray(dsc.data) ? dsc.data : (dsc.data?.content || dsc.data?.items || [])
      setDiscounts(list)
      setProducts(Array.isArray(pr.data) ? pr.data : [])
      setCategories(Array.isArray(cats.data) ? cats.data : [])
    } catch {
      setError('Не удалось загрузить данные')
    }
  }

  const validateForm = (form, type) => {
    const errors = {}
    
    if (!form.name?.trim()) {
      errors.name = 'Название обязательно'
    }
    
    if (form.scope === 'PRODUCT' && !form.productId) {
      errors.productId = 'Выберите товар'
    }
    
    if (form.scope === 'CATEGORY' && !form.category?.trim()) {
      errors.category = 'Выберите категорию'
    }
    
    if (form.startDate && form.endDate) {
      const startDate = new Date(form.startDate)
      const endDate = new Date(form.endDate)
      if (endDate < startDate) {
        errors.endDate = 'Дата окончания не может быть раньше даты начала'
      }
    }
    
    if (type === 'PERCENT' || type === 'QTY') {
      const percent = Number(form.percent)
      if (!percent || percent <= 0 || percent > 100) {
        errors.percent = 'Процент должен быть от 1 до 100'
      }
    }
    
    if (type === 'QTY') {
      const minQty = Number(form.minQuantity)
      if (!minQty || minQty <= 0) {
        errors.minQuantity = 'Минимальное количество должно быть больше 0'
      }
    }
    
    if (type === 'BXGY') {
      const buyQty = Number(form.buyQty)
      const freeQty = Number(form.freeQty)
      
      if (!buyQty || buyQty <= 0) {
        errors.buyQty = 'Количество покупки должно быть больше 0'
      }
      
      if (!freeQty || freeQty <= 0) {
        errors.freeQty = 'Количество бесплатных должно быть больше 0'
      }
    }
    
    return errors
  }

  const createDiscount = async (form, type) => {
    // Валидация формы
    const errors = validateForm(form, type)
    setFormErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      setError('Пожалуйста, исправьте ошибки в форме')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const payload = {
        ...form,
        type,
        percent: form.percent ? Number(form.percent) : null,
        minQuantity: form.minQuantity ? Number(form.minQuantity) : null,
        buyQty: form.buyQty ? Number(form.buyQty) : null,
        freeQty: form.freeQty ? Number(form.freeQty) : null,
        productId: form.scope === 'PRODUCT' ? Number(form.productId) : null,
        category: form.scope === 'CATEGORY' ? form.category : null
      }

      await bulkApi.createDiscount(payload)
      await load()

      // очистка формы и ошибок
      if (type === 'PERCENT') setFormPercent({ name: '', scope: 'PRODUCT', percent: 0, startDate: '', endDate: '', productId: '', category: '' })
      if (type === 'QTY') setFormQty({ name: '', scope: 'PRODUCT', minQuantity: 0, percent: 0, startDate: '', endDate: '', productId: '', category: '' })
      if (type === 'BXGY') setFormBxgy({ name: '', scope: 'PRODUCT', buyQty: 0, freeQty: 0, startDate: '', endDate: '', productId: '', category: '' })
      
      setFormErrors({})
      setError('')
    } catch {
      setError('Не удалось создать скидку')
    } finally {
      setLoading(false)
    }
  }

  const remove = async id => {
    try {
      await bulkApi.deleteDiscount(id)
      setDiscounts(discounts.filter(d => d.id !== id))
    } catch {
      setError('Не удалось удалить скидку')
    }
  }

  const openEditModal = (discount) => {
    setEditingDiscount(discount)
    setShowEditModal(true)
    setFormErrors({})
  }

  const closeEditModal = () => {
    setEditingDiscount(null)
    setShowEditModal(false)
    setFormErrors({})
  }

  const updateDiscount = async (updatedData) => {
    if (!editingDiscount) return
    
    const errors = validateForm(updatedData, editingDiscount.type)
    setFormErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      setError('Пожалуйста, исправьте ошибки в форме')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const payload = {
        ...updatedData,
        type: editingDiscount.type,
        percent: updatedData.percent ? Number(updatedData.percent) : null,
        minQuantity: updatedData.minQuantity ? Number(updatedData.minQuantity) : null,
        buyQty: updatedData.buyQty ? Number(updatedData.buyQty) : null,
        freeQty: updatedData.freeQty ? Number(updatedData.freeQty) : null,
        productId: updatedData.scope === 'PRODUCT' ? Number(updatedData.productId) : null,
        category: updatedData.scope === 'CATEGORY' ? updatedData.category : null
      }

      await bulkApi.updateDiscount(editingDiscount.id, payload)
      await load()
      closeEditModal()
      setError('')
    } catch {
      setError('Не удалось обновить скидку')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '2rem' }}>
        <h1>Скидки и акции</h1>
        {error && <p style={{ color: 'red' }}>{error}</p>}

        <DiscountFormPercent form={formPercent} setForm={setFormPercent} products={products} categories={categories} errors={formErrors} loading={loading} onSubmit={e => { e.preventDefault(); createDiscount(formPercent, 'PERCENT') }} />
        <DiscountFormQty form={formQty} setForm={setFormQty} products={products} categories={categories} errors={formErrors} loading={loading} onSubmit={e => { e.preventDefault(); createDiscount(formQty, 'QTY') }} />
        <DiscountFormBxgy form={formBxgy} setForm={setFormBxgy} products={products} categories={categories} errors={formErrors} loading={loading} onSubmit={e => { e.preventDefault(); createDiscount(formBxgy, 'BXGY') }} />

       <div style={styles.card}>
  <h3>Все скидки</h3>
  {renderTable(discounts, productsById, remove, openEditModal)}
</div>
      </main>
      <Footer />
      
      {/* Модальное окно редактирования */}
      {showEditModal && editingDiscount && (
        <EditDiscountModal
          discount={editingDiscount}
          products={products}
          categories={categories}
          errors={formErrors}
          loading={loading}
          onSave={updateDiscount}
          onClose={closeEditModal}
        />
      )}
    </div>
  )
}

// ----------------- ТРИ ФОРМЫ -----------------
function DiscountFormPercent({ form, setForm, products, categories, errors, loading, onSubmit }) {
  return (
    <form onSubmit={onSubmit} style={styles.card}>
      <h3>Процентные скидки</h3>
      <FormCommon form={form} setForm={setForm} products={products} categories={categories} errors={errors} loading={loading} showPercent={true} />
    </form>
  )
}

function DiscountFormQty({ form, setForm, products, categories, errors, loading, onSubmit }) {
  return (
    <form onSubmit={onSubmit} style={styles.card}>
      <h3>Скидка от количества</h3>
      <FormCommon form={form} setForm={setForm} products={products} categories={categories} errors={errors} loading={loading} showPercent={true} showMinQuantity={true} />
    </form>
  )
}

function DiscountFormBxgy({ form, setForm, products, categories, errors, loading, onSubmit }) {
  return (
    <form onSubmit={onSubmit} style={styles.card}>
      <h3>Акции BXGY</h3>
      <FormCommon form={form} setForm={setForm} products={products} categories={categories} errors={errors} loading={loading} showBxgy={true} />
    </form>
  )
}

// ----------------- Общая часть формы -----------------
function FormCommon({ form, setForm, products, categories, errors, loading, showPercent, showMinQuantity, showBxgy, buttonText }) {
  const fieldError = (field) => errors && errors[field]
  const fieldStyle = (field) => ({
    ...styles.input,
    borderColor: fieldError(field) ? '#ff4757' : '#ddd'
  })
  
  return (
    <>
      <div style={styles.row}>
        <label style={styles.label}>Название
          <input style={fieldStyle('name')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/>
          {fieldError('name') && <span style={styles.errorText}>{fieldError('name')}</span>}
        </label>
        <label style={styles.label}>Область
          <select style={styles.input} value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })}>
            <option value="PRODUCT">Товар</option>
            <option value="CATEGORY">Категория</option>
            <option value="GLOBAL">Все товары</option>
          </select>
        </label>
      </div>

      {showPercent && (
        <div style={styles.row}>
          {showMinQuantity && <label style={styles.label}>Мин. количество
            <input style={fieldStyle('minQuantity')} type="number" value={form.minQuantity || 0} onChange={e => setForm({ ...form, minQuantity: e.target.value })}/>
            {fieldError('minQuantity') && <span style={styles.errorText}>{fieldError('minQuantity')}</span>}
          </label>}
          <label style={styles.label}>Процент
            <input style={fieldStyle('percent')} type="number" value={form.percent || 0} onChange={e => setForm({ ...form, percent: e.target.value })}/>
            {fieldError('percent') && <span style={styles.errorText}>{fieldError('percent')}</span>}
          </label>
        </div>
      )}

      {showBxgy && (
        <div style={styles.row}>
          <label style={styles.label}>Купить (X)
            <input style={fieldStyle('buyQty')} type="number" value={form.buyQty || 0} onChange={e => setForm({ ...form, buyQty: e.target.value })}/>
            {fieldError('buyQty') && <span style={styles.errorText}>{fieldError('buyQty')}</span>}
          </label>
          <label style={styles.label}>Бесплатно (Y)
            <input style={fieldStyle('freeQty')} type="number" value={form.freeQty || 0} onChange={e => setForm({ ...form, freeQty: e.target.value })}/>
            {fieldError('freeQty') && <span style={styles.errorText}>{fieldError('freeQty')}</span>}
          </label>
        </div>
      )}

      <div style={styles.row}>
        <label style={styles.label}>Дата начала
          <input style={fieldStyle('startDate')} type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}/>
          {fieldError('startDate') && <span style={styles.errorText}>{fieldError('startDate')}</span>}
        </label>
        <label style={styles.label}>Дата окончания
          <input style={fieldStyle('endDate')} type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}/>
          {fieldError('endDate') && <span style={styles.errorText}>{fieldError('endDate')}</span>}
        </label>
      </div>

      {form.scope === 'PRODUCT' &&
        <label style={styles.label}>Товар
          <select style={fieldStyle('productId')} value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}>
            <option value="">Выберите товар...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {fieldError('productId') && <span style={styles.errorText}>{fieldError('productId')}</span>}
        </label>
      }

      {form.scope === 'CATEGORY' &&
        <label style={styles.label}>Категория
          <select style={fieldStyle('category')} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            <option value="">Выберите категорию...</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          {fieldError('category') && <span style={styles.errorText}>{fieldError('category')}</span>}
        </label>
      }

      <button style={{ ...styles.button, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
        {buttonText || (loading ? 'Создание...' : 'Создать')}
      </button>
    </>
  )
}

// ----------------- Таблица всех скидок -----------------
function renderTable(discounts, productsById, onRemove, onEdit) {
  if (!discounts || discounts.length === 0) return <div style={{ color: 'var(--muted)' }}>Нет данных</div>

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Название</th>
            <th>Тип</th>
            <th>Область</th>
            <th>Параметры</th>
            <th>Даты</th>
            <th>Товар/Категория</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {discounts.map(d => (
            <tr key={d.id}>
              <td>{d.id}</td>
              <td>{d.name}</td>
              <td>{d.type}</td>
              <td>{d.scope}</td>
              <td>
                {d.type === 'PERCENT' ? `${d.percent}%` :
                  d.type === 'QTY' ? `${d.percent || 0}% (min ${d.minQuantity})` :
                  d.type === 'BXGY' ? `X=${d.buyQty}, Y=${d.freeQty}` :
                  ''}
              </td>
              <td>{d.startDate} → {d.endDate}</td>
              <td>
                {d.scope === 'PRODUCT' ? (productsById?.[d.productId]?.name || `#${d.productId}`) :
                  d.scope === 'CATEGORY' ? d.category : 'Все товары'}
              </td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={{ ...styles.button, background: '#3742fa', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => onEdit && onEdit(d)}>Редактировать</button>
                  <button style={{ ...styles.button, background: '#FF6B6B', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => { if (window.confirm('Удалить скидку?')) onRemove && onRemove(d.id) }}>Удалить</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ----------------- Модальное окно редактирования -----------------
function EditDiscountModal({ discount, products, categories, errors, loading, onSave, onClose }) {
  const [formData, setFormData] = React.useState({
    name: discount.name || '',
    scope: discount.scope || 'PRODUCT',
    percent: discount.percent || 0,
    minQuantity: discount.minQuantity || 0,
    buyQty: discount.buyQty || 0,
    freeQty: discount.freeQty || 0,
    startDate: discount.startDate || '',
    endDate: discount.endDate || '',
    productId: discount.productId || '',
    category: discount.category || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Редактирование скидки</h3>
          <button style={{ ...styles.button, background: '#ddd', color: '#333' }} onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#f0f0f0', borderRadius: '4px' }}>
            <strong>Тип скидки:</strong> {discount.type === 'PERCENT' ? 'Процентная' : discount.type === 'QTY' ? 'От количества' : 'BXGY'} (не редактируется)
          </div>
          
          <FormCommon 
            form={formData} 
            setForm={setFormData} 
            products={products} 
            categories={categories} 
            errors={errors}
            loading={loading}
            showPercent={discount.type === 'PERCENT' || discount.type === 'QTY'}
            showMinQuantity={discount.type === 'QTY'}
            showBxgy={discount.type === 'BXGY'}
            buttonText={loading ? 'Обновление...' : 'Обновить'}
          />
        </form>
      </div>
    </div>
  )
}

// ----------------- Стили -----------------
const styles = {
  card: { background: 'var(--card)', padding: '1rem', borderRadius: '12px', boxShadow: '0 8px 20px var(--shadow)', marginBottom: '1rem' },
  row: { display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' },
  input: { padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid #ddd', flex: 1, background: 'var(--card)', color: 'var(--text)' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.9rem' },
  button: { padding: '0.4rem 0.8rem', border: 'none', borderRadius: '8px', background: 'var(--primary)', color: 'white', cursor: 'pointer' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
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

export default DiscountsAdmin
