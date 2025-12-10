import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { bulkApi } from '../misc/BulkApi'

function PlanogramBuilder() {
  // Основное состояние
  const [floorplans, setFloorplans] = useState([])
  const [selected, setSelected] = useState(null)
  const [types, setTypes] = useState([])
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Полки и ячейки
  const [cells, setCells] = useState([])
  const [activeShelf, setActiveShelf] = useState(null)

  // UI состояние
  const [zoom, setZoom] = useState(1)
  const [grid, setGrid] = useState(20)
  const [wallMode, setWallMode] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [bannerMode, setBannerMode] = useState(false)

  // Drag & Drop
  const [drag, setDrag] = useState(null)
  const [wallStart, setWallStart] = useState(null)

  // Баннеры
  const [showBannerModal, setShowBannerModal] = useState(false)
  const [bannerPosition, setBannerPosition] = useState(null)

  // Preview for wall drawing and highlight top products
  const [wallPreview, setWallPreview] = useState(null)
  const [topProductIds, setTopProductIds] = useState(new Set())

  // ИИ аналитика
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  // Memoized данные
  const productsById = useMemo(() => Object.fromEntries((products || []).map(p => [p.id, p])), [products])

  useEffect(() => {
    load()
  }, [])

  // Hotkeys for modes
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'w' || e.key === 'W') setWallMode(v => !v)
      if (e.key === 'd' || e.key === 'D') setDeleteMode(v => !v)
      if (e.key === 'b' || e.key === 'B') setBannerMode(v => !v)
      if (e.key === 'Escape') {
        setWallStart(null);
        setWallPreview(null);
        setWallMode(false);
        setDeleteMode(false);
        setBannerMode(false);
      }
      if (e.key === 'a' || e.key === 'A') analyzePlanogram()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

