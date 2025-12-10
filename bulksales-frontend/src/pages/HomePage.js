import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import SortBar from '../components/SortBar'
import Pagination from '../components/Pagination'
import Banner from '../components/Banner'
import { useAuth } from '../context/AuthContext'
import { bulkApi } from '../misc/BulkApi'
import { useLocation } from 'react-router-dom'

function HomePage() {
  const location = useLocation()
  const { userIsAuthenticated, getUser } = useAuth()
  const user = getUser()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState('display')
  const [viewMode, setViewMode] = useState('grid')
  const [page, setPage] = useState(1)
  const [discounts, setDiscounts] = useState([])
  const [vipSettings, setVipSettings] = useState(null)
  const [productGroups, setProductGroups] = useState([])
  const [selectedGroups, setSelectedGroups] = useState([])
  const [priceRange, setPriceRange] = useState([0, 10000])
  const [showOnlyDiscounted, setShowOnlyDiscounted] = useState(false)
  const [showOnlyInStock, setShowOnlyInStock] = useState(true)
  const pageSize = 12

  // 🔥 ИСПРАВЛЕННАЯ функция для объединения всех продуктов
  const combineAllProducts = (allProducts, groups) => {
    console.log('🔄 Объединяем все продукты...')
    
    // Создаем Map для уникальных продуктов по ID
    const uniqueProducts = new Map()
    
    // 1. Добавляем все основные продукты
    allProducts.forEach(product => {
      if (product.active !== false) {
        uniqueProducts.set(product.id, {
          ...product,
          groups: product.groups || []
        })
      }
    })
    
    // 2. Добавляем продукты из групп
    groups.forEach(group => {
      if (group.products && Array.isArray(group.products)) {
        group.products.forEach(product => {
          if (product.active !== false) {
            if (!uniqueProducts.has(product.id)) {
              // Если продукт есть в группе, но нет в основном списке
              uniqueProducts.set(product.id, {
                ...product,
                groups: [{
                  id: group.id,
                  name: group.name,
                  description: group.description
                }]
              })
            } else {
              // Если продукт уже есть, добавляем группу к нему
              const existingProduct = uniqueProducts.get(product.id)
              const groupAlreadyExists = existingProduct.groups?.some(g => g.id === group.id)
              
              if (!groupAlreadyExists) {
                uniqueProducts.set(product.id, {
                  ...existingProduct,
                  groups: [
                    ...(existingProduct.groups || []),
                    {
                      id: group.id,
                      name: group.name,
                      description: group.description
                    }
                  ]
                })
              }
            }
          }
        })
      }
    })
    
    const result = Array.from(uniqueProducts.values())
    console.log('✅ Объединено продуктов:', result.length)
    console.log('📊 Из основного списка:', allProducts.length)
    console.log('📊 Из групп:', groups.reduce((acc, group) => acc + (group.products?.length || 0), 0))
    
    return result
  }

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams(location.search)
        const cat = params.get('category') || ''
        setSelectedCategory(cat)
        
        console.log('🚀 Начало загрузки данных...')
        
        // 🔥 ЗАГРУЖАЕМ ВСЕ ПРОДУКТЫ независимо от категории
        const isGuest = !userIsAuthenticated()
        const [allProductsResp, catsResp, discountsResp, vipResp, groupsResp] = await Promise.all([
          isGuest ? bulkApi.getActiveProducts() : bulkApi.getAllProducts(),
          bulkApi.getCategories(),
          bulkApi.getAllDiscounts(),
          bulkApi.getVipConfig(),
          bulkApi.getActiveProductGroups(),
        ])
        
        console.log('📦 Сырые данные продуктов:', allProductsResp.data?.length)
        console.log('🏷️ Группы:', groupsResp.data?.length)
        console.log('📋 Продукты в группах:', 
          groupsResp.data?.reduce((acc, group) => acc + (group.products?.length || 0), 0))
        
        // Фильтруем активные продукты из основного списка
        const activeProducts = (allProductsResp.data || []).filter(p => p.active !== false)
        
        // 🔥 ОБЪЕДИНЯЕМ ВСЕ ПРОДУКТЫ: основные + из групп
        const allCombinedProducts = combineAllProducts(activeProducts, groupsResp.data || [])
        
        setProducts(allCombinedProducts)
        setCategories(catsResp.data || [])
        setDiscounts(Array.isArray(discountsResp.data) ? discountsResp.data : [])
        setVipSettings(vipResp.data)
        setProductGroups(groupsResp.data || [])
        
      } catch (e) {
        console.error('❌ Ошибка загрузки:', e)
        setError('Не удалось загрузить товары')
      } finally {
        setLoading(false)
      }
    }
    fetchInitial()
  }, [location.search])

  // Функция для расчета лучшей цены
  const calculateBestPrice = (product) => {
    const basePrice = Number(product.price) || 0
    let bestPrice = basePrice

    // Стандартная скидка товара
    if (product.discountedPrice && Number(product.discountedPrice) < basePrice) {
      bestPrice = Math.min(bestPrice, Number(product.discountedPrice))
    }

    // Скидки из системы
    const now = new Date()
    const activeDiscounts = discounts.filter(discount => {
      if (!discount) return false
      
      const start = discount.startDate ? new Date(discount.startDate) : null
      const end = discount.endDate ? new Date(discount.endDate) : null
      if (start && now < start) return false
      if (end && now > end) return false
      
      if (discount.scope === 'PRODUCT' && discount.productId === product.id) return true
      if (discount.scope === 'CATEGORY' && discount.category === product.category) return true
      if (discount.scope === 'GLOBAL') return true
      
      return false
    })

    // Применяем скидки
    activeDiscounts.forEach(discount => {
      if (discount.type === 'PERCENT' && discount.percent) {
        const discountPrice = basePrice * (1 - discount.percent / 100)
        bestPrice = Math.min(bestPrice, discountPrice)
      }
    })

    // VIP скидка
    if (userIsAuthenticated() && user?.role === 'USER' && vipSettings) {
      const vipDiscountPercent = Number(vipSettings.vipDiscountPercent) || 0
      if (vipDiscountPercent > 0) {
        const vipPrice = basePrice * (1 - vipDiscountPercent / 100)
        bestPrice = Math.min(bestPrice, vipPrice)
      }
    }

    return {
      bestPrice: Math.round(bestPrice * 100) / 100,
      basePrice,
      hasDiscount: bestPrice < basePrice,
      discountPercent: bestPrice < basePrice ? Math.round(((basePrice - bestPrice) / basePrice) * 100) : 0
    }
  }

  // Обогащаем продукты
  const enrichedProducts = products.map(product => ({
    ...product,
    priceInfo: calculateBestPrice(product),
    inStock: (product.quantity || 0) > 0 // 🔥 ИСПРАВЛЕНО: используем quantity вместо stockQuantity
  }))

  // Отладочная информация
  useEffect(() => {
    if (enrichedProducts.length > 0) {
      console.log('🔍 Отладочная информация:')
      console.log(' - Всего продуктов:', enrichedProducts.length)
      console.log(' - Продукты с группами:', enrichedProducts.filter(p => p.groups && p.groups.length > 0).length)
      console.log(' - Выбранные группы:', selectedGroups)
      
      if (selectedGroups.length > 0) {
        const productsInSelectedGroups = enrichedProducts.filter(p => 
          p.groups && p.groups.some(group => selectedGroups.includes(group.id))
        )
        console.log(' - Продукты в выбранных группах:', productsInSelectedGroups.length)
        
        // Детальная информация о продуктах и их группах
        enrichedProducts.forEach(product => {
          if (product.groups && product.groups.length > 0) {
            const groupNames = product.groups.map(g => g.name).join(', ')
            const hasSelectedGroups = product.groups.some(g => selectedGroups.includes(g.id))
            console.log(`📦 ${product.name}: группы=${groupNames}, совпадение=${hasSelectedGroups}`)
          }
        })
      }
    }
  }, [enrichedProducts, selectedGroups])

  const onSelectCategory = async (cat) => {
    setSelectedCategory(cat)
    setPage(1)
    setLoading(true)
    try {
      let productsResponse
      const isGuest = !userIsAuthenticated()
      if (!cat) {
        productsResponse = isGuest ? await bulkApi.getActiveProducts() : await bulkApi.getAllProducts()
      } else {
        productsResponse = await bulkApi.getActiveByCategory(cat)
      }
      
      // Фильтруем активные продукты
      const activeProducts = (productsResponse.data || []).filter(p => p.active !== false)
      
      // 🔥 ОБЪЕДИНЯЕМ С ПРОДУКТАМИ ИЗ ГРУПП
      const allCombinedProducts = combineAllProducts(activeProducts, productGroups)
      
      setProducts(allCombinedProducts)
    } catch (e) { 
      setError('Не удалось загрузить товары') 
    } finally { 
      setLoading(false) 
    }
  }

  // Фильтрация - ИСПРАВЛЕНА
  const filtered = enrichedProducts.filter(p => {
    // Поиск
    const matchesSearch = !q || 
      p.name?.toLowerCase().includes(q.toLowerCase()) || 
      p.description?.toLowerCase().includes(q.toLowerCase())
    
    // Цена
    const matchesPrice = p.priceInfo.bestPrice >= priceRange[0] && p.priceInfo.bestPrice <= priceRange[1]
    
    // Скидки
    const matchesDiscount = !showOnlyDiscounted || p.priceInfo.hasDiscount
    
    // Наличие
    const matchesStock = !showOnlyInStock || p.inStock
    
    // Группы - ИСПРАВЛЕНО
    const matchesGroups = selectedGroups.length === 0 || 
      (p.groups && p.groups.some(group => selectedGroups.includes(group.id)))
    
    return matchesSearch && matchesPrice && matchesDiscount && matchesStock && matchesGroups
  })

  // Сортировка
  const sorted = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case 'price_asc': 
        return a.priceInfo.bestPrice - b.priceInfo.bestPrice
      case 'price_desc': 
        return b.priceInfo.bestPrice - a.priceInfo.bestPrice
      case 'new': 
        return (b.id ?? 0) - (a.id ?? 0)
      case 'discount': 
        return (b.priceInfo.discountPercent || 0) - (a.priceInfo.discountPercent || 0)
      case 'display': 
        return (a.displayPriority ?? 999) - (b.displayPriority ?? 999) || ((b.priority === true) - (a.priority === true))
      default: 
        return (b.priority === true) - (a.priority === true)
    }
  })

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const start = (page - 1) * pageSize
  const paginated = sorted.slice(start, start + pageSize)

  // Сброс фильтров
  const resetFilters = () => {
    setSelectedGroups([])
    setPriceRange([0, 10000])
    setShowOnlyDiscounted(false)
    setShowOnlyInStock(true)
    setQ('')
    setPage(1)
  }

  // Если пользователь админ - показываем упрощенный заголовок
  const isAdmin = userIsAuthenticated() && user?.role === 'ADMIN'

  return (
    <div style={styles.page}>
      <Navbar />
      
      <main style={styles.main}>
        <Banner />
        
        {/* Заголовок */}
        <div style={styles.header}>
          <h1 style={styles.title}>
            {isAdmin ? 'Магазин - Просмотр товаров' : 'Добро пожаловать в оптовый магазин'}
          </h1>
          <p style={styles.subtitle}>
            {selectedCategory 
              ? `Товары категории "${selectedCategory}"` 
              : 'Все товары в одном месте'
            }
          </p>
        </div>

        <div style={styles.contentLayout}>
          {/* Боковая панель фильтров */}
          <aside style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <h3 style={styles.sidebarTitle}>Фильтры</h3>
              <button 
                style={styles.resetButton}
                onClick={resetFilters}
              >
                Сбросить
              </button>
            </div>

            {/* Поиск */}
            <div style={styles.filterSection}>
              <h4 style={styles.filterTitle}>Поиск</h4>
              <div style={styles.searchContainer}>
                <input 
                  value={q} 
                  onChange={(e) => { setQ(e.target.value); setPage(1) }} 
                  placeholder="Название или описание..." 
                  style={styles.search} 
                />
                <div style={styles.searchIcon}>🔍</div>
              </div>
            </div>

            {/* Категории */}
            <div style={styles.filterSection}>
              <h4 style={styles.filterTitle}>Категории</h4>
              <div style={styles.filterList}>
                <button 
                  onClick={() => onSelectCategory('')} 
                  style={{ 
                    ...styles.filterItem,
                    ...(selectedCategory === '' ? styles.filterItemActive : {})
                  }}
                >
                  Все товары
                </button>
                {categories.map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => onSelectCategory(c.name)}
                    style={{ 
                      ...styles.filterItem,
                      ...(selectedCategory === c.name ? styles.filterItemActive : {})
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Группировки */}
            {productGroups.length > 0 && (
              <div style={styles.filterSection}>
                <h4 style={styles.filterTitle}>Подборки</h4>
                <div style={styles.filterList}>
                  {productGroups.map(group => (
                    <label key={group.id} style={styles.checkboxItem}>
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.id)}
                        onChange={(e) => {
                          const newSelectedGroups = e.target.checked
                            ? [...selectedGroups, group.id]
                            : selectedGroups.filter(id => id !== group.id)
                          
                          console.log(`🎯 Изменение фильтра групп: ${group.name}, выбрано:`, newSelectedGroups)
                          setSelectedGroups(newSelectedGroups)
                          setPage(1)
                        }}
                        style={styles.checkbox}
                      />
                      <span style={styles.checkboxLabel}>
                        {group.name} 
                        <span style={styles.groupCount}>
                          ({group.products ? group.products.length : 0})
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Цена */}
            <div style={styles.filterSection}>
              <h4 style={styles.filterTitle}>Цена, ₽</h4>
              <div style={styles.priceRange}>
                <div style={styles.priceInputs}>
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    style={styles.priceInput}
                    min="0"
                    max="100000"
                  />
                  <span style={styles.priceSeparator}>-</span>
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    style={styles.priceInput}
                    min="0"
                    max="100000"
                  />
                </div>
                <div style={styles.priceDisplay}>
                  от {priceRange[0]} до {priceRange[1]} ₽
                </div>
              </div>
            </div>

            {/* Дополнительные фильтры */}
            <div style={styles.filterSection}>
              <h4 style={styles.filterTitle}>Дополнительно</h4>
              <div style={styles.filterList}>
                <label style={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    checked={showOnlyDiscounted}
                    onChange={(e) => {
                      setShowOnlyDiscounted(e.target.checked)
                      setPage(1)
                    }}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkboxLabel}>Только со скидкой</span>
                </label>
                <label style={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    checked={showOnlyInStock}
                    onChange={(e) => {
                      setShowOnlyInStock(e.target.checked)
                      setPage(1)
                    }}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkboxLabel}>Только в наличии</span>
                </label>
              </div>
            </div>
          </aside>

          {/* Основной контент */}
          <div style={styles.content}>
            {/* Панель управления */}
            <div style={styles.controlsSection}>
              <div style={styles.resultsInfo}>
                <span style={styles.resultsCount}>
                  Найдено: <strong>{filtered.length}</strong> товаров
                </span>
                {selectedCategory && (
                  <span style={styles.resultsCategory}>
                    Категория: <strong>{selectedCategory}</strong>
                  </span>
                )}
                {selectedGroups.length > 0 && (
                  <span style={styles.resultsCategory}>
                    Группы: <strong>{selectedGroups.length}</strong>
                  </span>
                )}
              </div>
              
              <SortBar 
                sortKey={sortKey} 
                setSortKey={setSortKey} 
                total={filtered.length} 
                viewMode={viewMode} 
                setViewMode={setViewMode} 
              />
            </div>

            {/* Контент */}
            {loading ? (
              <div style={styles.loadingContainer}>
                <div style={styles.loadingSpinner}></div>
                <p style={styles.loadingText}>Загружаем товары...</p>
              </div>
            ) : error ? (
              <div style={styles.errorContainer}>
                <div style={styles.errorIcon}>⚠️</div>
                <p style={styles.errorText}>{error}</p>
                <button 
                  style={styles.retryButton}
                  onClick={() => window.location.reload()}
                >
                  Попробовать снова
                </button>
              </div>
            ) : (
              <>
                {paginated.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>📦</div>
                    <h3 style={styles.emptyTitle}>Товары не найдены</h3>
                    <p style={styles.emptyText}>
                      {q ? 'Попробуйте изменить поисковый запрос' : 'Попробуйте изменить параметры фильтров'}
                    </p>
                    {selectedGroups.length > 0 && (
                      <p style={styles.emptyHint}>
                        Выбрано групп: {selectedGroups.length}. Возможно, в этих группах нет товаров.
                      </p>
                    )}
                    <button 
                      style={styles.resetButton}
                      onClick={resetFilters}
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={viewMode === 'grid' ? styles.grid : styles.list}>
                      {paginated.map(product => (
                        <ProductCard 
                          key={product.id} 
                          product={product}
                          priceInfo={product.priceInfo}
                        />
                      ))}
                    </div>
                    <Pagination page={page} setPage={setPage} pages={pages} />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

const styles = {
  page: { 
    display: 'flex', 
    flexDirection: 'column', 
    minHeight: '100vh', 
    fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    color: '#1e293b'
  },
  main: { 
    flex: 1, 
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%'
  },
  header: {
    textAlign: 'center',
    marginBottom: '3rem',
    padding: '2rem 0'
  },
  title: { 
    fontSize: '2.5rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.5rem',
    lineHeight: 1.2
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#64748b',
    fontWeight: '500'
  },
  contentLayout: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '2rem',
    alignItems: 'start'
  },
  sidebar: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 25px rgba(0, 0, 0, 0.08)',
    border: '1px solid #f1f5f9',
    position: 'sticky',
    top: '2rem',
    maxHeight: 'calc(100vh - 4rem)',
    overflowY: 'auto'
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #f1f5f9'
  },
  sidebarTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  resetButton: {
    background: 'none',
    border: '1px solid #e2e8f0',
    color: '#64748b',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: '#f8fafc',
      borderColor: '#cbd5e1'
    }
  },
  filterSection: {
    marginBottom: '2rem'
  },
  filterTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 1rem 0'
  },
  searchContainer: {
    position: 'relative',
    width: '100%'
  },
  search: { 
    width: '100%',
    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#1e293b',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    '&:focus': {
      outline: 'none',
      borderColor: '#3b82f6',
      background: 'white',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    }
  },
  searchIcon: {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '1rem',
    color: '#64748b'
  },
  filterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  filterItem: {
    background: 'none',
    border: 'none',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    color: '#64748b',
    '&:hover': {
      background: '#f8fafc',
      color: '#374151'
    }
  },
  filterItemActive: {
    background: '#3b82f6',
    color: 'white',
    '&:hover': {
      background: '#2563eb',
      color: 'white'
    }
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0',
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: '#374151',
    transition: 'all 0.2s ease',
    '&:hover': {
      color: '#1e293b'
    }
  },
  checkbox: {
    width: '1.1rem',
    height: '1.1rem',
    accentColor: '#3b82f6'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontWeight: '500'
  },
  groupCount: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontWeight: '400'
  },
  priceRange: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  priceInputs: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  priceInput: {
    flex: 1,
    padding: '0.6rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.9rem',
    textAlign: 'center',
    minWidth: '0',
    '&:focus': {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)'
    }
  },
  priceSeparator: {
    color: '#64748b',
    fontWeight: '600',
    padding: '0 0.25rem'
  },
  priceDisplay: {
    fontSize: '0.875rem',
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
    background: '#f8fafc',
    padding: '0.5rem',
    borderRadius: '6px'
  },
  content: {
    minHeight: '400px'
  },
  controlsSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    padding: '1.5rem',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
  },
  resultsInfo: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  resultsCount: {
    fontSize: '1rem',
    color: '#374151',
    fontWeight: '500'
  },
  resultsCategory: {
    fontSize: '0.9rem',
    color: '#64748b',
    background: '#f8fafc',
    padding: '0.5rem 1rem',
    borderRadius: '20px'
  },
  grid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
    gap: '1.5rem',
    marginBottom: '3rem'
  },
  list: { 
    display: 'grid', 
    gridTemplateColumns: '1fr', 
    gap: '1rem',
    marginBottom: '3rem'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    gap: '1.5rem'
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '1.1rem',
    color: '#64748b',
    fontWeight: '500'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    textAlign: 'center',
    gap: '1.5rem'
  },
  errorIcon: {
    fontSize: '4rem',
    color: '#ef4444'
  },
  errorText: {
    fontSize: '1.2rem',
    color: '#475569',
    fontWeight: '500'
  },
  retryButton: {
    padding: '1rem 2rem',
    border: 'none',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)'
    }
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    textAlign: 'center',
    gap: '1.5rem',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
  },
  emptyIcon: {
    fontSize: '4rem',
    color: '#cbd5e1',
    marginBottom: '1rem'
  },
  emptyTitle: {
    fontSize: '1.5rem',
    color: '#475569',
    fontWeight: '600',
    margin: 0
  },
  emptyText: {
    fontSize: '1.1rem',
    color: '#64748b',
    margin: 0
  },
  emptyHint: {
    fontSize: '0.9rem',
    color: '#94a3b8',
    fontStyle: 'italic',
    margin: 0
  }
}

export default HomePage