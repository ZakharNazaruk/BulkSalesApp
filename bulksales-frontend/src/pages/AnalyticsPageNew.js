import React, { useState, useEffect, useMemo } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { bulkApi } from '../misc/BulkApi'
import { useAuth } from '../context/AuthContext'
import '../styles/theme.css'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { motion } from 'framer-motion';

function AnalyticsPageNew() {
  const { userIsAuthenticated, getUser } = useAuth()
  const user = getUser()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeRange, setTimeRange] = useState('30') // дни

  const [analyticsData, setAnalyticsData] = useState({
    chartData: [],
    topProductsByRevenue: [],
    aov: 0,
    categorySales: {},
    vipShare: {},
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    vipUsers: 0,
    newUsers: 0
  })

  const [recommendations, setRecommendations] = useState([])
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    const ok = userIsAuthenticated && typeof userIsAuthenticated === 'function' ? userIsAuthenticated() : true
    if (ok && (user?.role === 'MANAGER' || user?.role === 'ADMIN')) {
      loadAnalyticsData()
    }
  }, [timeRange])

 const loadAIRecommendations = async () => {
    setAiLoading(true)
    try {
      const res = await bulkApi.getAIRecommendations()
      if (Array.isArray(res?.data?.data)) {
        setRecommendations(res.data.data)
      } else {
        setRecommendations(['🤖 ИИ пока не дал рекомендаций.'])
      }
    } catch (err) {
      console.error('Ошибка загрузки ИИ-рекомендаций:', err)
      setRecommendations(['❌ Не удалось загрузить ИИ-рекомендации.'])
    } finally {setAiLoading(false)
    }
  }

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        bulkApi.getAllProducts(),
        bulkApi.getTopProducts(20),
        bulkApi.getMonthlySales(parseInt(timeRange, 10)),
        bulkApi.getAov(),
        bulkApi.getCategorySales(parseInt(timeRange, 10)),
        bulkApi.getVipShare(parseInt(timeRange, 10)),
        bulkApi.getTotalOrders(parseInt(timeRange, 10))
      ])

      const [productsRes, topRes, monthlyRes, aovRes, catRes, vipRes, totalOrdersRes] =
        results.map(r => (r.status === 'fulfilled' ? r.value : { data: null }))

      const products = Array.isArray(productsRes?.data?.data) ? productsRes.data.data : Array.isArray(productsRes?.data) ? productsRes.data : []
      const top = Array.isArray(topRes?.data?.data) ? topRes.data.data : Array.isArray(topRes?.data) ? topRes.data : []
      const monthly = monthlyRes?.data?.data || monthlyRes?.data || {}
      const aov = safeNumber(aovRes?.data?.data ?? aovRes?.data)
      const cat = catRes?.data?.data || catRes?.data || {}
      const vip = vipRes?.data?.data || vipRes?.data || {}
      const totalOrders = safeNumber(totalOrdersRes?.data?.data ?? totalOrdersRes?.data)

      const chartData = prepareChartData(monthly, parseInt(timeRange, 10))
      const totalRevenue = chartData.reduce((sum, d) => sum + safeNumber(d.revenue), 0)
      const topProductsByRevenue = prepareTopProducts(top, products)
      const userData = prepareUserData(vip)

      const newAnalyticsData = {
        chartData,
        topProductsByRevenue,
        aov,
        categorySales: cat,
        vipShare: vip,
        totalOrders,
        totalRevenue,
        totalUsers: userData.totalUsers,
        vipUsers: userData.vipUsers,
        newUsers: userData.newUsers
      }

      setAnalyticsData(newAnalyticsData)
      
      // Загружаем ИИ-рекомендации после успешной загрузки аналитики
      await loadAIRecommendations()

      setError('')
    } catch (err) {
      console.error('Analytics load error:', err)
      setError('Не удалось загрузить данные аналитики')
    } finally {
      setLoading(false)
    }
  }

  const safeNumber = (val) => {
    if (val == null) return 0
    const num = Number(val)
    return isNaN(num) ? 0 : num
  }

  // Добавляем к ряду выручки скользящее среднее и экспоненциальное сглаживание
  const addSmoothingSeries = (data) => {
    if (!Array.isArray(data) || data.length === 0) return data

    // Простейшее скользящее среднее по окну в 7 дней
    const windowSize = 7
    let sum = 0
    data.forEach((point, index) => {
      const value = safeNumber(point.revenue)
      sum += value
      if (index >= windowSize) {
        sum -= safeNumber(data[index - windowSize].revenue)
      }

      point.revenueMA = index >= windowSize - 1 ? sum / windowSize : null
    })

    // Экспоненциальное сглаживание с коэффициентом alpha
    const alpha = 0.3
    let prev = null
    data.forEach((point, index) => {
      const value = safeNumber(point.revenue)
      if (index === 0 || prev == null) {
        prev = value
        point.revenueEMA = value
      } else {
        const smoothed = alpha * value + (1 - alpha) * prev
        point.revenueEMA = smoothed
        prev = smoothed
      }
    })

    return data
  }

  const prepareChartData = (monthlyData, days) => {
    if (!monthlyData || Object.keys(monthlyData).length === 0) {
      return generateEmptyChartData(days)
    }

    const base = Object.entries(monthlyData).map(([date, data]) => ({
      date: formatDate(date),
      revenue: safeNumber(data?.revenue || data?.total || data?.amount),
      orders: safeNumber(data?.orders || data?.count || data?.quantity)
    }))

    return addSmoothingSeries(base)
  }

  const prepareUserData = (vipData) => {
    const vip = safeNumber(vipData?.VIP)
    const nonVip = safeNumber(vipData?.NON_VIP)
    return {
      totalUsers: vip + nonVip,
      vipUsers: vip,
      newUsers: 0
    }
  }

  const generateEmptyChartData = (days) => {
    const data = []
    const today = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(today.getDate() - i)
      data.push({ date: formatDate(date), revenue: 0, orders: 0 })
    }
    return addSmoothingSeries(data)
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    } catch (e) {
      return dateString
    }
  }

  const prepareTopProducts = (topData, products) => {
    return topData.map(item => {
      const productId = item.productId || item.product_id || item.id || item.product?.id
      const revenue = Number(item.revenue || item.total || item.amount || item.sum || 0)

      const product = products.find(p => p.id === Number(productId)) || {
        id: productId,
        name: item.product?.name || `Товар #${productId}`,
        price: item.product?.price || '0',
        category: item.product?.category || 'Не указана'
      }

      return { product, revenue }
    })
      .filter(x => x.product && x.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  }

  const metrics = useMemo(() => {
    const totalRevenue = Number(analyticsData.totalRevenue || 0)
    const totalOrders = Number(analyticsData.totalOrders || 0)
    const avgOrderValue = Number(analyticsData.aov || 0)
    const totalUsers = Number(analyticsData.totalUsers || 0)
    const vipUsers = Number(analyticsData.vipUsers || 0)
    const newUsers = Number(analyticsData.newUsers || 0)

    return {
      totalRevenue: isNaN(totalRevenue) ? 0 : totalRevenue,
      totalOrders: isNaN(totalOrders) ? 0 : totalOrders,
      avgOrderValue: isNaN(avgOrderValue) ? 0 : avgOrderValue,
      totalUsers: isNaN(totalUsers) ? 0 : totalUsers,
      vipUsers: isNaN(vipUsers) ? 0 : vipUsers,
      newUsers: isNaN(newUsers) ? 0 : newUsers
    }
  }, [analyticsData])

 
  if (!userIsAuthenticated() || !(user?.role === 'MANAGER' || user?.role === 'ADMIN')) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="card text-center">
            <h2 className="card-title text-error">Доступ запрещен</h2>
            <p className="text-muted">Только менеджеры и администраторы могут просматривать аналитику</p>
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
          {/* --- Заголовок и период --- */}
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>Аналитика продаж</h1>
              <p style={styles.subtitle}>Отчеты о продажах, товарах и пользователях</p>
            </div>
            <div style={styles.timeRangeSelector}>
              <label style={styles.selectorLabel}>Период:</label>
              <select
                className="form-select"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                style={styles.selector}
                disabled={loading}
              >
                <option value="7">Последние 7 дней</option>
                <option value="30">Последние 30 дней</option>
                <option value="90">Последние 90 дней</option>
                <option value="365">Последний год</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
              <button onClick={() => setError('')} style={styles.closeButton}>×</button>
            </div>
          )}

          {loading ? (
            <div style={styles.loadingCard}>
              <div className="loading-spinner"></div>
              <span>Загрузка аналитики...</span>
            </div>
          ) : (
            <>
              {/* --- Метрики --- */}
              <div style={styles.metricsGrid}>
                {/* Общая выручка */}
                <div style={styles.metricCard}>
                  <div style={{ ...styles.metricIcon, backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>₽</div>
                  <div>
                    <div style={styles.metricValue}>{metrics.totalRevenue.toLocaleString('ru-RU')} ₽</div>
                    <div style={styles.metricLabel}>Общая выручка</div>
                    <div style={styles.metricPeriod}>за {timeRange} дней</div>
                  </div>
                </div>
                {/* Заказы */}
                <div style={styles.metricCard}>
                  <div style={{ ...styles.metricIcon, backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>📦</div>
                  <div>
                    <div style={styles.metricValue}>{metrics.totalOrders}</div>
                    <div style={styles.metricLabel}>Заказов</div>
                    <div style={styles.metricPeriod}>за {timeRange} дней</div>
                  </div>
                </div>
                {/* Средний чек */}
                <div style={styles.metricCard}>
                  <div style={{ ...styles.metricIcon, backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>📊</div>
                  <div>
                    <div style={styles.metricValue}>{metrics.avgOrderValue.toLocaleString('ru-RU')} ₽</div>
                    <div style={styles.metricLabel}>Средний чек</div>
                    <div style={styles.metricPeriod}>за {timeRange} дней</div>
                  </div>
                </div>
                {/* Пользователи */}
                <div style={styles.metricCard}>
                  <div style={{ ...styles.metricIcon, backgroundColor: 'var(--secondary-light)', color: 'var(--secondary)' }}>👥</div>
                  <div>
                    <div style={styles.metricValue}>{metrics.totalUsers}</div>
                    <div style={styles.metricLabel}>Всего пользователей</div>
                    <div style={styles.metricPeriod}>{metrics.vipUsers} VIP</div>
                  </div>
                </div>
              </div>

              {/* --- Графики --- */}
              <div style={styles.chartsGrid}>
                <ChartCard
                  title="Динамика выручки"
                  data={analyticsData.chartData}
                  dataKey="revenue"
                  color="var(--primary)"
                  timeRange={timeRange}
                  formatValue={(v) => `${v.toLocaleString('ru-RU')} ₽`}
                  maKey="revenueMA"
                  maColor="var(--secondary)"
                  emaKey="revenueEMA"
                  emaColor="var(--warning)"
                />
                <ChartCard
                  title="Количество заказов"
                  data={analyticsData.chartData}
                  dataKey="orders"
                  color="var(--success)"
                  timeRange={timeRange}
                  formatValue={(v) => v}
                />
              </div>

              {/* Топ товаров */}

              <div style={styles.tableCard}>
                <div style={styles.tableHeader}>
                  <h3 style={styles.tableTitle}>Топ товаров по выручке</h3>
                  <div style={styles.tablePeriod}>за {timeRange} дней</div>
                </div>

                <div style={styles.topProductsList}>
                  {analyticsData.topProductsByRevenue.length === 0 ? (
                    <div style={styles.emptyState}>
                      <div style={styles.emptyIcon}>📊</div>
                      <p>Нет данных о продажах за выбранный период</p>
                    </div>
                  ) : (
                    analyticsData.topProductsByRevenue.map((item, index) => (
                      <div key={item.product.id} style={styles.productRow}>
                        <div style={styles.productRank}>#{index + 1}</div>
                        <div style={styles.productInfo}>
                          <div style={styles.productName}>{item.product.name}</div>
                          <div style={styles.productCategory}>{item.product.category}</div>
                        </div>
                        <div style={styles.productMetrics}>
                          <div style={styles.productRevenue}>
                            {!isNaN(item.revenue) ? item.revenue.toLocaleString('ru-RU') : '0'} ₽
                          </div>
                          <div style={styles.productPrice}>
                            {item.product.price ? `${item.product.price} ₽` : 'Цена не указана'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Дополнительная аналитика */}
              <div style={styles.insightsGrid}>
                <div style={styles.insightCard}>
                  <h4 style={styles.insightTitle}>Общая статистика</h4>
                  <div style={styles.insightMetrics}>
                    <div style={styles.insightMetric}>
                      <span style={styles.insightLabel}>Выручка за период:</span>
                      <span style={styles.insightValue}>
                        {!isNaN(metrics.totalRevenue) ? metrics.totalRevenue.toLocaleString('ru-RU') : '0'} ₽
                      </span>
                    </div>
                    <div style={styles.insightMetric}>
                      <span style={styles.insightLabel}>Всего заказов:</span>
                      <span style={styles.insightValue}>
                        {!isNaN(metrics.totalOrders) ? metrics.totalOrders : '0'}
                      </span>
                    </div>
                    <div style={styles.insightMetric}>
                      <span style={styles.insightLabel}>Средний чек:</span>
                      <span style={styles.insightValue}>
                        {!isNaN(metrics.avgOrderValue) ? metrics.avgOrderValue.toLocaleString('ru-RU') : '0'} ₽
                      </span>
                    </div>
                    <div style={styles.insightMetric}>
                      <span style={styles.insightLabel}>VIP пользователей:</span>
                      <span style={styles.insightValue}>
                        {!isNaN(metrics.vipUsers) ? metrics.vipUsers : '0'} из {!isNaN(metrics.totalUsers) ? metrics.totalUsers : '0'}
                      </span>
                    </div>
                    <div style={styles.insightMetric}>
                      <span style={styles.insightLabel}>Конверсия в VIP:</span>
                      <span style={styles.insightValue}>
                        {metrics.totalUsers > 0
                          ? ((metrics.vipUsers / metrics.totalUsers) * 100).toFixed(1)
                          : 0
                        }%
                      </span>
                    </div>
                  </div>
                </div>

              </div>
              {/* ИИ-рекомендации */}
              <div style={styles.aiSection}>
                <div style={styles.aiHeader}>
                  <h2 style={styles.aiTitle}>🤖 Рекомендации от ИИ</h2>
                  {aiLoading && <div className="loading-spinner small"></div>}
                </div>
                {recommendations.map((text, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    style={styles.recommendation}
                  >
                    {text}
                  </motion.div>
                ))}
              </div>

            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

// -------------------------------
// Вспомогательные компоненты и стили
const ChartCard = ({
  title,
  data,
  dataKey,
  color,
  timeRange,
  formatValue,
  maKey,
  maColor,
  emaKey,
  emaColor,
}) => (
  <div style={styles.chartCard}>
    <h3 style={styles.chartTitle}>{title}</h3>
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(value) => (value == null ? '' : formatValue(value))} />
        <Tooltip formatter={(value) => (value == null ? '' : formatValue(value))} />
        <Legend />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          name="Фактическое значение"
        />
        {maKey && (
          <Line
            type="monotone"
            dataKey={maKey}
            stroke={maColor || '#8884d8'}
            strokeWidth={2}
            dot={false}
            name="Скользящее среднее"
          />
        )}
        {emaKey && (
          <Line
            type="monotone"
            dataKey={emaKey}
            stroke={emaColor || '#82ca9d'}
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
            name="Эксп. сглаживание"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  </div>
)

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
  },

  main: {
    flex: 1,
    padding: 'var(--space-2xl) var(--space-xl)',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 'var(--space-lg)',
    marginBottom: 'var(--space-2xl)',
  },

  title: {
    margin: 0,
    fontSize: 'var(--font-size-3xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--text)',
    letterSpacing: '-0.5px',
  },

  subtitle: {
    margin: 0,
    fontSize: 'var(--font-size-lg)',
    color: 'var(--text-muted)',
    fontWeight: 400,
  },

  timeRangeSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
  },

  selectorLabel: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-secondary)',
  },

  selector: {
    minWidth: '180px',
  },

  loadingCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-md)',
    padding: 'var(--space-3xl)',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow)',
    color: 'var(--text-muted)',
  },

  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 'var(--space-lg)',
    marginBottom: 'var(--space-2xl)',
  },

  metricCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-xl)',
    boxShadow: 'var(--shadow)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  metricCardHover: {
    transform: 'translateY(-4px)',
    boxShadow: 'var(--shadow-lg)',
  },

  metricIcon: {
    width: '56px',
    height: '56px',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
  },

  metricValue: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--text)',
    marginBottom: 'var(--space-xs)',
  },

  metricLabel: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-secondary)',
    marginBottom: '2px',
  },

  metricPeriod: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-muted)',
  },

  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: 'var(--space-lg)',
    marginBottom: 'var(--space-2xl)',
  },

  chartCard: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s ease',
  },

  chartCardHover: {
    boxShadow: 'var(--shadow-lg)',
  },

  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-lg) var(--space-xl)',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
  },

  chartTitle: {
    margin: 0,
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text)',
  },

  chartPeriod: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-muted)',
  },

  chartContainer: {
    minHeight: '260px',
    position: 'relative',
    padding: 'var(--space-md)',
  },

  tableCard: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow)',
    marginBottom: 'var(--space-2xl)',
    overflow: 'hidden'
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-xl)',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-secondary)'
  },
  tableTitle: {
    margin: 0,
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text)'
  },
  tablePeriod: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-muted)'
  },
  topProductsList: {
    padding: 'var(--space-lg)'
  },
  emptyState: {
    textAlign: 'center',
    padding: 'var(--space-3xl)',
    color: 'var(--text-muted)'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: 'var(--space-md)'
  },
  productRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-lg)',
    padding: 'var(--space-lg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    marginBottom: 'var(--space-md)',
    background: 'var(--surface)',
    transition: 'all var(--transition-base)'
  },
  productRank: {
    width: '40px',
    height: '40px',
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-bold)',
    flexShrink: 0
  },
  productInfo: {
    flex: 1
  },
  productName: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text)',
    marginBottom: '2px'
  },
  productCategory: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-muted)'
  },
  productMetrics: {
    textAlign: 'right'
  },
  productRevenue: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--success)',
    marginBottom: '2px'
  },
  productPrice: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-muted)'
  },
  insightsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 'var(--space-lg)'
  },
  insightCard: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-xl)',
    boxShadow: 'var(--shadow)'
  },
  insightTitle: {
    margin: '0 0 var(--space-lg) 0',
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text)'
  },
  insightMetrics: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)'
  },
  insightMetric: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-sm) 0',
    borderBottom: '1px solid var(--border)'
  },
  insightLabel: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)'
  },
  insightValue: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text)'
  },
  recommendations: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)'
  },
  recommendation: {
    padding: 'var(--space-md)',
    background: 'var(--primary-light)',
    borderRadius: 'var(--radius)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--primary-dark)',
    lineHeight: 'var(--line-height-relaxed)'
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
    color: 'currentColor',
    padding: '0 var(--space-sm)'
  }
};

export default AnalyticsPageNew