const load = async () => {
  try {
    setError('')
    console.log('🔄 Starting load...')
    
    const [fpsResponse, tpsResponse, prodsResponse, topsResponse] = await Promise.all([
      bulkApi.floorplansGet().catch(e => { 
        console.error('❌ Floorplans error:', e);
        return { data: [] };
      }),
      bulkApi.shelfTypesGet().catch(e => {
        console.error('❌ Shelf types error:', e);
        return { data: [] };
      }),
      bulkApi.getAllProducts().catch(e => {
        console.error('❌ Products error:', e);
        return { data: [] };
      }),
      bulkApi.getTopProducts(10).catch(e => {
        console.error('❌ Top products error:', e);
        return { data: { data: [], success: false } };
      })
    ])

    const fps = fpsResponse?.data || [];
    const tps = tpsResponse?.data || [];
    const prods = prodsResponse?.data || [];
    
    // ИСПРАВЛЕНИЕ: правильно извлекаем топовые продукты
    console.log('📊 Raw tops response:', topsResponse);
    
    const topsData = topsResponse?.data?.data; // ← ВАЖНО: data.data
    console.log('📦 Tops data:', topsData);
    
    const tops = Array.isArray(topsData) ? topsData : [];

    console.log('=== LOADED DATA SUMMARY ===');
    console.log('Floorplans:', fps.length);
    console.log('Shelf types:', tps.length);
    console.log('Products:', prods.length);
    console.log('Top products:', tops.length);
    console.log('Top products array:', tops);

    setFloorplans(fps)
    setTypes(tps)
    setProducts(prods)
    
    // Создаем Set из топовых productId
    const topIds = new Set();
    
    if (Array.isArray(tops) && tops.length > 0) {
      console.log('🎯 Processing top products...');
      
      tops.forEach((item, index) => {
        console.log(`Top item ${index}:`, item);
        
        // Пробуем разные возможные поля для productId
        const productId = item.productId || item.id;
        
        if (productId) {
          console.log(`✅ Found productId: ${productId}`);
          topIds.add(productId);
        } else {
          console.log(`❌ No productId found in:`, item);
        }
      });
    } else {
      console.log('⚠️ No top products found in response');
    }
    
    console.log('🎯 Final top product IDs:', Array.from(topIds));
    setTopProductIds(topIds)
    
    if (fps.length > 0) {
      setSelected(fps[0])
    }
    
  } catch (e) {
    console.error('💥 Load error:', e)
    setError('Не удалось загрузить данные: ' + e.message)
  }
}
  const analyzePlanogram = async () => {
    if (!selected) {
      setError('Сначала выберите план')
      return
    }

    setAnalyzing(true)
    try {
      console.log('Starting AI analysis for floorplan:', selected.id)
      const response = await bulkApi.analyzePlanogram(selected.id)
      console.log('AI analysis response:', response.data)
      
      setAiAnalysis(response.data)
      setSuccess('AI анализ завершен!')
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      console.error('AI analysis error:', e)
      console.warn('AI API недоступен, используем локальный анализ:', e.message)
      const planogramData = {
        floorplan: selected,
        shelves: selected.shelves || [],
        products: products,
        topProducts: Array.from(topProductIds),
        walls: selected.walls || []
      }
      const analysis = generateLocalAnalysis(planogramData)
      setAiAnalysis(analysis)
      setSuccess('Локальный анализ завершен (AI временно недоступен)')
      
      setTimeout(() => setSuccess(''), 3000)
    } finally {
      setAnalyzing(false)
    }
  }

  const generateLocalAnalysis = (data) => {
    const { floorplan, shelves, products, topProducts, walls } = data

    const totalShelves = shelves.length
    const totalProducts = products.length
    const filledCells = shelves.reduce((total, shelf) => {
      return total + (shelf.cells?.filter(cell => cell.product).length || 0)
    }, 0)

    const totalCells = shelves.reduce((total, shelf) => {
      return total + (shelf.shelfType?.rows * shelf.shelfType?.cols || 0)
    }, 0)

    const utilization = totalCells > 0 ? (filledCells / totalCells * 100).toFixed(1) : 0

    const categoryDistribution = {}
    shelves.forEach(shelf => {
      shelf.cells?.forEach(cell => {
        if (cell.product) {
          const product = products.find(p => p.id === cell.product.id)
          if (product?.category) {
            categoryDistribution[product.category] = (categoryDistribution[product.category] || 0) + 1
          }
        }
      })
    })

    const usedArea = shelves.reduce((area, shelf) => area + (shelf.width * shelf.height), 0)
    const totalArea = floorplan.width * floorplan.height
    const areaUtilization = (usedArea / totalArea * 100).toFixed(1)

    const recommendations = []

    if (utilization < 50) {
      recommendations.push({
        type: 'warning',
        text: 'Низкая заполненность полок (' + utilization + '%). Добавьте больше товаров.'
      })
    }

    if (areaUtilization < 30) {
      recommendations.push({
        type: 'warning',
        text: 'Плохое использование пространства (' + areaUtilization + '%). Добавьте больше полок.'
      })
    }

    if (topProducts.length > 0 && filledCells > 0) {
      const topProductsOnShelves = shelves.filter(shelf =>
        shelf.cells?.some(cell =>
          cell.product && topProducts.includes(cell.product.id)
        )
      ).length

      if (topProductsOnShelves < topProducts.length) {
        recommendations.push({
          type: 'info',
          text: 'Не все топовые товары размещены на полках. Разместите их для увеличения продаж.'
        })
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        text: 'Отличная планограмма! Хорошее использование пространства и распределение товаров.'
      })
    }

    return {
      metrics: {
        totalShelves,
        totalProducts,
        filledCells,
        totalCells,
        utilization: utilization + '%',
        areaUtilization: areaUtilization + '%',
        categoryDistribution
      },
      recommendations,
      timestamp: new Date().toLocaleString()
    }
  }

  const snap = (v) => Math.round(v / grid) * grid

  const onDropShelf = async (e) => {
    if (!selected || !drag) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = snap(Math.round((e.clientX - rect.left) / zoom))
    const y = snap(Math.round((e.clientY - rect.top) / zoom))
    try {
      await bulkApi.floorplanAddShelf(selected.id, drag, x, y)
      await load()
      setSuccess('Полка добавлена!')
      setTimeout(() => setSuccess(''), 2000)
    } catch (e) {
      setError('Не удалось добавить полку: ' + e.message)
    }
  }

  const openShelf = async (shelf) => {
    try {
      const res = await bulkApi.shelfGetCells(shelf.id)
      const data = res.data
      setActiveShelf(shelf)
      setCells(Array.isArray(data) ? data : [])
    } catch (e) {
      setError('Не удалось открыть полку: ' + e.message)
    }
  }

  const saveShelfCells = async () => {
    try {
      await bulkApi.shelfSaveCells(activeShelf.id, cells)
      setActiveShelf(null)
      setCells([])
      setSuccess('Изменения сохранены!')
      setTimeout(() => setSuccess(''), 2000)
    } catch (e) {
      setError('Не удалось сохранить изменения: ' + e.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '1rem' }}>
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start', 
            marginBottom: '1.5rem', 
            flexWrap: 'wrap', 
            gap: '1rem' 
          }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h1 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.8rem' }}>🧩 Конструктор планограмм</h1>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                Создавайте оптимальные схемы выкладки товаров с AI-аналитикой
              </p>
            </div>

            {selected && (
              <div style={{
                background: 'var(--card)',
                padding: '1rem 1.5rem',
                borderRadius: '12px',
                border: '2px solid var(--primary)',
                minWidth: '250px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  marginBottom: '0.5rem',
                  fontWeight: 'bold',
                  fontSize: '0.95rem'
                }}>
                  <span>📋</span>
                  <span>{selected.name}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '0.8rem', 
                  color: 'var(--text-muted)'
                }}>
                  <span>Размер:</span>
                  <span>{selected.width} × {selected.height} px</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '0.8rem', 
                  color: 'var(--text-muted)'
                }}>
                  <span>Полок:</span>
                  <span>{selected.shelves?.length || 0}</span>
                </div>
              </div>
            )}
          </div>

          {/* Alerts */}
          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>❌ {error}</span>
              <button
                onClick={() => setError('')}
                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ×
              </button>
            </div>
          )}

          {success && (
            <div style={{
              background: '#d1fae5',
              border: '1px solid #a7f3d0',
              color: '#059669',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              ✅ {success}
            </div>
          )}

          {/* Main Layout - Improved Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '300px 1fr 380px', 
            gap: '1.5rem', 
            alignItems: 'start',
            height: 'calc(100vh - 200px)',
            minHeight: '600px'
          }}>

            {/* Left Panel - Tools & Controls */}
            <div style={{ 
              ...styles.card,
              height: '100%',
              overflow: 'auto'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid var(--border)'
              }}>
                <div style={{ fontSize: '1.5rem' }}>🛠️</div>
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>Инструменты</h3>
              </div>

              {/* Floorplan Selection */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  fontWeight: 600, 
                  marginBottom: '1rem', 
                  fontSize: '0.95rem', 
                  color: 'var(--primary)' 
                }}>
                  <span>🗺️</span>
                  <span>Выбор плана</span>
                </div>
                
<select
  style={{ 
    ...styles.input, 
    marginBottom: '1rem',
    background: 'var(--input-bg)',
    border: '2px solid var(--input-border)'
  }}
  onChange={async (e) => {
    const floorplanId = Number(e.target.value)
    if (floorplanId) {
      try {
        // Используем floorplansGetById(id) для детальной загрузки
        const detailedFloorplan = await bulkApi.floorplansGetById(floorplanId).then(r => r.data)
        setSelected(detailedFloorplan)
      } catch (e) {
        console.error('Failed to load detailed floorplan:', e)
        const basicFloorplan = floorplans.find(f => f.id === floorplanId)
        setSelected(basicFloorplan)
      }
    } else {
      setSelected(null)
    }
  }}
  value={selected?.id || ''}
>
  <option value="">Выберите план...</option>
  {floorplans.map(fp => (
    <option key={fp.id} value={fp.id}>
      {fp.name} ({fp.width}x{fp.height})
    </option>
  ))}
</select>

                {/* Quick Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <button
                    style={{ 
                      ...styles.button, 
                      background: '#8b5cf6', 
                      fontSize: '0.85rem', 
                      padding: '0.75rem 1rem',
                      flex: 1
                    }}
                    onClick={analyzePlanogram}
                    disabled={analyzing || !selected}
                  >
                    {analyzing ? '🔍 Анализ...' : '🤖 AI Анализ'}
                  </button>

                  <button
                    style={{ 
                      ...styles.button, 
                      background: '#10b981', 
                      fontSize: '0.85rem', 
                      padding: '0.75rem',
                      minWidth: 'auto'
                    }}
                    onClick={load}
                    title="Обновить данные"
                  >
                    🔄
                  </button>
                </div>

                {/* Create New Floorplan */}
                <details style={{ marginTop: '1rem' }}>
                  <summary style={{ 
                    cursor: 'pointer', 
                    color: 'var(--primary)', 
                    fontWeight: 600, 
                    fontSize: '0.9rem',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--border)'
                  }}>
                    ➕ Создать новый план
                  </summary>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const name = e.currentTarget.elements.fpname.value.trim();
                    if (!name) { setError('Введите название плана'); return; }
                    const width = Number(e.currentTarget.elements.fpwidth.value || 1200);
                    const height = Number(e.currentTarget.elements.fpheight.value || 800);
                    if (width < 400 || height < 300) { setError('Минимальные размеры: 400x300'); return; }
                    try {
                      await bulkApi.floorplansCreate({ name, width, height });
                      await load();
                      e.currentTarget.reset();
                      setError('');
                    } catch (e) {
                      setError('Не удалось создать план: ' + e.message)
                    }
                  }} style={{ 
                    display: 'grid', 
                    gap: '0.75rem', 
                    marginTop: '1rem', 
                    padding: '1rem', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: '10px' 
                  }}>
                    <input name="fpname" placeholder="Название плана" style={styles.input} required />
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <input name="fpwidth" placeholder="Ширина" type="number" style={styles.input} defaultValue={1200} min={400} />
                      <input name="fpheight" placeholder="Высота" type="number" style={styles.input} defaultValue={800} min={300} />
                    </div>
                    <button style={{...styles.button, fontSize: '0.9rem'}} type="submit">✨ Создать план</button>
                  </form>
                </details>
              </div>

              {/* Shelf Types */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  fontWeight: 600, 
                  marginBottom: '1rem', 
                  fontSize: '0.95rem', 
                  color: 'var(--primary)' 
                }}>
                  <span>📦</span>
                  <span>Типы полок</span>
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--text-muted)', 
                  marginBottom: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  border: '1px dashed var(--border)'
                }}>
                  🔄 Перетащите тип полки на план
                </div>

                {types.length === 0 ? (
                  <div style={{ 
                    color: 'var(--text-muted)', 
                    fontSize: '0.85rem', 
                    textAlign: 'center', 
                    padding: '1.5rem', 
                    border: '2px dashed var(--border)', 
                    borderRadius: '10px',
                    background: 'var(--bg-secondary)'
                  }}>
                    📦 Нет доступных типов полок
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {types.map(t => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={() => setDrag(t.id)}
                        style={{
                          ...styles.draggableItem,
                          padding: '0.75rem',
                          border: '2px solid var(--border)',
                          transition: 'all 0.2s ease',
                          cursor: 'grab'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{t.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                            {t.rows}×{t.cols} ячеек<br/>
                            {t.width}×{t.height}px
                          </div>
                        </div>
                        <div style={{ fontSize: '1.5rem', opacity: 0.7 }}>🗺️</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Create Shelf Type */}
                <details style={{ marginTop: '1.5rem' }}>
                  <summary style={{ 
                    cursor: 'pointer', 
                    color: 'var(--primary)', 
                    fontWeight: 600, 
                    fontSize: '0.9rem',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--border)'
                  }}>
                    🆕 Создать тип полки
                  </summary>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const name = e.currentTarget.elements.tname.value.trim();
                    const rows = Number(e.currentTarget.elements.trows.value || 3);
                    const cols = Number(e.currentTarget.elements.tcols.value || 6);
                    const width = Number(e.currentTarget.elements.twidth.value || 200);
                    const height = Number(e.currentTarget.elements.theight.value || 80);
                    try {
                      await bulkApi.shelfTypeCreate({ name, rows, cols, width, height });
                      await load();
                    } catch (e) {
                      setError('Не удалось создать тип полки: ' + e.message)
                    }
                  }} style={{ 
                    display: 'grid', 
                    gap: '0.75rem', 
                    marginTop: '1rem', 
                    padding: '1rem', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: '10px' 
                  }}>
                    <input name="tname" placeholder="Название типа" style={styles.input} required />
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <input name="trows" placeholder="Рядов" type="number" style={styles.input} defaultValue={3} min={1} />
                      <input name="tcols" placeholder="Колонок" type="number" style={styles.input} defaultValue={6} min={1} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <input name="twidth" placeholder="Ширина" type="number" style={styles.input} defaultValue={200} min={50} />
                      <input name="theight" placeholder="Высота" type="number" style={styles.input} defaultValue={80} min={30} />
                    </div>
                    <button style={{...styles.button, fontSize: '0.9rem'}} type="submit">➕ Создать тип</button>
                  </form>
                </details>
              </div>

              {/* Editor Settings */}
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  fontWeight: 600, 
                  marginBottom: '1rem', 
                  fontSize: '0.95rem', 
                  color: 'var(--primary)' 
                }}>
                  <span>⚙️</span>
                  <span>Настройки редактора</span>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.85rem', 
                      fontWeight: 600, 
                      marginBottom: '0.5rem' 
                    }}>
                      <span>🔍 Масштаб</span>
                      <span style={{ 
                        background: 'var(--primary)', 
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                      }}>
                        {Math.round(zoom * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="2"
                      step="0.1"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      style={{ width: '100%', height: '6px', borderRadius: '3px' }}
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      fontSize: '0.85rem', 
                      fontWeight: 600 
                    }}>
                      <span>🎯 Сетка</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="number"
                          value={grid}
                          onChange={(e) => setGrid(Math.max(5, parseInt(e.target.value || '20', 10)))}
                          style={{ 
                            ...styles.input, 
                            width: '70px', 
                            padding: '0.4rem',
                            textAlign: 'center'
                          }}
                          min={5}
                          max={50}
                        />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>px</span>
                      </div>
                    </label>
                  </div>

                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <label style={{
                      ...styles.checkboxLabel,
                      padding: '0.75rem',
                      background: wallMode ? 'var(--primary-light)' : 'var(--bg-secondary)',
                      border: `2px solid ${wallMode ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={wallMode}
                        onChange={(e) => setWallMode(e.target.checked)}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      <span style={{ fontWeight: 600 }}>🧩 Режим стен</span>
                    </label>

                    <label style={{
                      ...styles.checkboxLabel,
                      padding: '0.75rem',
                      background: deleteMode ? '#fee2e2' : 'var(--bg-secondary)',
                      border: `2px solid ${deleteMode ? '#dc2626' : 'var(--border)'}`,
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={deleteMode}
                        onChange={(e) => setDeleteMode(e.target.checked)}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      <span style={{ fontWeight: 600 }}>🗑️ Режим удаления</span>
                    </label>

                    <label style={{
                      ...styles.checkboxLabel,
                      padding: '0.75rem',
                      background: bannerMode ? '#dbeafe' : 'var(--bg-secondary)',
                      border: `2px solid ${bannerMode ? '#3b82f6' : 'var(--border)'}`,
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={bannerMode}
                        onChange={(e) => setBannerMode(e.target.checked)}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      <span style={{ fontWeight: 600 }}>🎨 Режим баннеров</span>
                    </label>
                  </div>

                  {(wallMode || deleteMode || bannerMode) && (
                    <div style={{
                      ...styles.modeHint,
                      padding: '0.75rem',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}>
                      {wallMode && 'ℹ️ Кликните и перетащите для создания стены'}
                      {deleteMode && 'ℹ️ Кликните по объекту для удаления'}
                      {bannerMode && 'ℹ️ Кликните на план для размещения баннера'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Center Panel - Canvas */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              height: '100%',
              minWidth: 0 
            }}>
              <div style={{
                ...styles.canvasViewport,
                flex: 1,
                height: '100%'
              }}>
                <div
                  style={{
                    ...styles.canvasInner,
                    width: (selected?.width || 1200),
                    height: (selected?.height || 800),
                    transform: `scale(${zoom})`,
                    backgroundImage: `linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)`,
                    backgroundSize: `${grid}px ${grid}px`
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDropShelf}
                  onMouseDown={(e) => {
                    if (bannerMode) {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const x = snap(Math.round((e.clientX - rect.left) / zoom))
                      const y = snap(Math.round((e.clientY - rect.top) / zoom))
                      setBannerPosition({ x, y })
                      setShowBannerModal(true)
                      setBannerMode(false)
                      return
                    }
                    if (!wallMode) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = Math.round((e.clientX - rect.left) / zoom)
                    const y = Math.round((e.clientY - rect.top) / zoom)
                    setWallStart({ x: snap(x), y: snap(y) })
                  }}
                  onMouseMove={(e) => {
                    if (!wallMode || !wallStart) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    let x2 = snap(Math.round((e.clientX - rect.left) / zoom))
                    let y2 = snap(Math.round((e.clientY - rect.top) / zoom))
                    const dx = x2 - wallStart.x
                    const dy = y2 - wallStart.y
                    if (Math.abs(dx) > Math.abs(dy) * 1.5) {
                      y2 = wallStart.y
                    } else if (Math.abs(dy) > Math.abs(dx) * 1.5) {
                      x2 = wallStart.x
                    }
                    setWallPreview({ x1: wallStart.x, y1: wallStart.y, x2, y2 })
                  }}
                  onMouseUp={async (e) => {
                    if (!wallMode || !wallStart) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x2 = snap(Math.round((e.clientX - rect.left) / zoom))
                    const y2 = snap(Math.round((e.clientY - rect.top) / zoom))
                    try {
                      await bulkApi.floorplanAddWall(selected.id, { x1: wallStart.x, y1: wallStart.y, x2, y2 });
                      await load();
                    } catch (e) {
                      setError('Не удалось добавить стену: ' + e.message)
                    }
                    setWallStart(null)
                    setWallPreview(null)
                  }}
                >
                  {/* Walls */}
                  {(selected?.walls || []).map(w => (
                    <MemoizedWallLine
                      key={w.id}
                      wall={w}
                      zoom={1}
                      deleteMode={deleteMode}
                      onDelete={async () => {
                        try {
                          await bulkApi.tryDeleteWall(w.id, selected?.id);
                          await load();
                        } catch (e) {
                          setError('Не удалось удалить стену: ' + e.message)
                        }
                      }}
                    />
                  ))}

                  {/* Preview wall */}
                  {wallPreview && (
                    <MemoizedWallLine wall={wallPreview} zoom={1} deleteMode={false} onDelete={null} />
                  )}

                  {/* Shelves */}
                  {(selected?.shelves || []).map(s => (
                    <MemoizedDraggableShelf
                      key={s.id}
                      shelf={s}
                      floorplanId={selected?.id}
                      zoom={zoom}
                      grid={grid}
                      productsById={productsById}
  topProductIds={topProductIds}
  products={products}
                      sceneW={selected?.width || 1200}
                      sceneH={selected?.height || 800}
                      onOpen={() => openShelf(s)}
                      onMove={async (nx, ny) => {
                        try {
                          await bulkApi.shelfReposition(s.id, nx, ny, s.rotation || 0);
                          load()
                        } catch (e) {
                          setError('Не удалось переместить полку: ' + e.message)
                        }
                      }}
                      onRotate={async () => {
                        try {
                          const rot = ((s.rotation || 0) + 90) % 360;
                          await bulkApi.shelfReposition(s.id, s.x, s.y, rot);
                          load()
                        } catch (e) {
                          setError('Не удалось повернуть полку: ' + e.message)
                        }
                      }}
                      onDelete={async () => {
                        try {
                          await bulkApi.tryDeleteShelf(s.id, selected?.id);
                          await load()
                        } catch (e) {
                          setError('Не удалось удалить полку: ' + e.message)
                        }
                      }}
                      onResized={async () => {
                        try { await load() } catch { }
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Canvas Status Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1rem',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                padding: '0.75rem 1rem',
                background: 'var(--card)',
                borderRadius: '10px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <span><strong>План:</strong> {selected?.name || 'Не выбран'}</span>
                  <span><strong>Полок:</strong> {selected?.shelves?.length || 0}</span>
                  <span><strong>Стен:</strong> {selected?.walls?.length || 0}</span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <span><strong>Масштаб:</strong> {Math.round(zoom * 100)}%</span>
                  <span><strong>Сетка:</strong> {grid}px</span>
                </div>
              </div>
            </div>

            {/* Right Panel - Analysis & Products */}
            <div style={{ 
              ...styles.card,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* AI Analysis Section */}
              <div style={{ flex: 1, overflow: 'auto', marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.5rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid var(--border)'
                }}>
                  <div style={{ fontSize: '1.5rem' }}>🤖</div>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>AI Анализ</h3>
                </div>

                {aiAnalysis ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Optimization Score */}
                    {aiAnalysis.optimizationScore !== undefined && (
                      <div style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '1.25rem',
                        borderRadius: '12px',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                      }}>
                        <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.9 }}>Оценка оптимизации</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', lineHeight: '1' }}>
                          {aiAnalysis.optimizationScore}/100
                        </div>
                        <div style={{ 
                          fontSize: '0.8rem', 
                          marginTop: '0.5rem',
                          opacity: 0.8
                        }}>
                          {aiAnalysis.timestamp || new Date().toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* Metrics */}
                    {aiAnalysis.metrics && (
                      <div>
                        <div style={{ 
                          fontWeight: 600, 
                          marginBottom: '1rem', 
                          fontSize: '0.95rem',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span>📊</span>
                          <span>Метрики эффективности</span>
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gap: '0.75rem', 
                          fontSize: '0.85rem'
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            padding: '0.75rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)'
                          }}>
                            <span>Количество полок</span>
                            <strong>{aiAnalysis.metrics.totalShelves || 0}</strong>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            padding: '0.75rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)'
                          }}>
                            <span>Заполненность</span>
                            <strong>{aiAnalysis.metrics.utilization || '0%'}</strong>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            padding: '0.75rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)'
                          }}>
                            <span>Использование площади</span>
                            <strong>{aiAnalysis.metrics.areaUtilization || '0%'}</strong>
                          </div>
                          {aiAnalysis.metrics.categoryDistribution && (
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              padding: '0.75rem',
                              background: 'var(--bg-secondary)',
                              borderRadius: '8px',
                              border: '1px solid var(--border)'
                            }}>
                              <span>Категорий товаров</span>
                              <strong>{Object.keys(aiAnalysis.metrics.categoryDistribution).length}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* AI Insights */}
                    {aiAnalysis.aiInsights && (
                      <div>
                        <div style={{ 
                          fontWeight: 600, 
                          marginBottom: '1rem', 
                          fontSize: '0.95rem',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span>💡</span>
                          <span>AI Рекомендации</span>
                        </div>
                        <div style={{
                          background: '#f0f9ff',
                          border: '1px solid #e0f2fe',
                          borderRadius: '10px',
                          padding: '1rem',
                          fontSize: '0.85rem',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-line'
                        }}>
                          {aiAnalysis.aiInsights}
                        </div>
                      </div>
                    )}

                    {/* Local Recommendations */}
                    <div>
                      <div style={{ 
                        fontWeight: 600, 
                        marginBottom: '1rem', 
                        fontSize: '0.95rem',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span>🎯</span>
                        <span>Оптимизация</span>
                      </div>
                      <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {(aiAnalysis.localRecommendations && aiAnalysis.localRecommendations.length > 0) ? (
                          aiAnalysis.localRecommendations.map((rec, index) => (
                            <div
                              key={index}
                              style={{
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                background: rec.type === 'warning' ? '#fef3c7' :
                                  rec.type === 'info' ? '#dbeafe' : '#d1fae5',
                                border: rec.type === 'warning' ? '1px solid #f59e0b' :
                                  rec.type === 'info' ? '1px solid #3b82f6' : '1px solid #10b981',
                                color: rec.type === 'warning' ? '#92400e' :
                                  rec.type === 'info' ? '#1e40af' : '#065f46'
                              }}
                            >
                              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                {rec.title || rec.text || 'Рекомендация'}
                              </div>
                              <div>{rec.description || rec.text || ''}</div>
                            </div>
                          ))
                        ) : aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 ? (
                          aiAnalysis.recommendations.map((rec, index) => (
                            <div
                              key={index}
                              style={{
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                background: rec.type === 'warning' ? '#fef3c7' :
                                  rec.type === 'info' ? '#dbeafe' : '#d1fae5',
                                border: rec.type === 'warning' ? '1px solid #f59e0b' :
                                  rec.type === 'info' ? '1px solid #3b82f6' : '1px solid #10b981',
                                color: rec.type === 'warning' ? '#92400e' :
                                  rec.type === 'info' ? '#1e40af' : '#065f46'
                              }}
                            >
                              <div>{rec.text || rec.description || ''}</div>
                            </div>
                          ))
                        ) : (
                          <div style={{
                            padding: '1rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            color: '#6b7280',
                            textAlign: 'center'
                          }}>
                            Нет рекомендаций для отображения
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    padding: '3rem 2rem',
                    fontSize: '0.9rem'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🤖</div>
                    <div style={{ marginBottom: '0.5rem' }}>AI анализ не выполнен</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      Нажмите кнопку "AI Анализ" для получения рекомендаций
                    </div>
                  </div>
                )}
              </div>

              {/* Products Section */}
              <div style={{ 
                borderTop: '2px solid var(--border)',
                paddingTop: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  color: 'var(--primary)'
                }}>
                  <span>🛍️</span>
                  <span>Товары</span>
                  <span style={{ 
                    background: 'var(--primary)', 
                    color: 'white',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.7rem'
                  }}>
                    {products.length}
                  </span>
                </div>
                
                <div style={{ 
                  maxHeight: '300px', 
                  overflow: 'auto', 
                  display: 'grid', 
                  gap: '0.5rem'
                }}>
                  {products.map(p => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(p.id)); }}
                      style={{
                        ...styles.productItem,
                        padding: '0.75rem',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        cursor: 'grab'
                      }}
                    >
                      {p.imageUrl && (
                        <img
                          src={p.imageUrl.startsWith('http') ? p.imageUrl : `http://localhost:8082${p.imageUrl}`}
                          alt=""
                          style={{ 
                            width: 40, 
                            height: 40, 
                            objectFit: 'cover', 
                            borderRadius: '6px', 
                            flexShrink: 0 
                          }}
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: 600, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          marginBottom: '0.25rem'
                        }}>
                          {p.name}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                          {p.price && (
                            <div style={{ color: '#059669', fontWeight: 600 }}>
                              ${p.price}
                            </div>
                          )}
                          {p.category && (
                            <div style={{ color: 'var(--text-muted)' }}>
                              {p.category}
                            </div>
                          )}
                        </div>
                      </div>
                      {topProductIds.has(p.id) && (
                        <div style={{
                          background: '#f59e0b',
                          color: 'white',
                          fontSize: '0.7rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          TOP
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {products.length === 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    color: 'var(--text-muted)', 
                    padding: '2rem', 
                    fontSize: '0.9rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px dashed var(--border)'
                  }}>
                    📦 Нет доступных товаров
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Shelf Editor Modal */}
      {activeShelf && (
        <ShelfEditorModal
          activeShelf={activeShelf}
          cells={cells}
          setCells={setCells}
          products={products}
          productsById={productsById}
          topProductIds={topProductIds}
          onSave={saveShelfCells}
          onClose={() => { setActiveShelf(null); setCells([]); }}
        />
      )}

      {/* Banner Modal */}
      {showBannerModal && bannerPosition && (
        <BannerModal
          position={bannerPosition}
          onSave={async (bannerData) => {
            try {
              console.log('Create banner:', { ...bannerData, x: bannerPosition.x, y: bannerPosition.y, floorplanId: selected?.id })
              await load()
              setShowBannerModal(false)
              setBannerPosition(null)
            } catch (e) {
              setError('Не удалось создать баннер: ' + e.message)
            }
          }}
          onClose={() => {
            setShowBannerModal(false)
            setBannerPosition(null)
          }}
        />
      )}
    </div>
  )
}
function WallLine({ wall, zoom, deleteMode = false, onDelete }) {
  const x1 = wall.x1 * zoom, y1 = wall.y1 * zoom, x2 = wall.x2 * zoom, y2 = wall.y2 * zoom
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  const ang = Math.atan2(dy, dx) * 180 / Math.PI
  return (
    <>
      <div style={{ position: 'absolute', left: x1, top: y1, width: len, height: 0, borderTop: `3px solid ${onDelete ? '#333' : (wall.id ? '#333' : '#60a5fa')}`, opacity: wall.id ? 1 : 0.7, transform: `rotate(${ang}deg)`, transformOrigin: '0 0' }} />
      {deleteMode && (
        <div onClick={() => { if (onDelete && window.confirm('Удалить стену?')) onDelete() }} style={{ position: 'absolute', left: x1, top: y1, width: len, height: 12, transform: `rotate(${ang}deg)`, transformOrigin: '0 0', background: 'rgba(0,0,0,0)', cursor: 'pointer' }} />
      )}
    </>
  )
}

