import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { bulkApi } from '../misc/BulkApi'
import { useToast } from '../context/ToastContext'
import ProductCard from '../components/ProductCard'
import { config } from '../Constants'

function ProductDetails() {
  const { id } = useParams()
  const { userIsAuthenticated, getUser } = useAuth()
  const user = getUser()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [qty, setQty] = useState(1)
  const [recs, setRecs] = useState([])
  const [selectedImage, setSelectedImage] = useState(0)
  const [discounts, setDiscounts] = useState([])
  const [vipSettings, setVipSettings] = useState(null)
  const toast = useToast()

  useEffect(() => {
    const load = async () => {
      try {
        const [productResp, discountsResp, vipResp] = await Promise.all([
          bulkApi.getProductById(id),
          bulkApi.getAllDiscounts(),
          bulkApi.getVipConfig()
        ])
        
        setProduct(productResp.data)
        setDiscounts(Array.isArray(discountsResp.data) ? discountsResp.data : [])
        setVipSettings(vipResp.data)
        
        try {
          const rec = await bulkApi.crossSell([id])
          setRecs(Array.isArray(rec.data) ? rec.data : [])
        } catch {}
      } catch (e) { 
        setError('Не удалось загрузить товар') 
      } finally { 
        setLoading(false) 
      }
    }
    load()
  }, [id])

  // Функция для вычисления всех доступных скидок
  const calculateAllDiscounts = () => {
    if (!product) return { bestPrice: 0, basePrice: 0, appliedDiscounts: [] }

    const basePrice = Number(product.price)
    const appliedDiscounts = []
    let bestPrice = basePrice

    // Проверяем стандартную скидку на товар
    if (product.discountedPrice && Number(product.discountedPrice) < basePrice) {
      const discountAmount = basePrice - Number(product.discountedPrice)
      const discountPercent = Math.round((discountAmount / basePrice) * 100)
      appliedDiscounts.push({
        type: 'PRODUCT',
        amount: discountAmount,
        percent: discountPercent,
        price: Number(product.discountedPrice)
      })
      bestPrice = Math.min(bestPrice, Number(product.discountedPrice))
    }

    // Проверяем скидки из системы скидок
    const now = new Date()
    const activeDiscounts = discounts.filter(discount => {
      // Проверяем активность скидки по датам
      const start = discount.startDate ? new Date(discount.startDate) : null
      const end = discount.endDate ? new Date(discount.endDate) : null
      if (start && now < start) return false
      if (end && now > end) return false
      
      // Проверяем область применения
      if (discount.scope === 'PRODUCT' && discount.productId === product.id) return true
      if (discount.scope === 'CATEGORY' && discount.category === product.category) return true
      if (discount.scope === 'GLOBAL') return true
      
      return false
    })

    // Применяем найденные скидки
    activeDiscounts.forEach(discount => {
      let discountPrice = basePrice
      
      if (discount.type === 'PERCENT' && discount.percent) {
        discountPrice = basePrice * (1 - discount.percent / 100)
        const discountAmount = basePrice - discountPrice
        const discountPercent = Math.round((discountAmount / basePrice) * 100)
        
        appliedDiscounts.push({
          type: 'DISCOUNT',
          name: discount.name,
          amount: discountAmount,
          percent: discountPercent,
          price: discountPrice,
          isVip: discount.isVip || false
        })
      }
      
      bestPrice = Math.min(bestPrice, discountPrice)
    })

    // Проверяем VIP скидку
    if (userIsAuthenticated() && user.role === 'USER' && vipSettings) {
      const vipDiscountPercent = Number(vipSettings.vipDiscountPercent) || 0
      if (vipDiscountPercent > 0) {
        const vipPrice = basePrice * (1 - vipDiscountPercent / 100)
        const vipAmount = basePrice - vipPrice
        
        appliedDiscounts.push({
          type: 'VIP',
          name: 'VIP скидка',
          amount: vipAmount,
          percent: vipDiscountPercent,
          price: vipPrice,
          isVip: true
        })
        
        bestPrice = Math.min(bestPrice, vipPrice)
      }
    }

    // Сортируем скидки по величине (самые выгодные сначала)
    appliedDiscounts.sort((a, b) => b.amount - a.amount)

    return {
      bestPrice: Math.min(...appliedDiscounts.map(d => d.price), basePrice),
      basePrice,
      appliedDiscounts
    }
  }

  const { bestPrice, basePrice, appliedDiscounts } = calculateAllDiscounts()
  const hasDiscount = bestPrice < basePrice
  const bestDiscount = appliedDiscounts[0] // Самая выгодная скидка

  const addToCart = async () => {
    if (!userIsAuthenticated() || user.role !== 'USER' || (product.quantity ?? 0) <= 0) return
    setAdding(true)
    try {
      await bulkApi.addToCart(user.id, id, qty)
      toast.push('Добавлено в корзину')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cart-updated'))
      }
    } catch (e) { 
      setError('Не удалось добавить в корзину') 
    } finally { 
      setAdding(false) 
    }
  }

  // Одно изображение — без дублирования (убирает лишние плейсхолдеры)
  const productImages = product?.imageUrl ? [product.imageUrl] : []

  if (loading) {
    return (
      <div style={styles.container}>
        <Navbar />
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>Загрузка товара...</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div style={styles.container}>
        <Navbar />
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>Ошибка</h2>
          <p style={styles.errorText}>{error || 'Товар не найден'}</p>
          <button 
            style={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            Попробовать снова
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <Navbar />
      <main style={styles.main}>
        <div style={styles.productSection}>
          {/* Галерея изображений */}
          <div style={styles.imageSection}>
            <div style={styles.mainImageContainer}>
              <img
                src={
                  productImages[selectedImage]?.startsWith('http')
                    ? productImages[selectedImage]
                    : config.url.API_BASE_URL.replace(/\/$/, '') + productImages[selectedImage]
                }
                alt={product.name}
                style={styles.mainImage}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextSibling.style.display = 'flex'
                }}
              />
              <div style={{ ...styles.imagePlaceholder, display: 'none' }}>
                <span>📷</span>
                <p>Изображение не найдено</p>
              </div>
            </div>
            
            {productImages.length > 1 && (
              <div style={styles.thumbnailContainer}>
                {productImages.map((img, index) => (
                  <button
                    key={index}
                    style={{
                      ...styles.thumbnail,
                      ...(selectedImage === index ? styles.thumbnailActive : {})
                    }}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img
                      src={
                        img.startsWith('http')
                          ? img
                          : config.url.API_BASE_URL.replace(/\/$/, '') + img
                      }
                      alt={`${product.name} ${index + 1}`}
                      style={styles.thumbnailImage}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Информация о товаре */}
          <div style={styles.infoSection}>
            <div style={styles.header}>
              <div style={styles.categoryBadge}>{product.category}</div>
              <div style={styles.stockStatus}>
                {product.quantity > 0 ? (
                  <span style={styles.inStock}>✓ В наличии</span>
                ) : (
                  <span style={styles.outOfStock}>✗ Нет в наличии</span>
                )}
              </div>
            </div>

            <h1 style={styles.productName}>{product.name}</h1>
            <p style={styles.productDescription}>{product.description}</p>

            {/* Блок цен и скидок */}
            <div style={styles.priceSection}>
              <div style={styles.priceContainer}>
                <span style={styles.currentPrice}>{bestPrice.toFixed(2)} р</span>
                {hasDiscount && (
                  <span style={styles.originalPrice}>{basePrice.toFixed(2)} р</span>
                )}
              </div>
              
              {bestDiscount && (
                <div style={{
                  ...styles.discountBadge,
                  ...(bestDiscount.isVip ? styles.vipDiscountBadge : {})
                }}>
                  {bestDiscount.isVip && '👑 '}
                  -{bestDiscount.percent}%
                </div>
              )}
            </div>

            {/* Информация о примененных скидках */}
            {appliedDiscounts.length > 0 && (
              <div style={styles.discountsInfo}>
                <div style={styles.discountsTitle}>Примененные скидки:</div>
                <div style={styles.discountsList}>
                  {appliedDiscounts.map((discount, index) => (
                    <div key={index} style={styles.discountItem}>
                      <span style={styles.discountName}>
                        {discount.isVip && '👑 '}
                        {discount.name || 'Скидка на товар'}
                      </span>
                      <span style={styles.discountValue}>-{discount.percent}%</span>
                      <span style={styles.discountAmount}>-{discount.amount.toFixed(2)} р</span>
                    </div>
                  ))}
                </div>
                <div style={styles.savingsTotal}>
                  Ваша экономия: <strong>{(basePrice - bestPrice).toFixed(2)} р</strong>
                </div>
              </div>
            )}

            {/* Блок добавления в корзину */}
            {(userIsAuthenticated() && (user.role === 'USER' || user.role === 'CLIENT')) && (
              <div style={styles.cartSection}>
                <div style={styles.quantitySelector}>
                  <label style={styles.quantityLabel}>Количество:</label>
                  <div style={styles.stepper}>
                    <button 
                      style={styles.stepperButton}
                      disabled={qty <= 1}
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                    >
                      −
                    </button>
                    <input
                      style={styles.quantityInput}
                      value={qty}
                      onChange={(e) => {
                        const v = parseInt(e.target.value || '1', 10)
                        setQty(isNaN(v) ? 1 : Math.min(Math.max(1, v), product.quantity ?? 1))
                      }}
                    />
                    <button
                      style={styles.stepperButton}
                      disabled={(product.quantity ?? 1) <= qty}
                      onClick={() => setQty(q => Math.min(q + 1, product.quantity ?? (q + 1)))}
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  style={{
                    ...styles.addToCartButton,
                    ...(product.quantity <= 0 ? styles.addToCartButtonDisabled : {})
                  }}
                  onClick={addToCart}
                  disabled={adding || product.quantity <= 0}
                >
                  {adding ? (
                    <>
                      <div style={styles.spinner}></div>
                      Добавляем...
                    </>
                  ) : product.quantity <= 0 ? (
                    'Нет в наличии'
                  ) : (
                    `Добавить в корзину — ${(bestPrice * qty).toFixed(2)} р`
                  )}
                </button>
              </div>
            )}

            {/* Детали товара */}
            <div style={styles.detailsSection}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Категория:</span>
                <span style={styles.detailValue}>{product.category}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Доступно:</span>
                <span style={styles.detailValue}>{product.quantity} шт.</span>
              </div>
              {hasDiscount && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Итоговая экономия:</span>
                  <span style={styles.detailValueSavings}>
                    {(basePrice - bestPrice).toFixed(2)} р
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Рекомендации */}
        {recs.length > 0 && (
          <div style={styles.recommendationsSection}>
            <h2 style={styles.recommendationsTitle}>С этим товаром покупают</h2>
            <div style={styles.recommendationsGrid}>
              {recs.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    color: '#1a202c',
  },
  main: {
    flex: 1,
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    flex: 1,
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #cbd5e0',
    borderTop: '4px solid #4299e1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem',
  },
  loadingText: {
    color: '#718096',
    fontSize: '1.1rem',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    flex: 1,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  errorTitle: {
    color: '#e53e3e',
    marginBottom: '0.5rem',
  },
  errorText: {
    color: '#718096',
    marginBottom: '2rem',
  },
  retryButton: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '12px',
    background: '#4299e1',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  productSection: {
    display: 'grid',
    gridTemplateColumns: 'minmax(400px, 1fr) minmax(500px, 1fr)',
    gap: '3rem',
    background: 'white',
    padding: '2.5rem',
    borderRadius: '20px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
    marginBottom: '3rem',
    alignItems: 'start',
  },
  imageSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  mainImageContainer: {
    position: 'relative',
    borderRadius: '16px',
    overflow: 'hidden',
    background: '#f7fafc',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  mainImage: {
    width: '100%',
    height: '500px',
    objectFit: 'cover',
    display: 'block',
  },
  imagePlaceholder: {
    width: '100%',
    height: '500px',
    background: '#f7fafc',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#a0aec0',
    fontSize: '3rem',
  },
  thumbnailContainer: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
  },
  thumbnail: {
    width: '80px',
    height: '80px',
    border: '2px solid transparent',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'pointer',
    background: 'none',
    padding: 0,
    transition: 'all 0.2s ease',
  },
  thumbnailActive: {
    borderColor: '#4299e1',
    transform: 'scale(1.05)',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    background: '#ebf8ff',
    color: '#3182ce',
    padding: '0.4rem 0.8rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  stockStatus: {
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  inStock: {
    color: '#38a169',
  },
  outOfStock: {
    color: '#e53e3e',
  },
  productName: {
    fontSize: '2.5rem',
    fontWeight: '700',
    margin: 0,
    lineHeight: 1.2,
    color: '#1a202c',
  },
  productDescription: {
    fontSize: '1.1rem',
    lineHeight: 1.6,
    color: '#4a5568',
    margin: 0,
  },
  priceSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  priceContainer: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.75rem',
  },
  currentPrice: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: '#2d3748',
  },
  originalPrice: {
    fontSize: '1.5rem',
    color: '#a0aec0',
    textDecoration: 'line-through',
  },
  discountBadge: {
    background: 'linear-gradient(135deg, #48bb78 0%, #68d391 100%)',
    color: 'white',
    padding: '0.4rem 0.8rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
  },
  vipDiscountBadge: {
    background: 'linear-gradient(135deg, #9f7aea 0%, #b794f4 100%)',
  },
  discountsInfo: {
    background: '#f7fafc',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  discountsTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '0.75rem',
  },
  discountsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  discountItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid #edf2f7',
  },
  discountName: {
    fontSize: '0.85rem',
    color: '#2d3748',
    flex: 1,
  },
  discountValue: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#48bb78',
    margin: '0 1rem',
  },
  discountAmount: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#718096',
  },
  savingsTotal: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#2d3748',
    textAlign: 'center',
    padding: '0.5rem',
    background: '#e6fffa',
    borderRadius: '6px',
  },
  cartSection: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  quantitySelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  quantityLabel: {
    fontSize: '0.9rem',
    color: '#718096',
    fontWeight: '600',
  },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    background: 'white',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  stepperButton: {
    padding: '0.75rem 1rem',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#4a5568',
    fontSize: '1.2rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    minWidth: '50px',
    '&:hover:not(:disabled)': {
      background: '#f7fafc',
    },
  },
  quantityInput: {
    width: '60px',
    textAlign: 'center',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#1a202c',
    fontSize: '1.1rem',
    fontWeight: '600',
    padding: '0.75rem 0',
  },
  addToCartButton: {
    flex: 1,
    padding: '1rem 2rem',
    border: 'none',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1.1rem',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    minHeight: '56px',
    boxShadow: '0 4px 12px rgba(66, 153, 225, 0.3)',
    '&:hover:not(:disabled)': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(66, 153, 225, 0.4)',
    },
  },
  addToCartButtonDisabled: {
    background: '#a0aec0',
    cursor: 'not-allowed',
    opacity: 0.6,
    transform: 'none',
    boxShadow: 'none',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid transparent',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  detailsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    padding: '1.5rem',
    background: '#f7fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#718096',
    fontWeight: '600',
  },
  detailValue: {
    fontWeight: '600',
    color: '#2d3748',
  },
  detailValueSavings: {
    color: '#38a169',
    fontWeight: '700',
  },
  recommendationsSection: {
    background: 'white',
    padding: '2.5rem',
    borderRadius: '20px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
  },
  recommendationsTitle: {
    fontSize: '1.8rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
    textAlign: 'center',
    color: '#1a202c',
  },
  recommendationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
}

export default ProductDetails