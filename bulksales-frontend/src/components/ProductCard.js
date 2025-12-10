import React, { useState, memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { bulkApi } from '../misc/BulkApi'
import { config } from '../Constants'
import { useToast } from '../context/ToastContext'
import { useI18n } from '../context/I18nContext'

function ProductCard({ product }) {
  const { userIsAuthenticated, getUser } = useAuth()
  const { locale } = useI18n()
  const user = getUser()
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [qty, setQty] = useState(1)

  const handleAddToCart = async () => {
    if (!userIsAuthenticated() || (user.role !== 'USER' && user.role !== 'CLIENT') || (product.quantity ?? 0) <= 0) return
    setAdding(true)
    setError('')
    try {
      await bulkApi.addToCart(user.id, product.id, qty)
      toast.push('Добавлено в корзину')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cart-updated'))
      }
    } catch (e) {
      setError('Failed to add to cart')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div
      style={{
        ...styles.card,
        ...(hovered ? styles.cardHover : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        // не реагировать на клики по кнопкам внутри
        if ((e.target.tagName || '').toLowerCase() === 'button' || (e.target.closest && e.target.closest('button'))) return
        navigate(`/product/${product.id}`)
      }}
    >
      {product.imageUrl ? (
        <img src={(product.imageUrl.startsWith('http') ? product.imageUrl : (config.url.API_BASE_URL.replace(/\/$/, '') + product.imageUrl))} alt={product.name} style={styles.image} onError={(e)=>{e.currentTarget.style.display='none'}} />
      ) : (
        <div style={styles.cardImage}/>
      )}
      <h3 style={{ color: 'var(--text)' }}>{locale==='en' ? (product.nameEn || product.name) : product.name}</h3>
      <div style={{ margin: '0.5rem 0' }}>
        <span style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>
          ${(product.discountedPrice && Number(product.discountedPrice) < Number(product.price)) 
            ? Number(product.discountedPrice).toFixed(2)
            : Number(product.price).toFixed(2)
          }
        </span>
        {(product.discountedPrice && Number(product.discountedPrice) < Number(product.price)) && (
          <span style={{ 
            textDecoration: 'line-through', 
            color: 'var(--muted)', 
            marginLeft: '0.5rem',
            fontSize: '0.9rem'
          }}>
            ${Number(product.price).toFixed(2)}
          </span>
        )}
        {(product.discountedPrice && Number(product.discountedPrice) < Number(product.price)) && (
          <div style={{
            color: 'var(--success)',
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}>
            Скидка {Math.round(((Number(product.price) - Number(product.discountedPrice)) / Number(product.price)) * 100)}%
          </div>
        )}
      </div>
      <p style={{ color: 'var(--muted)', margin: 0 }}>В наличии: {product.quantity ?? 0}</p>

      {userIsAuthenticated() && (user.role === 'USER' || user.role === 'CLIENT') ? (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
          <div style={styles.stepper} onClick={(e)=>e.stopPropagation()}>
            <button style={styles.stepBtn} disabled={qty<=1} onClick={()=>setQty(q=>Math.max(1, q-1))}>-</button>
            <input style={styles.stepInput} value={qty} onChange={(e)=>{
              const v = parseInt(e.target.value||'1',10); setQty(isNaN(v)?1:Math.min(Math.max(1,v), product.quantity ?? 1))
            }} />
            <button style={styles.stepBtn} disabled={(product.quantity ?? 1)<=qty} onClick={()=>setQty(q=>Math.min(q+1, product.quantity ?? (q+1)))}>+</button>
          </div>
          <button style={styles.button} onClick={(e)=>{e.stopPropagation(); handleAddToCart()}} disabled={adding || (product.quantity ?? 0) <= 0}>
            {adding ? 'Adding...' : (product.quantity ?? 0) <= 0 ? 'Out of stock' : 'Add to Cart'}
          </button>
        </div>
      ) : userIsAuthenticated() && user.role === 'ADMIN' ? (
        <Link to={`/product/${product.id}`} style={styles.linkButton}>View</Link>
      ) : (
        <Link to={`/product/${product.id}`} style={styles.linkButton}>View</Link>
      )}
      {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  )
}

const styles = {
  card: {
    background: 'var(--card)',
    borderRadius: '12px',
    padding: '1rem',
    boxShadow: '0 4px 12px var(--shadow)',
    textAlign: 'center',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer',
  },
  cardHover: { transform: 'translateY(-5px)', boxShadow: '0 8px 20px var(--shadow)' },
  image: { width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '1rem' },
  cardImage: { height: '160px', backgroundColor: '#ddd', borderRadius: '8px', marginBottom: '1rem' },
  button: { marginTop: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer' },
  linkButton: { marginTop: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--primary)', color: 'white', textDecoration: 'none', display: 'inline-block' },
  stepper: { display: 'flex', alignItems: 'center', background: 'var(--card)', border: '1px solid #ddd', borderRadius: '8px' },
  stepBtn: { padding: '0.3rem 0.6rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text)' },
  stepInput: { width: '40px', textAlign: 'center', border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)' },
}

export default memo(ProductCard)