// В PlanogramBuilder.js добавим функцию для определения цвета популярности

const getProductPopularityColor = (productId, topProductIds, allProductsCount) => {
  console.log('getProductPopularityColor called:', {
    productId,
    topProductIds: topProductIds ? Array.from(topProductIds) : 'undefined',
    allProductsCount
  });
  
  // Добавляем больше проверок
  if (!productId || !topProductIds || !topProductIds.size) {
    console.log('Returning green - missing data');
    return '#10b981';
  }

  const topProductsArray = Array.from(topProductIds);
  const productIndex = topProductsArray.indexOf(productId);

  console.log('Product index in top:', productIndex);

  if (productIndex === -1) {
    console.log('Returning green - product not in top');
    return '#10b981';
  }

  const popularityRatio = 1 - (productIndex / topProductsArray.length);
  console.log('Popularity ratio:', popularityRatio);

  let color;
  if (popularityRatio > 0.7) {
    color = '#dc2626';
  } else if (popularityRatio > 0.4) {
    color = '#ea580c';
  } else {
    color = '#ca8a04';
  }
  
  console.log('Returning color:', color);
  return color;
};
const getProductPopularityLabel = (productId, topProductIds) => {
  if (!productId || !topProductIds.size) return null;

  const topProductsArray = Array.from(topProductIds);
  const productIndex = topProductsArray.indexOf(productId);

  if (productIndex === -1) return null;

  return `TOP ${productIndex + 1}`;
};

