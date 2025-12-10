import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { bulkApi } from '../misc/BulkApi'

function ProductsAdmin() {
  const { userIsAuthenticated, getUser } = useAuth()
  const currentUser = getUser()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', nameEn: '', description: '', descriptionEn: '', category: '', price: '', quantity: '', displayPriority: 100 })
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [imageFile, setImageFile] = useState(null)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (userIsAuthenticated() && currentUser.role === 'MANAGER') {
      load()
    }
  }, [])

  if (!userIsAuthenticated() || currentUser.role !== 'MANAGER') {
    return <div style={{ padding: '2rem' }}>Доступ запрещен. Только для менеджеров.</div>
  }

  const load = async () => {
    try {
      const [prods, cats] = await Promise.all([bulkApi.getAllProducts(), bulkApi.getCategories()])
      setProducts(prods.data)
      setCategories(cats.data || [])
    } catch (e) { setError('Не удалось загрузить данные') }
    finally { setLoading(false) }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const create = async (e) => {
    e.preventDefault()
    const price = Number(form.price)
    const quantity = Number(form.quantity || 0)
    const displayPriority = Number(form.displayPriority || 100)

    if (price < 0) {
      setFormError('Цена не может быть отрицательной')
      return
    }
    if (quantity < 0) {
      setFormError('Количество не может быть отрицательным')
      return
    }
    if (displayPriority < 0) {
      setFormError('Витринный приоритет не может быть отрицательным')
      return
    }

    try {
      const payload = { ...form, price, quantity, displayPriority }
      await bulkApi.createProductWithImage(payload, imageFile)
      setForm({ name: '', nameEn: '', description: '', descriptionEn: '', category: '', price: '', quantity: '', displayPriority: 100 })
      setImageFile(null)
      setFormError('')
      load()
    } catch (e) {
      setFormError('Не удалось создать товар')
    }
  }

  const remove = async (id) => {
    try { await bulkApi.deleteProduct(id); setProducts(products.filter(p => p.id !== id)) }
    catch (e) { setError('Не удалось удалить товар') }
  }

  const toggleActive = async (id) => {
    try { await bulkApi.toggleProductActive(id); load() } catch (e) { setError('Не удалось изменить статус активности') }
  }

  const togglePriority = async (id) => {
    try { await bulkApi.toggleProductPriority(id); load() } catch (e) { setError('Не удалось изменить приоритет') }
  }

  const filteredProducts = selectedCategory ? products.filter(p => p.category === selectedCategory) : products

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '2rem' }}>
        <h1 style={{ marginBottom: '1rem' }}>Управление товарами</h1>

        <form onSubmit={create} style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Добавить товар</h3>

          <div style={styles.row}> 
            <label style={styles.label}>Название (RU)
              <input style={styles.input} placeholder="Название" name="name" value={form.name} onChange={handleChange} />
            </label>
            <label style={styles.label}>Название (EN)
              <input style={styles.input} placeholder="Name (EN)" name="nameEn" value={form.nameEn} onChange={handleChange} />
            </label>
            <label style={styles.label}>Категория
              <select style={styles.input} name="category" value={form.category} onChange={handleChange}>
                <option value="">Выберите категорию...</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </label>
            <label style={styles.label}>Цена
              <input style={styles.input} placeholder="Цена" name="price" type="number" step="0.01" value={form.price} onChange={handleChange} />
            </label>
            <label style={styles.label}>Количество
              <input style={styles.input} placeholder="Количество" name="quantity" type="number" step="1" value={form.quantity} onChange={handleChange} />
            </label>
            <label style={styles.label}>Витринный приоритет
              <input style={styles.input} placeholder="Напр. 10" name="displayPriority" type="number" step="1" value={form.displayPriority} onChange={handleChange} />
            </label>
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Изображение
              <input style={styles.input} type="file" accept="image/*" onChange={(e)=>setImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
            </label>
          </div>

          <textarea style={{ ...styles.input, height: '80px' }} placeholder="Описание (RU)" name="description" value={form.description} onChange={handleChange} />
          <textarea style={{ ...styles.input, height: '80px' }} placeholder="Description (EN)" name="descriptionEn" value={form.descriptionEn} onChange={handleChange} />

          {formError && <p style={{ color: '#FF6B6B', marginBottom: '0.5rem' }}>{formError}</p>}
          <button style={styles.button} type="submit">Создать</button>
        </form>

        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Категории</h3>
          <div style={styles.row}>
            <select style={styles.input} value={selectedCategory} onChange={(e)=>setSelectedCategory(e.target.value)}>
              <option value="">Все категории</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {selectedCategory && (
              <button style={{ ...styles.button, background: '#BDB2FF' }} type="button" onClick={()=>setSelectedCategory('')}>Сбросить фильтр</button>
            )}
          </div>
        </div>

        {loading ? (<p>Загрузка...</p>) : error ? (<p style={{ color: 'red' }}>{error}</p>) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Название</th>
                  <th style={styles.th}>Категория</th>
                  <th style={styles.th}>Цена</th>
                  <th style={styles.th}>Кол-во</th>
                  <th style={styles.th}>Активен</th>
                  <th style={styles.th}>Приоритет</th>
                  <th style={styles.th}>Витрина</th>
                  <th style={styles.th}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                    <tr key={p.id}>
                      <td style={styles.td}>{p.id}</td>
                      <td style={styles.td}>{p.name}</td>
                      <td style={styles.td}>{p.category}</td>
                      <td style={styles.td}>{p.discountedPrice ?? p.price}</td>
                      <td style={styles.td}>{p.quantity ?? 0}</td>
                      <td style={styles.td}>{p.active ? 'ДА' : 'НЕТ'}</td>
                      <td style={styles.td}>{p.priority ? 'ДА' : 'НЕТ'}</td>
                      <td style={styles.td}>{p.displayPriority ?? '-'}</td>
                      <td style={styles.td}>
                        <button style={styles.button} onClick={() => toggleActive(p.id)}>{p.active ? 'Снять с продажи' : 'Активировать'}</button>
                        <button style={styles.button} onClick={() => togglePriority(p.id)}>{p.priority ? 'Обычный' : 'Приоритет'}</button>
                        <button style={{ ...styles.button, background: '#FF6B6B' }} onClick={() => remove(p.id)}>Удалить</button>
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
  card: {
    background: 'var(--card)', padding: '1rem', borderRadius: '12px', boxShadow: '0 8px 20px var(--shadow)', marginBottom: '1rem',
    animation: 'fadeIn 0.4s ease'
  },
  row: { display: 'flex', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' },
  input: {
    flex: 1, padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1px solid #ddd', outline: 'none', background: 'var(--card)', color: 'var(--text)'
  },
  button: {
    marginRight: '0.5rem', padding: '0.5rem 0.9rem', border: 'none', borderRadius: '10px', background: 'var(--primary)', color: 'white', cursor: 'pointer',
    transition: 'transform .1s ease'
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'var(--card)', color: 'var(--text)' },
  th: { textAlign: 'left', padding: '0.6rem', borderBottom: '1px solid #eee' },
  td: { padding: '0.6rem', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' },
}

export default ProductsAdmin
