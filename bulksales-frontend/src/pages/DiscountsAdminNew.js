import React, { useState, useEffect, useMemo } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { bulkApi } from '../misc/BulkApi'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import '../styles/theme.css'

function DiscountsAdminNew() {
  const { userIsAuthenticated, getUser } = useAuth()
  const user = getUser()
  const toast = useToast()

  // State management
  const [discounts, setDiscounts] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  
  // VIP Settings state
  const [vipSettings, setVipSettings] = useState({
    vipThreshold: '0',
    vipDiscountPercent: '0'
  })
  const [savingVipSettings, setSavingVipSettings] = useState(false)
  const [showVipSettings, setShowVipSettings] = useState(false)
  
  // Table and filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterScope, setFilterScope] = useState('')
  const [filterStatus, setFilterStatus] = useState('') // Новый фильтр для статуса активности
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingDiscount, setDeletingDiscount] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'PERCENT',
    scope: 'PRODUCT',
    percent: '',
    minQuantity: '',
    buyQty: '',
    freeQty: '',
    category: '',
    productId: '',
    startDate: '',
    endDate: '',
    minOrderAmount: '',
    isVip: false
  })
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    const ok = userIsAuthenticated && typeof userIsAuthenticated === 'function' ? userIsAuthenticated() : true
    if (ok && (user?.role === 'MANAGER' || user?.role === 'ADMIN')) {
      loadData()
      loadVipSettings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [discountsRes, productsRes] = await Promise.all([
        bulkApi.getAllDiscounts(),
        bulkApi.getAllProducts()
      ])
      
      const discountsData = Array.isArray(discountsRes.data) ? discountsRes.data : []
      const productsData = Array.isArray(productsRes.data) ? productsRes.data : []
      
      setDiscounts(discountsData)
      setProducts(productsData)
      
      // Extract unique categories
      const uniqueCategories = [...new Set(productsData.map(p => p.category).filter(Boolean))]
      setCategories(uniqueCategories)
      
      setError('')
    } catch (err) {
      setError('Не удалось загрузить данные')
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadVipSettings = async () => {
    try {
      const response = await bulkApi.getVipConfig()
      const settings = response.data
      setVipSettings({
        vipThreshold: settings.vipThreshold?.toString() || '0',
        vipDiscountPercent: settings.vipDiscountPercent?.toString() || '0'
      })
    } catch (err) {
      console.error('Failed to load VIP settings:', err)
    }
  }

  const saveVipSettings = async () => {
    setSavingVipSettings(true)
    try {
      await bulkApi.updateVipConfig({
        vipThreshold: parseFloat(vipSettings.vipThreshold) || 0,
        vipDiscountPercent: parseFloat(vipSettings.vipDiscountPercent) || 0
      })
      toast.push('Настройки VIP обновлены')
      setShowVipSettings(false)
    } catch (err) {
      setError('Не удалось сохранить настройки VIP')
    } finally {
      setSavingVipSettings(false)
    }
  }
  // Перенесите эти функции ВЫШЕ useMemo

const isDiscountActive = (discount) => {
  const now = new Date()
  const start = discount.startDate ? new Date(discount.startDate) : null
  const end = discount.endDate ? new Date(discount.endDate) : null
  
  if (start && now < start) return false
  if (end && now > end) return false
  
  return true
}

const getDiscountTypeLabel = (type) => {
  switch (type) {
    case 'PERCENT': return 'Процентная'
    case 'THRESHOLD': return 'По количеству'
    case 'BXGY': return 'Купи X получи Y'
    default: return type
  }
}

const getScopeLabel = (scope) => {
  switch (scope) {
    case 'PRODUCT': return 'Товар'
    case 'CATEGORY': return 'Категория'
    case 'GLOBAL': return 'Глобальная'
    default: return scope
  }
}

// Filtered and sorted discounts
const filteredDiscounts = useMemo(() => {
  let filtered = discounts.filter(discount => {
    const matchesSearch = discount.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         discount.category?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !filterType || discount.type === filterType
    const matchesScope = !filterScope || discount.scope === filterScope
    const matchesStatus = !filterStatus || 
      (filterStatus === 'ACTIVE' && isDiscountActive(discount)) ||
      (filterStatus === 'INACTIVE' && !isDiscountActive(discount)) ||
      (filterStatus === 'VIP' && discount.isVip) ||
      (filterStatus === 'REGULAR' && !discount.isVip)
    
    return matchesSearch && matchesType && matchesScope && matchesStatus
  })

  // Sort
  filtered.sort((a, b) => {
    let aValue = a[sortField]
    let bValue = b[sortField]
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue?.toLowerCase() || ''
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  return filtered
}, [discounts, searchTerm, filterType, filterScope, filterStatus, sortField, sortDirection])



  // Pagination
  const paginatedDiscounts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredDiscounts.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredDiscounts, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredDiscounts.length / itemsPerPage)

  // Если страница вышла за пределы — возвращаемся на 1-ю
  useEffect(() => {
    setCurrentPage((page) => {
      const maxPage = Math.max(1, Math.ceil(filteredDiscounts.length / itemsPerPage) || 1)
      return page > maxPage ? 1 : page
    })
  }, [filteredDiscounts, itemsPerPage])

  const validateForm = () => {
    const errors = {}

    if (!formData.name?.trim()) {
      errors.name = 'Название обязательно'
    }

    if (formData.type === 'PERCENT' || formData.type === 'THRESHOLD') {
      if (!formData.percent || formData.percent < 0 || formData.percent > 100) {
        errors.percent = 'Процент должен быть от 0 до 100'
      }
    }

    if (formData.type === 'THRESHOLD' && (!formData.minQuantity || formData.minQuantity < 1)) {
      errors.minQuantity = 'Минимальное количество должно быть больше 0'
    }

    if (formData.type === 'BXGY') {
      if (!formData.buyQty || formData.buyQty < 1) {
        errors.buyQty = 'Количество для покупки должно быть больше 0'
      }
      if (!formData.freeQty || formData.freeQty < 1) {
        errors.freeQty = 'Количество бесплатных должно быть больше 0'
      }
    }

    if (formData.scope === 'PRODUCT' && !formData.productId) {
      errors.productId = 'Выберите продукт'
    }

    if (formData.scope === 'CATEGORY' && !formData.category?.trim()) {
      errors.category = 'Выберите категорию'
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      errors.endDate = 'Дата окончания должна быть после даты начала'
    }

    // Валидация для VIP скидок
    if (formData.isVip && (!formData.minOrderAmount || formData.minOrderAmount < 0)) {
      errors.minOrderAmount = 'Минимальная сумма заказа должна быть больше 0'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setSaving(true)
    try {
      const discountData = {
        name: formData.name.trim(),
        type: formData.type,
        scope: formData.scope,
        percent: formData.percent ? parseFloat(formData.percent) : null,
        minQuantity: formData.minQuantity ? parseInt(formData.minQuantity) : null,
        buyQty: formData.buyQty ? parseInt(formData.buyQty) : null,
        freeQty: formData.freeQty ? parseInt(formData.freeQty) : null,
        category: formData.scope === 'CATEGORY' ? formData.category : null,
        productId: formData.scope === 'PRODUCT' ? formData.productId : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : null,
        isVip: formData.isVip
      }

      console.log('Sending discount data:', discountData)

      if (editingDiscount) {
        await bulkApi.updateDiscount(editingDiscount.id, discountData)
        toast.push('Скидка успешно обновлена')
        setShowEditModal(false)
        setEditingDiscount(null)
      } else {
        await bulkApi.createDiscount(discountData)
        toast.push('Скидка успешно создана')
        setShowCreateModal(false)
      }

      resetForm()
      await loadData()
    } catch (err) {
      setError('Не удалось сохранить скидку')
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (discount) => {
    setEditingDiscount(discount)
    setFormData({
      name: discount.name || '',
      type: discount.type || 'PERCENT',
      scope: discount.scope || 'PRODUCT',
      percent: discount.percent || '',
      minQuantity: discount.minQuantity || '',
      buyQty: discount.buyQty || '',
      freeQty: discount.freeQty || '',
      category: discount.category || '',
      productId: discount.productId || '',
      startDate: discount.startDate || '',
      endDate: discount.endDate || '',
      minOrderAmount: discount.minOrderAmount || '',
      isVip: discount.isVip || false
    })
    setFormErrors({})
    setShowEditModal(true)
  }

  const handleDelete = async () => {
    if (!deletingDiscount) return

    setLoading(true)
    try {
      await bulkApi.deleteDiscount(deletingDiscount.id)
      toast.push('Скидка успешно удалена')
      setShowDeleteModal(false)
      setDeletingDiscount(null)
      await loadData()
    } catch (err) {
      setError('Не удалось удалить скидку')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'PERCENT',
      scope: 'PRODUCT',
      percent: '',
      minQuantity: '',
      buyQty: '',
      freeQty: '',
      category: '',
      productId: '',
      startDate: '',
      endDate: '',
      minOrderAmount: '',
      isVip: false
    })
    setFormErrors({})
  }



  if (!userIsAuthenticated() || user?.role !== 'MANAGER') {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="card text-center">
            <h2 className="card-title text-error">Доступ запрещен</h2>
            <p className="text-muted">Только администраторы могут управлять скидками</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <Navbar />
      
      <main style={styles.main}>
        <div className="container">
          {/* Header */}
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>Управление скидками</h1>
              <p style={styles.subtitle}>
                Создавайте и управляйте скидками для товаров, категорий, VIP клиентов и глобальными акциями
              </p>
            </div>
            
            <div style={styles.headerButtons}>
              <button
                className="btn btn-vip btn-lg"
                onClick={() => setShowVipSettings(true)}
              >
                Настройки VIP
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => {
                  resetForm()
                  setShowCreateModal(true)
                }}
              >
                Создать скидку
              </button>
            </div>
          </div>

          {/* VIP Settings Info Card */}
          <div style={styles.vipInfoCard}>
            <div style={styles.vipInfoContent}>
              <div style={styles.vipInfoIcon}>👑</div>
              <div style={styles.vipInfoText}>
                <h4 style={styles.vipInfoTitle}>Автоматическая VIP скидка</h4>
                <p style={styles.vipInfoDescription}>
                  При сумме заказа от <strong>${vipSettings.vipThreshold}</strong> клиенты получают автоматическую скидку <strong>{vipSettings.vipDiscountPercent}%</strong>
                </p>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowVipSettings(true)}
              >
                Изменить
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>💰</div>
              <div>
                <div style={styles.statValue}>{discounts.length}</div>
                <div style={styles.statLabel}>Всего скидок</div>
              </div>
            </div>
            
            <div style={styles.statCard}>
              <div style={{ ...styles.statIcon, backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>✅</div>
              <div>
                <div style={styles.statValue}>
                  {discounts.filter(d => isDiscountActive(d)).length}
                </div>
                <div style={styles.statLabel}>Активных</div>
              </div>
            </div>
            
            <div style={styles.statCard}>
              <div style={{ ...styles.statIcon, backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>⏸️</div>
              <div>
                <div style={styles.statValue}>
                  {discounts.filter(d => !isDiscountActive(d)).length}
                </div>
                <div style={styles.statLabel}>Неактивных</div>
              </div>
            </div>
            
            <div style={styles.statCard}>
              <div style={{ ...styles.statIcon, backgroundColor: 'var(--vip-light)', color: 'var(--vip)' }}>👑</div>
              <div>
                <div style={styles.statValue}>
                  {discounts.filter(d => d.isVip).length}
                </div>
                <div style={styles.statLabel}>VIP скидок</div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div style={styles.filtersCard}>
            <div style={styles.filtersRow}>
              <div style={styles.searchBox}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Поиск по названию или категории..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div style={styles.filtersGroup}>
                <select
                  className="form-select"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">Все типы</option>
                  <option value="PERCENT">Процентные</option>
                  <option value="THRESHOLD">По количеству</option>
                  <option value="BXGY">Купи X получи Y</option>
                </select>
                
                <select
                  className="form-select"
                  value={filterScope}
                  onChange={(e) => setFilterScope(e.target.value)}
                >
                  <option value="">Все области</option>
                  <option value="PRODUCT">Товары</option>
                  <option value="CATEGORY">Категории</option>
                  <option value="GLOBAL">Глобальные</option>
                </select>

                <select
                  className="form-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">Все статусы</option>
                  <option value="ACTIVE">Активные</option>
                  <option value="INACTIVE">Неактивные</option>
                  <option value="VIP">VIP скидки</option>
                  <option value="REGULAR">Обычные скидки</option>
                </select>
              </div>
            </div>

            <div style={styles.tableInfo}>
              <span style={styles.resultsCount}>
                Показано {paginatedDiscounts.length} из {filteredDiscounts.length} скидок
              </span>
              
              {(searchTerm || filterType || filterScope || filterStatus) && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setSearchTerm('')
                    setFilterType('')
                    setFilterScope('')
                    setFilterStatus('')
                  }}
                >
                  Очистить фильтры
                </button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
              <button onClick={() => setError('')} style={styles.closeButton}>×</button>
            </div>
          )}

          {/* Loading */}
          {loading && !showCreateModal && !showEditModal && !showDeleteModal && (
            <div style={styles.loadingCard}>
              <div className="loading-spinner"></div>
              <span>Загрузка...</span>
            </div>
          )}

          {/* Table */}
          <div style={styles.tableCard}>
            <table className="table">
              <thead>
                <tr>
                  <th style={styles.sortableHeader} onClick={() => {
                    if (sortField === 'name') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('name')
                      setSortDirection('asc')
                    }
                  }}>
                    Название {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th>Тип</th>
                  <th>Область</th>
                  <th>Значение</th>
                  <th>Условия</th>
                  <th>Период</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDiscounts.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={styles.emptyState}>
                      <div style={styles.emptyContent}>
                        <div style={styles.emptyIcon}>📋</div>
                        <p>Скидки не найдены</p>
                        {(searchTerm || filterType || filterScope || filterStatus) && (
                          <p style={styles.emptySubtext}>
                            Попробуйте изменить критерии поиска
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedDiscounts.map((discount) => (
                    <tr key={discount.id}>
                      <td>
                        <div style={styles.discountName}>
                          <div style={styles.nameRow}>
                            {discount.name}
                            {discount.isVip && (
                              <span style={styles.vipBadge}>VIP</span>
                            )}
                          </div>
                          {discount.category && (
                            <div style={styles.categoryBadge}>
                              {discount.category}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          discount.type === 'PERCENT' ? 'badge-primary' : 
                          discount.type === 'THRESHOLD' ? 'badge-warning' : 'badge-secondary'
                        }`}>
                          {getDiscountTypeLabel(discount.type)}
                        </span>
                      </td>
                      <td>
                        {getScopeLabel(discount.scope)}
                      </td>
                      <td style={styles.discountValue}>
                        {discount.type === 'THRESHOLD' ? (
                          `${discount.percent ?? 0}% (min ${discount.minQuantity ?? 0})`
                        ) : discount.type === 'BXGY' ? (
                          `${discount.buyQty}+${discount.freeQty}`
                        ) : (
                          `${discount.percent ?? 0}%`
                        )}
                      </td>
                      <td style={styles.conditions}>
                        {discount.minOrderAmount && (
                          <div style={styles.conditionItem}>
                            <strong>От:</strong> ${discount.minOrderAmount}
                          </div>
                        )}
                        {discount.isVip && (
                          <div style={styles.vipCondition}>
                            Только для VIP клиентов
                          </div>
                        )}
                        {!discount.minOrderAmount && !discount.isVip && (
                          <span style={styles.noConditions}>Без условий</span>
                        )}
                      </td>
                      <td style={styles.dateRange}>
                        {discount.startDate && (
                          <div>С: {new Date(discount.startDate).toLocaleDateString()}</div>
                        )}
                        {discount.endDate && (
                          <div>По: {new Date(discount.endDate).toLocaleDateString()}</div>
                        )}
                        {!discount.startDate && !discount.endDate && (
                          <span style={styles.permanentLabel}>Постоянно</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          isDiscountActive(discount) ? 'badge-success' : 'badge-warning'
                        }`}>
                          {isDiscountActive(discount) ? 'Активна' : 'Неактивна'}
                        </span>
                      </td>
                      <td>
                        <div style={styles.actionButtons}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleEdit(discount)}
                            title="Редактировать"
                          >
                            Редактировать
                          </button>
                          <button
                            className="btn btn-error btn-sm"
                            onClick={() => {
                              setDeletingDiscount(discount)
                              setShowDeleteModal(true)
                            }}
                            title="Удалить"
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  ← Назад
                </button>
                
                <div style={styles.pageNumbers}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`btn btn-sm ${
                        currentPage === page ? 'btn-primary' : 'btn-ghost'
                      }`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  className="btn btn-outline btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Вперед →
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* VIP Settings Modal */}
      {showVipSettings && (
        <div className="modal-overlay" onClick={() => setShowVipSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Настройки автоматической VIP скидки</h3>
              <button 
                className="modal-close"
                onClick={() => setShowVipSettings(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div style={styles.vipSettingsInfo}>
                <div style={styles.vipSettingsIcon}>👑</div>
                <p style={styles.vipSettingsDescription}>
                  Автоматическая скидка применяется для всех VIP клиентов при достижении указанной суммы заказа
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Минимальная сумма заказа для VIP скидки ($)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  step="0.01"
                  value={vipSettings.vipThreshold}
                  onChange={(e) => setVipSettings({
                    ...vipSettings,
                    vipThreshold: e.target.value
                  })}
                  placeholder="100.00"
                />
                <div style={styles.helperText}>
                  Сумма заказа, при достижении которой применяется VIP скидка
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Размер VIP скидки (%)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="100"
                  step="0.01"
                  value={vipSettings.vipDiscountPercent}
                  onChange={(e) => setVipSettings({
                    ...vipSettings,
                    vipDiscountPercent: e.target.value
                  })}
                  placeholder="10"
                />
                <div style={styles.helperText}>
                  Процент скидки, который получат VIP клиенты при выполнении условия
                </div>
              </div>

              <div style={styles.vipSettingsPreview}>
                <h4>Пример применения:</h4>
                <p>
                  При сумме заказа <strong>${vipSettings.vipThreshold}</strong> VIP клиент получит скидку <strong>{vipSettings.vipDiscountPercent}%</strong>
                </p>
                {vipSettings.vipThreshold > 0 && vipSettings.vipDiscountPercent > 0 && (
                  <p style={styles.vipSettingsExample}>
                    Заказ на $500: скидка ${(500 * vipSettings.vipDiscountPercent / 100).toFixed(2)} → итого ${(500 * (1 - vipSettings.vipDiscountPercent / 100)).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button"
                className="btn btn-outline"
                onClick={() => setShowVipSettings(false)}
              >
                Отмена
              </button>
              <button 
                type="button"
                className="btn btn-vip"
                onClick={saveVipSettings}
                disabled={savingVipSettings}
              >
                {savingVipSettings ? (
                  <>
                    <div className="loading-spinner"></div>
                    Сохраняется...
                  </>
                ) : (
                  'Сохранить настройки VIP'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateModal(false)
          setShowEditModal(false)
          setEditingDiscount(null)
          resetForm()
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingDiscount ? 'Редактировать скидку' : 'Создать скидку'}
              </h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowCreateModal(false)
                  setShowEditModal(false)
                  setEditingDiscount(null)
                  resetForm()
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label className="form-label">Название скидки *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Скидка 20% на молочные продукты"
                  required
                />
                {formErrors.name && <div className="form-error">{formErrors.name}</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                <div className="form-group">
                  <label className="form-label">Тип скидки *</label>
                  <select
                    className="form-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="PERCENT">Процентная скидка</option>
                    <option value="THRESHOLD">Скидка по количеству</option>
                    <option value="BXGY">Купи X получи Y бесплатно</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Область применения *</label>
                  <select
                    className="form-select"
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    required
                  >
                    <option value="PRODUCT">Конкретный товар</option>
                    <option value="CATEGORY">Категория товаров</option>
                    <option value="GLOBAL">Глобальная скидка</option>
                  </select>
                </div>
              </div>

              {/* VIP Discount Settings */}
              <div style={styles.vipSection}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.isVip}
                      onChange={(e) => setFormData({ ...formData, isVip: e.target.checked })}
                    />
                    <span className="checkmark"></span>
                    VIP скидка
                  </label>
                  <div style={styles.vipDescription}>
                    Скидка будет применяться только для VIP клиентов при выполнении условий
                  </div>
                </div>

                {formData.isVip && (
                  <div className="form-group">
                    <label className="form-label">Минимальная сумма заказа для VIP *</label>
                    <input
                      type="number"
                      className="form-input"
                      min="0"
                      step="0.01"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                      placeholder="100.00"
                      required
                    />
                    {formErrors.minOrderAmount && (
                      <div className="form-error">{formErrors.minOrderAmount}</div>
                    )}
                    <div style={styles.helperText}>
                      Скидка будет применяться только если сумма заказа превышает указанное значение
                    </div>
                  </div>
                )}
              </div>

              {/* Conditional Fields */}
              {(formData.type === 'PERCENT' || formData.type === 'THRESHOLD') && (
                <div className="form-group">
                  <label className="form-label">Размер скидки (%) *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.percent}
                    onChange={(e) => setFormData({ ...formData, percent: e.target.value })}
                    placeholder="15"
                    required
                  />
                  {formErrors.percent && <div className="form-error">{formErrors.percent}</div>}
                </div>
              )}

              {formData.type === 'THRESHOLD' && (
                <div className="form-group">
                  <label className="form-label">Минимальное количество *</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    value={formData.minQuantity}
                    onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                    placeholder="3"
                    required
                  />
                  {formErrors.minQuantity && <div className="form-error">{formErrors.minQuantity}</div>}
                </div>
              )}

              {formData.type === 'BXGY' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                  <div className="form-group">
                    <label className="form-label">Купить количество *</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      value={formData.buyQty}
                      onChange={(e) => setFormData({ ...formData, buyQty: e.target.value })}
                      placeholder="2"
                      required
                    />
                    {formErrors.buyQty && <div className="form-error">{formErrors.buyQty}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Получить бесплатно *</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      value={formData.freeQty}
                      onChange={(e) => setFormData({ ...formData, freeQty: e.target.value })}
                      placeholder="1"
                      required
                    />
                    {formErrors.freeQty && <div className="form-error">{formErrors.freeQty}</div>}
                  </div>
                </div>
              )}

              {formData.scope === 'PRODUCT' && (
                <div className="form-group">
                  <label className="form-label">Выберите товар *</label>
                  <select
                    className="form-select"
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    required
                  >
                    <option value="">Выберите товар...</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - ${product.price}
                      </option>
                    ))}
                  </select>
                  {formErrors.productId && <div className="form-error">{formErrors.productId}</div>}
                </div>
              )}

              {formData.scope === 'CATEGORY' && (
                <div className="form-group">
                  <label className="form-label">Выберите категорию *</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="">Выберите категорию...</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {formErrors.category && <div className="form-error">{formErrors.category}</div>}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                <div className="form-group">
                  <label className="form-label">Дата начала</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Дата окончания</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                  {formErrors.endDate && <div className="form-error">{formErrors.endDate}</div>}
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowEditModal(false)
                    setEditingDiscount(null)
                    resetForm()
                  }}
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="loading-spinner"></div>
                      Сохраняется...
                    </>
                  ) : (
                    editingDiscount ? 'Обновить скидку' : 'Создать скидку'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingDiscount && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Удалить скидку</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletingDiscount(null)
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p>Вы действительно хотите удалить скидку <strong>"{deletingDiscount.name}"</strong>?</p>
              <p style={{ color: 'var(--error)', fontSize: 'var(--font-size-sm)' }}>
                Это действие нельзя отменить.
              </p>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletingDiscount(null)
                }}
              >
                Отмена
              </button>
              <button 
                className="btn btn-error"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Удаляется...
                  </>
                ) : (
                  'Удалить'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: 'var(--bg)'
  },
  main: {
    flex: 1,
    paddingTop: 'var(--space-2xl)',
    paddingBottom: 'var(--space-2xl)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'var(--space-2xl)'
  },
  headerButtons: {
    display: 'flex',
    gap: 'var(--space-md)',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: 'var(--font-size-3xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--text)',
    marginBottom: 'var(--space-sm)'
  },
  subtitle: {
    margin: 0,
    fontSize: 'var(--font-size-lg)',
    color: 'var(--text-muted)'
  },
  vipInfoCard: {
    background: 'linear-gradient(135deg, var(--vip-light) 0%, var(--vip-lighter) 100%)',
    border: '1px solid var(--vip)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-xl)',
    marginBottom: 'var(--space-2xl)',
    boxShadow: 'var(--shadow)'
  },
  vipInfoContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)'
  },
  vipInfoIcon: {
    fontSize: '2rem'
  },
  vipInfoText: {
    flex: 1
  },
  vipInfoTitle: {
    margin: 0,
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--vip)',
    marginBottom: 'var(--space-xs)'
  },
  vipInfoDescription: {
    margin: 0,
    color: 'var(--text)',
    fontSize: 'var(--font-size-sm)'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'var(--space-lg)',
    marginBottom: 'var(--space-2xl)'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-xl)',
    boxShadow: 'var(--shadow)'
  },
  statIcon: {
    width: '48px',
    height: '48px',
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem'
  },
  statValue: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--text)',
    marginBottom: 'var(--space-xs)'
  },
  statLabel: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-muted)'
  },
  filtersCard: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-xl)',
    marginBottom: 'var(--space-lg)',
    boxShadow: 'var(--shadow)'
  },
  filtersRow: {
    display: 'flex',
    gap: 'var(--space-lg)',
    alignItems: 'center',
    marginBottom: 'var(--space-lg)'
  },
  searchBox: {
    flex: 1
  },
  filtersGroup: {
    display: 'flex',
    gap: 'var(--space-md)',
    minWidth: '400px'
  },
  tableInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  resultsCount: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-muted)'
  },
  loadingCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-md)',
    padding: 'var(--space-xl)',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-lg)'
  },
  tableCard: {
    background: 'var(--card)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow)'
  },
  sortableHeader: {
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color var(--transition-base)'
  },
  emptyState: {
    textAlign: 'center',
    padding: 'var(--space-3xl)'
  },
  emptyContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-md)'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: 'var(--space-md)'
  },
  emptySubtext: {
    color: 'var(--text-light)',
    fontSize: 'var(--font-size-sm)'
  },
  discountName: {
    fontWeight: 'var(--font-weight-semibold)'
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    marginBottom: 'var(--space-xs)'
  },
  vipBadge: {
    background: 'linear-gradient(135deg, var(--vip) 0%, var(--vip-dark) 100%)',
    color: 'white',
    padding: 'var(--space-xs) var(--space-sm)',
    borderRadius: 'var(--radius)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-bold)'
  },
  categoryBadge: {
    display: 'inline-block',
    padding: 'var(--space-xs) var(--space-sm)',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius)',
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-muted)'
  },
  discountValue: {
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--success)'
  },
  conditions: {
    fontSize: 'var(--font-size-sm)',
    lineHeight: 'var(--line-height-tight)'
  },
  conditionItem: {
    marginBottom: 'var(--space-xs)'
  },
  vipCondition: {
    color: 'var(--vip)',
    fontWeight: 'var(--font-weight-semibold)',
    fontSize: 'var(--font-size-xs)'
  },
  noConditions: {
    color: 'var(--text-muted)',
    fontStyle: 'italic'
  },
  dateRange: {
    fontSize: 'var(--font-size-sm)',
    lineHeight: 'var(--line-height-tight)'
  },
  permanentLabel: {
    color: 'var(--text-muted)',
    fontStyle: 'italic'
  },
  actionButtons: {
    display: 'flex',
    gap: 'var(--space-sm)'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-xl)',
    borderTop: '1px solid var(--border)',
    background: 'var(--bg-secondary)'
  },
  pageNumbers: {
    display: 'flex',
    gap: 'var(--space-xs)'
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
    color: 'currentColor',
    padding: '0 var(--space-sm)'
  },
  vipSettingsInfo: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-md)',
    background: 'var(--vip-light)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-lg)'
  },
  vipSettingsIcon: {
    fontSize: '1.5rem',
    marginTop: 'var(--space-xs)'
  },
  vipSettingsDescription: {
    margin: 0,
    color: 'var(--text)',
    fontSize: 'var(--font-size-sm)',
    lineHeight: 'var(--line-height-relaxed)'
  },
  vipSettingsPreview: {
    background: 'var(--bg-secondary)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    marginTop: 'var(--space-lg)'
  },
  vipSettingsExample: {
    margin: 'var(--space-sm) 0 0 0',
    padding: 'var(--space-md)',
    background: 'var(--success-light)',
    color: 'var(--success)',
    borderRadius: 'var(--radius)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)'
  },
  helperText: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-muted)',
    marginTop: 'var(--space-xs)'
  },
  vipSection: {
    background: 'var(--vip-light)',
    border: '1px solid var(--vip)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-lg)',
    marginBottom: 'var(--space-lg)'
  },
  vipDescription: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-muted)',
    marginTop: 'var(--space-xs)'
  }
  // ... остальные стили
}

export default DiscountsAdminNew