const MemoizedWallLine = memo(WallLine)

function DraggableShelf({ 
  shelf, 
  floorplanId, 
  zoom = 1, 
  grid = 20, 
  sceneW = 1200, 
  sceneH = 800, 
  onOpen, 
  onMove, 
  onRotate, 
  onDelete, 
  onResized,
  productsById,
  topProductIds,
  products 
}) {
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elemX: 0, elemY: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })

  const sw = shelf.width || shelf.shelfType?.width || 200
  const sh = shelf.height || shelf.shelfType?.height || 80
  const [size, setSize] = useState({ w: sw, h: sh })
  const [pos, setPos] = useState({ x: shelf.x, y: shelf.y })

  const shelfRef = useRef(null)
  const parentRef = useRef(null)

  useEffect(() => {
    if (shelfRef.current) {
      parentRef.current = shelfRef.current.parentElement
    }
  }, [])

 
const renderShelfCells = () => {
  
  return null;
}

  const handleMouseDown = (e) => {
    if (e.target.dataset.handle === 'resize') {
      setResizing(true)
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: size.w,
        height: size.h
      })
      e.stopPropagation()
      e.preventDefault()
      return
    }

    if (!e.target.closest('button')) {
      setDragging(true)
      const rect = shelfRef.current.getBoundingClientRect()
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        elemX: rect.left,
        elemY: rect.top
      })
      e.stopPropagation()
      e.preventDefault()
    }
  }

  const handleMouseMove = useCallback((e) => {
    if (!parentRef.current) return

    if (resizing) {
      const deltaX = (e.clientX - resizeStart.x) / zoom
      const deltaY = (e.clientY - resizeStart.y) / zoom

      const minWidth = Math.max(grid, 40)
      const minHeight = Math.max(grid, 30)

      let newWidth = Math.max(minWidth, resizeStart.width + deltaX)
      let newHeight = Math.max(minHeight, resizeStart.height + deltaY)

      newWidth = Math.round(newWidth / grid) * grid
      newHeight = Math.round(newHeight / grid) * grid

      const maxWidth = sceneW - pos.x
      const maxHeight = sceneH - pos.y
      newWidth = Math.min(newWidth, maxWidth)
      newHeight = Math.min(newHeight, maxHeight)

      setSize({ w: newWidth, h: newHeight })

    } else if (dragging) {
      const parentRect = parentRef.current.getBoundingClientRect()

      const deltaX = (e.clientX - dragStart.x) / zoom
      const deltaY = (e.clientY - dragStart.y) / zoom

      let newX = shelf.x + deltaX
      let newY = shelf.y + deltaY

      newX = Math.max(0, Math.min(sceneW - size.w, newX))
      newY = Math.max(0, Math.min(sceneH - size.h, newY))

      newX = Math.round(newX / grid) * grid
      newY = Math.round(newY / grid) * grid

      setPos({ x: newX, y: newY })
    }
  }, [resizing, dragging, resizeStart, dragStart, zoom, grid, sceneW, sceneH, shelf.x, shelf.y, size.w, size.h, pos.x, pos.y])

  const handleMouseUp = useCallback(async () => {
    if (resizing) {
      setResizing(false)
      try {
        await bulkApi.shelfResize(shelf.id, size.w, size.h)
        if (onResized) await onResized()
      } catch (e) {
        console.error('Failed to resize shelf:', e)
        setSize({ w: sw, h: sh })
      }
    } else if (dragging) {
      setDragging(false)
      try {
        await onMove(pos.x, pos.y)
      } catch (e) {
        console.error('Failed to move shelf:', e)
        setPos({ x: shelf.x, y: shelf.y })
      }
    }
  }, [resizing, dragging, shelf.id, size.w, size.h, onResized, sw, sh, onMove, pos.x, pos.y, shelf.x, shelf.y])

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      handleMouseMove(e)
    }

    const handleGlobalMouseUp = () => {
      handleMouseUp()
    }

    if (dragging || resizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [dragging, resizing, handleMouseMove, handleMouseUp])

  return (
    <div
      ref={shelfRef}
      style={{
        ...styles.shelf,
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        transform: `rotate(${shelf.rotation || 0}deg)`,
        cursor: dragging ? 'grabbing' : resizing ? 'nwse-resize' : 'grab',
        userSelect: 'none',
        overflow: 'hidden'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Кнопки управления */}
      <div style={{ 
        position: 'absolute', 
        top: 4, 
        right: 4, 
        display: 'flex', 
        gap: 4, 
        pointerEvents: 'auto',
        zIndex: 10 
      }}>
        <button
          title="Повернуть"
          style={{ ...styles.shelfButton, background: '#4f46e5' }}
          onClick={(e) => {
            e.stopPropagation();
            if (onRotate) onRotate();
          }}
        >
          ⟳
        </button>
        <button
          title="Редактировать ячейки"
          style={{ ...styles.shelfButton, background: '#059669' }}
          onClick={(e) => {
            e.stopPropagation();
            if (onOpen) onOpen();
          }}
        >
          ✎
        </button>
        <button
          title="Удалить полку"
          style={{ ...styles.shelfButton, background: '#dc2626' }}
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Удалить полку?')) {
              if (onDelete) onDelete();
            }
          }}
        >
          ×
        </button>
      </div>

      {/* Handle для изменения размера */}
      <div
        data-handle="resize"
        title="Тянуть для изменения размера"
        style={{
          position: 'absolute',
          right: 2,
          bottom: 2,
          width: 12,
          height: 12,
          background: '#6A4C93',
          borderRadius: 2,
          cursor: 'nwse-resize',
          border: '1px solid white',
          pointerEvents: 'auto',
          zIndex: 10
        }}
      />

      {/* Подсвеченные ячейки с товарами */}
      {renderShelfCells()}

      {/* Информация о полке */}
      <div style={{
        position: 'relative',
        fontSize: Math.max(10, Math.min(14, size.w / 15)),
        color: 'var(--text)',
        textAlign: 'center',
        padding: '4px',
        pointerEvents: 'none',
        zIndex: 5,
        background: 'rgba(255, 255, 255, 0.8)',
        borderRadius: '4px',
        margin: '4px'
      }}>
        {shelf.shelfType?.name || 'Shelf'}
        <div style={{ 
          fontSize: Math.max(8, Math.min(12, size.w / 20)), 
          color: 'var(--text-muted)',
          marginTop: '2px'
        }}>
          {Math.round(size.w)}×{Math.round(size.h)}
        </div>
        {shelf.cells && (
          <div style={{
            fontSize: Math.max(6, Math.min(10, size.w / 25)),
            color: '#6b7280',
            marginTop: '2px'
          }}>
            {shelf.cells.filter(cell => cell.product).length}/{shelf.cells.length} товаров
          </div>
        )}
      </div>
    </div>
  )
}

