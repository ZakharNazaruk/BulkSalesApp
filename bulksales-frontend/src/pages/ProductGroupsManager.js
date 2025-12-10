// ProductGroupsManager.jsx
import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { bulkApi } from '../misc/BulkApi'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import '../styles/theme.css'

function ProductGroupsManager() {
  const { userIsAuthenticated, getUser } = useAuth()
  const user = getUser()
  const toast = useToast()

  const [groups, setGroups] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showProductsModal, setShowProductsModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    displayOrder: 0,
    isActive: true,
    imageUrl: '',
    type: 'MANUAL'
  })

  useEffect(() => {
    if (userIsAuthenticated() && user?.role === 'MANAGER') {
      loadData()
    }
  }, [])

const loadData = async () => {
  setLoading(true)
  try {
    const [groupsRes, productsRes] = await Promise.all([
      bulkApi.getAllProductGroups(),
      bulkApi.getAllProducts()
    ])
    
    // Загружаем детальную информацию для каждой группы
    const groupsWithDetails = await Promise.all(
      groupsRes.data.map(async (group) => {
        try {
          const groupDetails = await bulkApi.getProductGroupById(group.id)
          return groupDetails.data
        } catch (err) {
          console.error(`Ошибка загрузки группы ${group.id}:`, err)
          return { ...group, products: [] }
        }
      })
    )
    
    setGroups(groupsWithDetails)
    setProducts(Array.isArray(productsRes.data) ? productsRes.data : [])
  } catch (err) {
    setError('Не удалось загрузить данные')
    console.error('Load data error:', err)
  } finally {
    setLoading(false)
  }
}

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingGroup) {
        await bulkApi.updateProductGroup(editingGroup.id, formData)
        toast.push('Группа обновлена')
        setShowEditModal(false)
      } else {
        await bulkApi.createProductGroup(formData)
        toast.push('Группа создана')
        setShowCreateModal(false)
      }
      resetForm()
      await loadData()
    } catch (err) {
      setError('Не удалось сохранить группу')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (groupId) => {
    if (!window.confirm('Удалить группу?')) return
    try {
      await bulkApi.deleteProductGroup(groupId)
      toast.push('Группа удалена')
      await loadData()
    } catch (err) {
      setError('Не удалось удалить группу')
    }
  }

  const handleToggleActive = async (groupId) => {
    try {
      await bulkApi.toggleProductGroupActive(groupId)
      toast.push('Статус группы изменен')
      await loadData()
    } catch (err) {
      setError('Не удалось изменить статус')
    }
  }

  const handleAddProduct = async (groupId, productId) => {
  try {
    await bulkApi.addProductToGroup(groupId, productId)
    toast.push('Товар добавлен в группу')
    // Обновляем данные конкретной группы
    await refreshGroupData(groupId)
  } catch (err) {
    setError('Не удалось добавить товар')
  }
}

const handleRemoveProduct = async (groupId, productId) => {
  try {
    await bulkApi.removeProductFromGroup(groupId, productId)
    toast.push('Товар удален из группы')
    // Обновляем данные конкретной группы
    await refreshGroupData(groupId)
  } catch (err) {
    setError('Не удалось удалить товар')
  }
}

// Функция для обновления данных конкретной группы
const refreshGroupData = async (groupId) => {
  try {
    const groupDetails = await bulkApi.getProductGroupById(groupId)
    setGroups(prev => prev.map(group => 
      group.id === groupId ? groupDetails.data : group
    ))
    
    // Обновляем выбранную группу если она открыта в модальном окне
    if (selectedGroup && selectedGroup.id === groupId) {
      setSelectedGroup(groupDetails.data)
    }
  } catch (err) {
    console.error('Error refreshing group:', err)
  }
}

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      displayOrder: 0,
      isActive: true,
      imageUrl: '',
      type: 'MANUAL'
    })
    setEditingGroup(null)
  }

  const openEditModal = (group) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description || '',
      displayOrder: group.displayOrder || 0,
      isActive: group.isActive,
      imageUrl: group.imageUrl || '',
      type: group.type || 'MANUAL'
    })
    setShowEditModal(true)
  }

  const openProductsModal = (group) => {
    setSelectedGroup(group)
    setShowProductsModal(true)
  }

  if (!userIsAuthenticated() || user?.role !== 'MANAGER') {
    return (
      <div style={styles.container}>
        <Navbar />
        <main style={styles.main}>
          <div style={styles.accessDenied}>
            <h2>Доступ запрещен</h2>
            <p>Только менеджеры могут управлять группировками</p>
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
        <div style={styles.header}>
          <h1 style={styles.title}>Управление группировками товаров</h1>
          <p style={styles.subtitle}>Создавайте и управляйте группами товаров для улучшения навигации</p>
          <button
            style={styles.createButton}
            onClick={() => setShowCreateModal(true)}
          >
            + Создать группу
          </button>
        </div>

        {error && (
          <div style={styles.error}>
            {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>Загрузка...</div>
        ) : (
          <div style={styles.groupsGrid}>
            {groups.map(group => (
              <div key={group.id} style={styles.groupCard}>
                <div style={styles.groupHeader}>
                  <h3 style={styles.groupName}>{group.name}</h3>
                  <span style={styles.productCount}>
  {group.products ? group.products.length : 0} товаров
</span>
                </div>
                <p style={styles.groupDescription}>{group.description}</p>
                <div style={styles.groupMeta}>
                  <span style={styles.groupType}>{group.type}</span>
                  <span style={styles.groupOrder}>Порядок: {group.displayOrder}</span>
                </div>
                <div style={styles.groupActions}>
                  <button
                    style={styles.actionButton}
                    onClick={() => openProductsModal(group)}
                  >
                    📦 Товары
                  </button>
                  <button
                    style={styles.actionButton}
                    onClick={() => openEditModal(group)}
                  >
                    ✏️ Редактировать
                  </button>
                  <button
                    style={{
                      ...styles.actionButton,
                      ...(group.isActive ? styles.deactivateButton : styles.activateButton)
                    }}
                    onClick={() => handleToggleActive(group.id)}
                  >
                    {group.isActive ? '⏸️ Деактивировать' : '▶️ Активировать'}
                  </button>
                  <button
                    style={{...styles.actionButton, ...styles.deleteButton}}
                    onClick={() => handleDelete(group.id)}
                  >
                    🗑️ Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {(showCreateModal || showEditModal) && (
          <div style={styles.modalOverlay} onClick={() => {
            setShowCreateModal(false)
            setShowEditModal(false)
            resetForm()
          }}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <h2>{editingGroup ? 'Редактировать группу' : 'Создать группу'}</h2>
              <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                  <label>Название группы *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Описание</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    rows="3"
                  />
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label>Порядок отображения</label>
                    <input
                      type="number"
                      value={formData.displayOrder}
                      onChange={e => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Тип группы</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="MANUAL">Ручная</option>
                      <option value="CATEGORY_BASED">По категории</option>
                      <option value="DISCOUNT">Со скидками</option>
                      <option value="FEATURED">Рекомендуемые</option>
                      <option value="NEW_ARRIVALS">Новинки</option>
                      <option value="BEST_SELLERS">Хиты продаж</option>
                    </select>
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    />
                    Активная группа
                  </label>
                </div>
                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setShowEditModal(false)
                      resetForm()
                    }}
                  >
                    Отмена
                  </button>
                  <button type="submit" disabled={saving}>
                    {saving ? 'Сохранение...' : (editingGroup ? 'Обновить' : 'Создать')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Products Management Modal */}
        {showProductsModal && selectedGroup && (
          <div style={styles.modalOverlay} onClick={() => setShowProductsModal(false)}>
            <div style={{...styles.modal, maxWidth: '800px'}} onClick={e => e.stopPropagation()}>
              <h2>Управление товарами: {selectedGroup.name}</h2>
              
              <div style={styles.productsSection}>
                <h3>Добавить товары в группу</h3>
                <div style={styles.productsGrid}>
                  {products
                    .filter(p => !selectedGroup.products?.some(gp => gp.id === p.id))
                    .map(product => (
                      <div key={product.id} style={styles.productItem}>
                        <span>{product.name}</span>
                        <button
                          style={styles.addButton}
                          onClick={() => handleAddProduct(selectedGroup.id, product.id)}
                        >
                          +
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              <div style={styles.productsSection}>
                <h3>Товары в группе ({selectedGroup.products?.length || 0})</h3>
                <div style={styles.productsGrid}>
                  {selectedGroup.products?.map(product => (
                    <div key={product.id} style={styles.productItem}>
                      <span>{product.name}</span>
                      <button
                        style={styles.removeButton}
                        onClick={() => handleRemoveProduct(selectedGroup.id, product.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.modalActions}>
                <button onClick={() => setShowProductsModal(false)}>
                  Закрыть
                </button>
              </div>
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
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    color: '#1e293b'
  },
  main: {
    flex: 1,
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%'
  },
  header: {
    textAlign: 'center',
    marginBottom: '3rem'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#64748b',
    marginBottom: '2rem'
  },
  createButton: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)'
    }
  },
  groupsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem'
  },
  groupCard: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
    }
  },
  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem'
  },
  groupName: {
    margin: 0,
    fontSize: '1.3rem',
    fontWeight: '600',
    color: '#1e293b'
  },
  productCount: {
    background: '#dbeafe',
    color: '#1d4ed8',
    padding: '0.3rem 0.6rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600'
  },
  groupDescription: {
    color: '#64748b',
    marginBottom: '1rem',
    lineHeight: 1.5
  },
  groupMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '1.5rem'
  },
  groupType: {
    background: '#f1f5f9',
    padding: '0.3rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    color: '#475569',
    fontWeight: '500'
  },
  groupOrder: {
    color: '#64748b',
    fontSize: '0.8rem'
  },
  groupActions: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  actionButton: {
    padding: '0.5rem 1rem',
    border: '1px solid #e2e8f0',
    background: 'white',
    color: '#475569',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    transition: 'all 0.2s ease',
    fontWeight: '500',
    '&:hover': {
      background: '#f8fafc'
    }
  },
  deleteButton: {
    background: '#fef2f2',
    color: '#dc2626',
    borderColor: '#fecaca',
    '&:hover': {
      background: '#fee2e2'
    }
  },
  activateButton: {
    background: '#f0fdf4',
    color: '#16a34a',
    borderColor: '#bbf7d0',
    '&:hover': {
      background: '#dcfce7'
    }
  },
  deactivateButton: {
    background: '#fffbeb',
    color: '#d97706',
    borderColor: '#fde68a',
    '&:hover': {
      background: '#fef3c7'
    }
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    background: 'white',
    padding: '2rem',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '2rem'
  },
  productsSection: {
    marginBottom: '2rem'
  },
  productsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '0.5rem',
    maxHeight: '200px',
    overflow: 'auto'
  },
  productItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  addButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  removeButton: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #fecaca'
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: '#64748b',
    fontSize: '1.1rem'
  },
  accessDenied: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#64748b'
  }
}

export default ProductGroupsManager;