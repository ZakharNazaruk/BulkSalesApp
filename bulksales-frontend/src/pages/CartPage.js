import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { bulkApi } from '../misc/BulkApi'
import { useI18n } from '../context/I18nContext'
import { config } from '../Constants'

function CartPage() {
  const navigate = require('react-router-dom').useNavigate()
  const { locale } = useI18n()
  const { userIsAuthenticated, getUser } = useAuth()
  const user = getUser()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (userIsAuthenticated() && (user.role === 'USER' || user.role === 'CLIENT')) { load() } else { setLoading(false) }
  }, [])

  const load = async () => {
    try {
      const resp = await bulkApi.getCart(user.id)
      let cartData = resp.data
      // Fallback: если в items нет imageUrl, подтянем из продуктов
      const missing = (cartData?.items || []).filter(i => !i.imageUrl)
      if (missing.length) {
        await Promise.all(missing.map(async (i) => {
          try { const pr = await bulkApi.getProductById(i.productId); i.imageUrl = pr.data?.imageUrl || null } catch {}
        }))
      }
      setCart({ ...cartData })
      const ids = (cartData?.items || []).map(i => i.productId)
      if (ids.length) {
        const r = await bulkApi.crossSell(ids)
        setRecs(Array.isArray(r.data) ? r.data : [])
      } else { setRecs([]) }
    } catch (e) { setError('Failed to load cart') } finally { setLoading(false) }
  }

  const remove = async (productId) => { try { await bulkApi.removeFromCart(user.id, productId); load(); window.dispatchEvent(new CustomEvent('cart-updated')) } catch (e) { setError('Failed to remove item') } }
  const checkout = async () => { try { await bulkApi.checkout(user.id); window.dispatchEvent(new CustomEvent('cart-updated')); navigate('/orders') } catch (e) { setError(e?.response?.data?.message || 'Checkout failed') } }
  const [confirm, setConfirm] = React.useState(false)
  const [recs, setRecs] = useState([])

  if (!userIsAuthenticated() || (user.role !== 'USER' && user.role !== 'CLIENT')) return <div style={{ padding: '2rem' }}>Please login as USER to view cart.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '2rem' }}>
        <h1>Your Cart</h1>
        {loading ? (<p>Loading...</p>) : error ? (<p style={{ color: 'red' }}>{error}</p>) : cart ? (
          <div style={styles.card}>
            {(cart.items || []).map(it => (
              <div key={it.id} style={{ ...styles.rowBetween, gap: '0.75rem', background: 'var(--card)', border: '1px solid #eee', borderRadius: 12, padding: '0.6rem 0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
{it.imageUrl && <img src={(it.imageUrl.startsWith('http')?it.imageUrl:(config.url.API_BASE_URL.replace(/\/$/, '') + it.imageUrl))} alt={it.productName} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{locale==='en' ? (it.productNameEn || it.productName) : it.productName}</div>
                    <div style={{ color: 'var(--muted)' }}>Qty: {it.quantity}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700 }}>{it.subtotal}</div>
                  <button style={{ ...styles.button, background: '#FF6B6B' }} onClick={() => remove(it.productId)}>Remove</button>
                </div>
              </div>
            ))}
            <div style={{ ...styles.rowBetween, marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
              <div style={{ fontWeight: 700 }}>Total</div>
              <div>{cart.totalPrice}</div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <button style={styles.button} onClick={()=>setConfirm(true)}>Checkout</button>
            </div>
          </div>
        ) : (<p>Cart is empty</p>)}

        {/* Cross-sell */}
        {recs.length > 0 && (
          <div style={{ ...styles.card, marginTop: '1rem' }}>
            <h3>Часто берут вместе</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {recs.map(p => (
                <div key={p.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: '0.6rem', display: 'grid', gridTemplateColumns: '72px 1fr', gap: '0.75rem', background: 'var(--card)' }}>
{p.imageUrl && <img src={(p.imageUrl.startsWith('http')?p.imageUrl:(config.url.API_BASE_URL.replace(/\/$/, '') + p.imageUrl))} alt={p.name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />}
                  <div>
                    <div style={{ fontWeight: 700 }}>{locale==='en' ? (p.nameEn || p.name) : p.name}</div>
                    <div style={{ color: 'var(--muted)' }}>{p.discountedPrice ?? p.price}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                      <button style={{ ...styles.button, padding: '0.2rem 0.5rem' }} onClick={() => setRecs(qs => qs.map(x => x.id === p.id ? { ...x, __qty: Math.max(1, (x.__qty||1)-1) } : x))}>-</button>
                      <span>{p.__qty || 1}</span>
                      <button style={{ ...styles.button, padding: '0.2rem 0.5rem' }} onClick={() => setRecs(qs => qs.map(x => x.id === p.id ? { ...x, __qty: (x.__qty||1)+1 } : x))}>+</button>
                      <button style={{ ...styles.button, marginLeft: 'auto' }} onClick={async ()=>{ try { await bulkApi.addToCart(user.id, p.id, p.__qty || 1); load(); window.dispatchEvent(new CustomEvent('cart-updated')) } catch {} }}>В корзину</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
      {confirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Подтверждение заказа</h3>
            <p>Вы уверены, что хотите оформить заказ?</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button style={{ ...styles.button, background: '#BDB2FF' }} onClick={()=>setConfirm(false)}>Отмена</button>
              <button style={styles.button} onClick={async ()=>{ await checkout(); setConfirm(false) }}>Оформить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  card: { background: 'var(--card)', padding: '1rem', borderRadius: '12px', boxShadow: '0 8px 20px var(--shadow)' },
  rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' },
  button: { padding: '0.5rem 0.9rem', border: 'none', borderRadius: '10px', background: 'var(--primary)', color: 'white', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: 'var(--card)', color: 'var(--text)', padding: '1rem', borderRadius: '12px', boxShadow: '0 8px 20px var(--shadow)', width: '400px', maxWidth: '90%' }
}

export default CartPage