const MemoizedDraggableShelf = memo(DraggableShelf)
// ----------------- Компонент баннера -----------------
function BannerComponent({ banner, deleteMode, onDelete }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: banner.x,
        top: banner.y,
        width: banner.width || 200,
        height: banner.height || 100,
        background: banner.backgroundColor || '#f3f4f6',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: deleteMode ? 'pointer' : 'default',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}
      onClick={() => {
        if (deleteMode && onDelete) {
          onDelete()
        }
      }}
    >
      {banner.imageUrl ? (
        <img
          src={banner.imageUrl.startsWith('http') ? banner.imageUrl : `http://localhost:8082${banner.imageUrl}`}
          alt={banner.title || 'Banner'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <>
          {banner.title && (
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: banner.textColor || '#1f2937',
              marginBottom: '4px',
              textAlign: 'center'
            }}>
              {banner.title}
            </div>
          )}
          {banner.description && (
            <div style={{
              fontSize: '12px',
              color: banner.textColor || '#6b7280',
              textAlign: 'center'
            }}>
              {banner.description}
            </div>
          )}
        </>
      )}

      {deleteMode && (
        <div style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 20,
          height: 20,
          background: '#dc2626',
          color: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          cursor: 'pointer'
        }}>
          ×
        </div>
      )}
    </div>
  )
}

function ShelfEditorModal({ activeShelf, cells, setCells, products, productsById, topProductIds, onSave, onClose }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--primary)' }}>
          📦 Редактирование: {activeShelf.shelfType?.name}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '1rem', alignItems: 'start' }}>
          {/* Cells Grid */}
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${activeShelf.shelfType?.cols || 6}, 1fr)`,
              gap: '8px',
              marginBottom: '1rem'
            }}>
              {cells.map((c, idx) => (
                <ShelfCell
                  key={c.id || idx}
                  cell={c}
                  index={idx}
                  productsById={productsById}
                  topProductIds={topProductIds}
                  onProductChange={(newProduct) => {
                    setCells(cs => cs.map((cc, i) => i === idx ? { ...cc, product: newProduct } : cc))
                  }}
                  onDrop={(fromIdx, productId) => {
                    if (fromIdx !== undefined) {
                      setCells(cs => cs.map((cc, i) => {
                        if (i === idx) return { ...cc, product: cs[fromIdx]?.product || null }
                        if (i === fromIdx) return { ...cc, product: null }
                        return cc
                      }))
                    } else if (productId) {
                      setCells(cs => cs.map((cc, i) => i === idx ? { ...cc, product: { id: productId } } : cc))
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Products List */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Доступные товары</div>
            <div style={{ maxHeight: 400, overflow: 'auto', display: 'grid', gap: '0.5rem' }}>
              {products.map(p => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('pid', String(p.id)); }}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'var(--card)'
                  }}
                >
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl.startsWith('http') ? p.imageUrl : `http://localhost:8082${p.imageUrl}`}
                      alt=""
                      style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: '4px' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </div>
                    {p.price && (
                      <div style={{ fontSize: '0.75rem', color: '#059669' }}>${p.price}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button style={{ ...styles.button, background: '#6b7280' }} onClick={onClose}>
            Отмена
          </button>
          <button style={styles.button} onClick={onSave}>
            💾 Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}

// Обновленный ShelfCell компонент
function ShelfCell({ cell, index, productsById, topProductIds, allProductsCount, onProductChange, onDrop }) {
  const product = cell.product ? productsById[cell.product.id] : null;
  const popularityColor = product ? getProductPopularityColor(product.id, topProductIds, allProductsCount) : null;
  const popularityLabel = product ? getProductPopularityLabel(product.id, topProductIds) : null;

  // Определяем интенсивность подсветки на основе популярности
  const getPopularityIntensity = (productId, topProductIds) => {
    if (!productId || !topProductIds.size) return 0.3; // Низкая интенсивность для обычных товаров
    
    const topProductsArray = Array.from(topProductIds);
    const productIndex = topProductsArray.indexOf(productId);
    
    if (productIndex === -1) return 0.3;
    
    const popularityRatio = 1 - (productIndex / topProductsArray.length);
    
    if (popularityRatio > 0.7) return 0.9; // Высокая интенсивность для топ-30%
    if (popularityRatio > 0.4) return 0.7; // Средняя интенсивность
    return 0.5; // Умеренная интенсивность
  };

  const popularityIntensity = product ? getPopularityIntensity(product.id, topProductIds) : 0;

  return (
    <div
      draggable={!!cell.product}
      onDragStart={(e) => {
        if (cell.product) {
          e.dataTransfer.setData('from-idx', String(index));
          e.dataTransfer.setData('pid', String(cell.product.id));
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const fromIdx = e.dataTransfer.getData('from-idx');
        const pid = e.dataTransfer.getData('pid');
        onDrop(fromIdx ? parseInt(fromIdx, 10) : undefined, pid ? parseInt(pid, 10) : undefined);
      }}
      style={{
        position: 'relative',
        border: cell.product ? 
          `3px solid ${popularityColor}` : 
          '2px dashed var(--input-border)',
        borderRadius: '12px',
        minHeight: '80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: cell.product ?
          `linear-gradient(135deg, 
           ${popularityColor}${Math.round(popularityIntensity * 30)} 0%, 
           ${popularityColor}${Math.round(popularityIntensity * 15)} 50%,
           ${popularityColor}08 100%)` :
          'var(--card)',
        padding: '8px',
        cursor: cell.product ? 'grab' : 'default',
        transition: 'all 0.3s ease',
        boxShadow: cell.product ? 
          `0 4px 12px ${popularityColor}${Math.round(popularityIntensity * 60)}, 
           0 2px 6px rgba(0,0,0,0.1)` : 
          '0 2px 4px rgba(0,0,0,0.05)',
        transform: cell.product ? 'translateY(-2px)' : 'none',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        if (cell.product) {
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
          e.currentTarget.style.boxShadow = `0 8px 20px ${popularityColor}80, 0 4px 12px rgba(0,0,0,0.15)`;
        }
      }}
      onMouseLeave={(e) => {
        if (cell.product) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 4px 12px ${popularityColor}${Math.round(popularityIntensity * 60)}, 0 2px 6px rgba(0,0,0,0.1)`;
        }
      }}
    >
      {/* Эффект свечения для топ-товаров */}
      {cell.product && popularityIntensity > 0.7 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at center, ${popularityColor}20 0%, transparent 70%)`,
          borderRadius: '12px',
          pointerEvents: 'none',
          animation: 'pulse 2s infinite'
        }} />
      )}

      {product ? (
        <>
          {product.imageUrl && (
            <div style={{
              position: 'relative',
              marginBottom: '6px'
            }}>
              <img
                src={product.imageUrl.startsWith('http') ? product.imageUrl : `http://localhost:8082${product.imageUrl}`}
                alt=""
                style={{
                  width: 36,
                  height: 36,
                  objectFit: 'cover',
                  borderRadius: '8px',
                  border: `2px solid ${popularityColor}80`
                }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
              {/* Бейдж популярности на изображении */}
              {popularityLabel && (
                <div style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  background: popularityColor,
                  color: 'white',
                  fontSize: '0.5rem',
                  padding: '2px 4px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  border: '2px solid white',
                  minWidth: '20px',
                  textAlign: 'center'
                }}>
                  {popularityLabel.replace('TOP ', '')}
                </div>
              )}
            </div>
          )}
          
          <div style={{
            fontSize: '0.7rem',
            textAlign: 'center',
            lineHeight: '1.2',
            marginBottom: '3px',
            fontWeight: '700',
            color: popularityColor,
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
            {product.name}
          </div>
          
          {product.price && (
            <div style={{
              fontSize: '0.75rem',
              color: popularityColor,
              fontWeight: '800',
              background: `${popularityColor}15`,
              padding: '2px 6px',
              borderRadius: '6px',
              border: `1px solid ${popularityColor}30`
            }}>
              ${product.price}
            </div>
          )}

          {/* Индикатор уровня популярности */}
          <div style={{
            display: 'flex',
            gap: '2px',
            marginTop: '4px'
          }}>
            {[1, 2, 3].map((level) => (
              <div
                key={level}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: popularityIntensity >= (level * 0.3) ? popularityColor : `${popularityColor}40`,
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <div style={{ 
          fontSize: '0.7rem', 
          color: '#9ca3af',
          textAlign: 'center',
          lineHeight: '1.3'
        }}>
          🎯<br/>Перетащите товар
        </div>
      )}

      {cell.product && (
        <button
          title="Убрать товар"
          onClick={() => onProductChange(null)}
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            border: 'none',
            background: popularityColor || '#dc2626',
            color: 'white',
            borderRadius: '8px',
            width: '20px',
            height: '20px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.2)';
            e.target.style.background = '#dc2626';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.background = popularityColor || '#dc2626';
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// Добавьте CSS анимацию для свечения (в глобальные стили или в компонент)
const pulseAnimation = `
@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 0.9; }
  100% { opacity: 0.6; }
}
`;

// Добавьте стили в ваш компонент или в глобальные стили
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(pulseAnimation, styleSheet.cssRules.length);

// ----------------- Модальное окно баннера -----------------
function BannerModal({ position, onSave, onClose }) {
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    width: 200,
    height: 100,
    backgroundColor: '#f3f4f6',
    textColor: '#1f2937'
  })
  const [imageFile, setImageFile] = React.useState(null)
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const bannerData = {
        ...formData,
        imageFile
      }
      await onSave(bannerData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
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
    }}>
      <div style={{
        background: 'var(--card)',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
        color: 'var(--text)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>🎨 Новый баннер</h3>
          <button
            style={{ ...styles.button, background: '#6b7280', padding: '0.25rem 0.5rem' }}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#e0f2fe', borderRadius: '6px', fontSize: '0.85rem' }}>
          📍 Позиция: {position.x}, {position.y}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Заголовок</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{ ...styles.input, width: '100%' }}
                placeholder="Например: Скидка 50%"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Описание</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ ...styles.input, width: '100%', minHeight: '60px', resize: 'vertical' }}
                placeholder="Краткое описание..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Ширина (px)</label>
                <input
                  type="number"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })}
                  style={styles.input}
                  min={100}
                  max={500}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Высота (px)</label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                  style={styles.input}
                  min={50}
                  max={300}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Цвет фона</label>
                <input
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                  style={{ ...styles.input, height: '40px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Цвет текста</label>
                <input
                  type="color"
                  value={formData.textColor}
                  onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                  style={{ ...styles.input, height: '40px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Изображение (опционально)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                style={styles.input}
              />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                При выборе изображения текст будет скрыт
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              style={{ ...styles.button, background: '#6b7280' }}
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="submit"
              style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? 'Создание...' : '✨ Создать баннер'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


const styles = {
  card: { 
    background: 'var(--card)', 
    padding: '1.5rem', 
    borderRadius: 16, 
    boxShadow: '0 10px 25px var(--shadow)', 
    border: '1px solid var(--card-border, rgba(0,0,0,0.1))',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease'
  },
  input: { 
    padding: '0.75rem 1rem', 
    borderRadius: 12, 
    border: '2px solid var(--input-border)', 
    background: 'var(--input-bg)', 
    color: 'var(--text)', 
    width:'100%',
    fontSize: '0.9rem',
    transition: 'all 0.2s ease',
    outline: 'none'
  },
  canvasViewport: { 
    position:'relative', 
    border:'2px solid var(--canvas-border)', 
    borderRadius:20, 
    overflow:'auto', 
    background:'var(--canvas-outer-bg)', 
    width:'100%',
    boxShadow: '0 8px 32px var(--shadow)',
    backdropFilter: 'blur(10px)'
  },
  canvasInner: { 
    position:'relative', 
    transformOrigin: '0 0', 
    background: 'var(--canvas-bg, #ffffff)', 
    borderRadius: 16, 
    border:'2px solid var(--canvas-border)', 
    boxShadow:'0 4px 20px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)'
  },
  shelf: { 
    position: 'absolute', 
    width: 200, 
    height: 80, 
    background: 'var(--shelf-bg)', 
    border: '2px solid var(--shelf-border)', 
    borderRadius: 12, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    cursor: 'move', 
    boxSizing:'border-box', 
    boxShadow:'var(--shelf-shadow)',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(5px)'
  },
  button: { 
    padding: '0.75rem 1.5rem', 
    borderRadius: 12, 
    border: 'none', 
    background: 'var(--primary)', 
    color: 'white', 
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(106, 76, 147, 0.3)',
    outline: 'none'
  },
  shelfButton: { 
    padding: '6px 10px', 
    borderRadius: 8, 
    border: 'none', 
    color: 'white', 
    cursor: 'pointer', 
    fontSize: '13px',
    fontWeight: 'bold',
    boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
    transition: 'all 0.2s ease',
    minWidth: '28px',
    minHeight: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(5px)'
  },
  modalOverlay: { 
    position: 'fixed', 
    inset: 0, 
    background: 'rgba(0,0,0,0.6)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 1000,
    backdropFilter: 'blur(8px)'
  },
  modal: { 
    background: 'var(--card)', 
    color: 'var(--text)', 
    padding: '2rem', 
    borderRadius: 20, 
    boxShadow: '0 20px 40px var(--shadow)', 
    width: 720, 
    maxWidth: '95%', 
    maxHeight: '90vh', 
    overflowY: 'auto',
    border: '1px solid var(--card-border, rgba(0,0,0,0.1))',
    backdropFilter: 'blur(20px)'
  },
  draggableItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    cursor: 'grab',
    transition: 'all 0.2s ease'
  },
  productItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'var(--card)',
    transition: 'all 0.2s ease'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  modeHint: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    lineHeight: '1.4'
  }
}

// Остальные компоненты (WallLine, DraggableShelf, ShelfEditorModal, BannerModal, ShelfCell) 
// остаются без изменений как в вашем предыдущем коде

export default PlanogramBuilder