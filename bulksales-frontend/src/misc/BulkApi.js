import axios from 'axios'
import { config } from '../Constants'

export const bulkApi = {
  authenticate,
  signup,
  numberOfUsers,
  getUsers,
  updateUser,
  deleteUser,
  updateUserRole,
  setVip,
  getActiveProducts,
  getAllProducts,
  getProductById,
  getActiveByCategory,
  createProduct,
  createProductWithImage,
  updateProduct,
  deleteProduct,
  toggleProductActive,
  toggleProductPriority,
  getCart,
  addToCart,
  removeFromCart,
  // categories
  getCategories,
  getCategoryById,
  createCategory,
  createCategoryWithImage,
  updateCategory,
  deleteCategory,
  // planograms (simple)
  getPlanograms,
  getPlanogramById,
  createPlanogram,
  updatePlanogram,
  deletePlanogram,
  planogramAddProduct,
  planogramRemoveProduct,
  planogramToggleVisible,
  // floorplans & shelves (advanced editor)
  floorplansGet,
  floorplansCreate,
  floorplanAddShelf,
  floorplanAddWall,
  tryDeleteWall,
  tryDeleteShelf,
  shelfTypesGet,
  shelfTypeCreate,
  shelfGetCells,
  shelfSaveCells,
  shelfReposition,
  shelfResize,
  analyzePlanogram,
  floorplansGetById,
  // discounts
  getDiscounts,
  getAllDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  updateVipConfig,
  getVipConfig,
  // orders
  checkout,
  getOrdersByUser,
  getAllOrders,
  getMyOrders,
  // analytics - ИСПРАВЛЕННЫЕ МЕТОДЫ
  getTopProducts,
  getMonthlySales,
  getAov,
  getCategorySales,
  getVipShare,
  getTotalOrders,
  getTotalRevenue, // ДОБАВЛЕН НОВЫЙ МЕТОД
  // ABC/XYZ analytics
  getAbc,
  getXyz,
  getAbcXyz,
  downloadAbcCsv,
  downloadXyzCsv,
  downloadMatrixCsv,
  downloadAbcXyzExcel,
  // payment & vip
  getMyPaymentInfo,
  updateMyPaymentInfo,
  getVipSettings,
  updateVipSettings,
  // recommendations
  crossSell,
  // users
  getAllUsers,
  updateOrderStatus,
  getMe,
  getAIRecommendations,
  getAllProductGroups,
getActiveProductGroups,
getProductGroupById,
createProductGroup,
updateProductGroup,
deleteProductGroup,
addProductToGroup,
removeProductFromGroup,
  toggleProductGroupActive,
  // notifications
  getNotifications,
  getNotificationsCount,
  markNotificationRead,
  broadcastNotification,
  // banners
  getBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerActive,
  createBannerWithImage,
  updateBannerWithImage,
}

const instance = axios.create({
  baseURL: config.url.API_BASE_URL,
  headers: {
    'Content-type': 'application/json',
  },
})

// attach basic auth header if available
instance.interceptors.request.use((configReq) => {
  const stored = localStorage.getItem('user')
  if (stored) {
    const user = JSON.parse(stored)
    if (user.authdata) {
      configReq.headers.Authorization = `Basic ${user.authdata}`
    }
  }
  return configReq
})

// global error handling
instance.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error && error.response ? error.response.status : null
    const url = error && error.config ? error.config.url : ''
    // 401 — неавторизован: сбрасываем сессию и уводим на главную (кроме /auth/*)
    if (status === 401) {
      if (url && (url.includes('/auth/authenticate') || url.includes('/auth/signup'))) {
        return Promise.reject(error)
      }
      try { localStorage.removeItem('user') } catch (_) {}
      if (typeof window !== 'undefined') {
        const current = window.location.pathname
        if (current !== '/') window.location.href = '/'
      }
      return Promise.reject(error)
    }
    // 403 — нет прав: НЕ разлогиниваем, пусть страница обработает ошибку доступа
    if (status === 403) {
      return Promise.reject(error)
    }
    return Promise.reject(error)
  }
)

// -- Auth API
function authenticate(username, password) {
  return instance.post('/auth/authenticate', { username, password })
}

function signup(user) {
  return instance.post('/auth/signup', user)
}

// -- Public API
function numberOfUsers() {
  return instance.get('/public/numberOfUsers')
}

// -- Admin/User Management API
function getUsers() {
  return instance.get('/api/users')
}

function updateUser(id, userData) {
  return instance.put(`/api/users/${id}`, userData)
}

function deleteUser(username) {
  return instance.delete(`/api/users/${username}`)
}

function updateUserRole(username, role) {
  return instance.put(`/api/users/${username}/role?role=${encodeURIComponent(role)}`)
}

function setVip(username, vip) {
  return instance.post(`/api/users/${username}/vip?vip=${vip}`)
}

// -- Products API
function getActiveProducts() {
  return instance.get('/api/products/active')
}

function getAllProducts() {
  return instance.get('/api/products')
}

function getProductById(id) {
  return instance.get(`/api/products/${id}`)
}

function getActiveByCategory(category) {
  return instance.get(`/api/products/category/${encodeURIComponent(category)}`)
}

function createProduct(product) {
  return instance.post('/api/products', product)
}

function getMyOrders() {
  return instance.get('/api/orders/me')
}

function createProductWithImage(product, file) {
  const form = new FormData()
  const blob = new Blob([JSON.stringify(product)], { type: 'application/json' })
  form.append('product', blob)
  if (file) form.append('image', file)
  return instance.post('/api/products/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

function updateProduct(id, product) {
  return instance.put(`/api/products/${id}`, product)
}

function deleteProduct(id) {
  return instance.delete(`/api/products/${id}`)
}

function toggleProductActive(id) {
  return instance.post(`/api/products/${id}/toggle-active`)
}

function toggleProductPriority(id) {
  return instance.post(`/api/products/${id}/toggle-priority`)
}

// -- Cart API
function getCart(userId) {
  return instance.get(`/api/cart/${userId}`)
}

function addToCart(userId, productId, quantity) {
  return instance.post(`/api/cart/${userId}/add/${productId}?quantity=${quantity}`)
}

function removeFromCart(userId, productId) {
  return instance.post(`/api/cart/${userId}/remove/${productId}`)
}

// -- Categories API
function getCategories() { return instance.get('/api/categories') }
function getCategoryById(id) { return instance.get(`/api/categories/${id}`) }
function createCategory(category) { return instance.post('/api/categories', category) }
function createCategoryWithImage(category, file) {
  const form = new FormData()
  const blob = new Blob([JSON.stringify(category)], { type: 'application/json' })
  form.append('category', blob)
  if (file) form.append('image', file)
  return instance.post('/api/categories/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}
function updateCategory(id, category) { return instance.put(`/api/categories/${id}`, category) }
function deleteCategory(id) { return instance.delete(`/api/categories/${id}`) }

// -- Planograms API (simple planogram list)
function getPlanograms() { return instance.get('/api/planograms') }
function getPlanogramById(id) { return instance.get(`/api/planograms/${id}`) }
function createPlanogram(planogram) { return instance.post('/api/planograms', planogram) }
function updatePlanogram(id, planogram) { return instance.put(`/api/planograms/${id}`, planogram) }
function deletePlanogram(id) { return instance.delete(`/api/planograms/${id}`) }
function planogramAddProduct(planogramId, productId) { return instance.post(`/api/planograms/${planogramId}/addProduct/${productId}`) }
function planogramRemoveProduct(planogramId, productId) { return instance.post(`/api/planograms/${planogramId}/removeProduct/${productId}`) }
function planogramToggleVisible(planogramId) { return instance.post(`/api/planograms/${planogramId}/toggle-visible`) }

// -- Floorplans & shelves API (advanced editor used by PlanogramBuilderNew/PlanogramBuilder)
function floorplansGetById(id) { 
  return instance.get(`/api/floorplans/${id}`) 
}
function floorplansGet(){
   return instance.get('/api/floorplans') 
}

function floorplansCreate(payload) { 
  return instance.post('/api/floorplans', payload) 
}

function floorplanAddShelf(floorplanId, shelfTypeId, x, y) { 
  // Исправлено: отправляем объект Shelf с shelfType внутри
  return instance.post(`/api/floorplans/${floorplanId}/shelves`, {
    shelfType: { id: shelfTypeId },
    x: x,
    y: y
  })
}

function floorplanAddWall(floorplanId, wall) { 
  return instance.post(`/api/floorplans/${floorplanId}/walls`, wall) 
}

function tryDeleteWall(wallId, floorplanId) { 
  // Используем альтернативный route для совместимости
  return instance.delete(`/api/floorplans/${floorplanId}/walls/${wallId}`) 
}

function tryDeleteShelf(shelfId, floorplanId) { 
  // Используем альтернативный route для совместимости
  return instance.delete(`/api/floorplans/${floorplanId}/shelves/${shelfId}`) 
}

function shelfTypesGet() { 
  return instance.get('/api/floorplans/shelf-types') 
}

function shelfTypeCreate(payload) { 
  return instance.post('/api/floorplans/shelf-types', payload) 
}

function shelfGetCells(shelfId) { 
  return instance.get(`/api/floorplans/shelves/${shelfId}/cells`) 
}

function shelfSaveCells(shelfId, cells) { 
  // Исправлено: используем POST как в бэкенде
  return instance.post(`/api/floorplans/shelves/${shelfId}/cells`, cells) 
}

function shelfReposition(shelfId, x, y, rotation) { 
  // Исправлено: используем POST с параметрами как в бэкенде
  return instance.post(`/api/floorplans/shelves/${shelfId}/reposition`, null, { 
    params: { x, y, rotation } 
  })
}

function shelfResize(shelfId, width, height) { 
  // Исправлено: используем POST с параметрами как в бэкенде
  return instance.post(`/api/floorplans/shelves/${shelfId}/resize`, null, { 
    params: { width, height } 
  })
}
function analyzePlanogram(floorplanId) { 
  return instance.get(`/api/planogram-analysis/analyze/${floorplanId}`)
}


// -- Discounts API
function getDiscounts() { return instance.get('/api/discounts') }
function getAllDiscounts() { return getDiscounts() }
function createDiscount(discount) { return instance.post('/api/discounts', discount) }
function updateDiscount(id, discount) { return instance.put(`/api/discounts/${id}`, discount) }
function deleteDiscount(id) { return instance.delete(`/api/discounts/${id}`) }
function getVipConfig() { 
  return instance.get('/api/vip/config') 
}

function updateVipConfig(payload) { 
  return instance.put('/api/vip/config', payload) 
}

// -- Orders API
function checkout(userId) { return instance.post(`/api/orders/checkout/${userId}`) }
function getOrdersByUser(userId) { return instance.get(`/api/orders/user/${userId}`) }
function getAllOrders() { return instance.get('/api/orders/all') }
function updateOrderStatus(id, value) {
   return instance.post(`/api/orders/${id}/status`, null, { params: { value } })
}

// -- Payment & VIP
function getMyPaymentInfo() { return instance.get('/api/me/payment') }
function updateMyPaymentInfo(payload) { return instance.put('/api/me/payment', payload) }
function getVipSettings() { return instance.get('/api/vip/config') }
function updateVipSettings(payload) { return instance.put('/api/vip/config', payload) }

function getTopProducts(limit = 10) {
  return instance.get(`/api/analytics/top-products?limit=${limit}`)
    .then(response => {
      console.log('📊 Top products raw response:', response);
      return response;
    })
    .catch(error => {
      console.error('❌ Top products API error:', error);
      throw error;
    });
}

function getMonthlySales(daysBack = 30) { 
  return instance.get(`/api/analytics/monthly-sales?daysBack=${daysBack}`) 
}

function getAov() { 
  return instance.get('/api/analytics/average-order-value') 
}

function getCategorySales(daysBack = 30) { 
  return instance.get(`/api/analytics/category-sales?daysBack=${daysBack}`) 
}

function getVipShare(daysBack = 30) { 
  return instance.get(`/api/analytics/vip-share?daysBack=${daysBack}`) 
}

function getTotalOrders(daysBack = 30) {
  return instance.get(`/api/analytics/total-orders?daysBack=${daysBack}`)
}

// ДОБАВЛЕН НОВЫЙ МЕТОД для общей выручки
function getTotalRevenue(daysBack = 30) {
  return instance.get(`/api/analytics/total-revenue?daysBack=${daysBack}`)
}

// ABC/XYZ
function getAbc(params = {}) {
  const { daysBack = 90, a = 80, b = 15 } = params
  return instance.get(`/api/analytics/abc`, { params: { daysBack, a, b } })
}
function getXyz(params = {}) {
  const { daysBack = 90, x = 0.1, y = 0.25, bucket = 'WEEK', zeroMode = 'INCLUDE' } = params
  return instance.get(`/api/analytics/xyz`, { params: { daysBack, x, y, bucket, zeroMode } })
}
function getAbcXyz(params = {}) {
  const { daysBack = 90, a = 80, b = 15, x = 0.1, y = 0.25, bucket = 'WEEK', zeroMode = 'INCLUDE' } = params
  return instance.get(`/api/analytics/abc-xyz`, { params: { daysBack, a, b, x, y, bucket, zeroMode } })
}

// Downloads
function downloadAbcCsv(params = {}) {
  const { daysBack = 90, a = 80, b = 15 } = params
  return instance.get(`/api/analytics/abc/export/csv`, { params: { daysBack, a, b }, responseType: 'blob' })
}
function downloadXyzCsv(params = {}) {
  const { daysBack = 90, x = 0.1, y = 0.25 } = params
  return instance.get(`/api/analytics/xyz/export/csv`, { params: { daysBack, x, y }, responseType: 'blob' })
}
function downloadMatrixCsv(params = {}) {
  const { daysBack = 90, a = 80, b = 15, x = 0.1, y = 0.25, bucket = 'WEEK', zeroMode = 'INCLUDE' } = params
  return instance.get(`/api/analytics/abc-xyz/export/csv`, { params: { daysBack, a, b, x, y, bucket, zeroMode }, responseType: 'blob' })
}
function downloadAbcXyzExcel(params = {}) {
  const { daysBack = 90, a = 80, b = 15, x = 0.1, y = 0.25, bucket = 'WEEK', zeroMode = 'INCLUDE' } = params
  return instance.get(`/api/analytics/abc-xyz/export/excel`, { params: { daysBack, a, b, x, y, bucket, zeroMode }, responseType: 'blob' })
}

// -- Recommendations
function crossSell(productIds) {
  const ids = (productIds || []).join(',')
  return instance.get(`/api/recommendations/cross-sell?cartProductIds=${encodeURIComponent(ids)}`)
}

function getAllUsers(){
  return instance.get('/api/users/onlyusers')
}

// -- Users
function getMe() { 
  return instance.get('/api/users/me') 
}
function  getAIRecommendations() {
  return instance.get('/api/analytics/ai-recommendations')
}

// В bulkApi.js добавьте:
function getAllProductGroups() { return instance.get('/api/product-groups') }
function getActiveProductGroups() { return instance.get('/api/product-groups/active') }
function getProductGroupById(id) { return instance.get(`/api/product-groups/${id}`) }
function createProductGroup(group) { return instance.post('/api/product-groups', group) }
function updateProductGroup(id, group) { return instance.put(`/api/product-groups/${id}`, group) }
function deleteProductGroup(id) { return instance.delete(`/api/product-groups/${id}`) }
function addProductToGroup(groupId, productId) { return instance.post(`/api/product-groups/${groupId}/products/${productId}`) }
function removeProductFromGroup(groupId, productId) { return instance.delete(`/api/product-groups/${groupId}/products/${productId}`) }
function toggleProductGroupActive(id) { return instance.post(`/api/product-groups/${id}/toggle-active`) }


// -- Notifications API
function getNotifications() {
  return instance.get('/api/notifications')
}

function getNotificationsCount() {
  return instance.get('/api/notifications/count')
}

function markNotificationRead(id) {
  return instance.post(`/api/notifications/${id}/read`)
}

function broadcastNotification(title, message, target = 'ALL_USERS') {
  return instance.post('/api/notifications/broadcast', { title, message, target })
}

// -- Banners API
function getBanners() { return instance.get('/api/banners') }
function getAllBanners() { return instance.get('/api/banners/all') }
function createBanner(banner) { return instance.post('/api/banners', banner) }
function updateBanner(id, banner) { return instance.put(`/api/banners/${id}`, banner) }
function deleteBanner(id) { return instance.delete(`/api/banners/${id}`) }
function toggleBannerActive(id) { return instance.post(`/api/banners/${id}/toggle-active`) }
function createBannerWithImage(banner, file) {
  const form = new FormData()
  const blob = new Blob([JSON.stringify(banner)], { type: 'application/json' })
  form.append('banner', blob)
  if (file) form.append('image', file)
  return instance.post('/api/banners/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}
function updateBannerWithImage(id, banner, file) {
  const form = new FormData()
  const blob = new Blob([JSON.stringify(banner)], { type: 'application/json' })
  form.append('banner', blob)
  if (file) form.append('image', file)
  return instance.put(`/api/banners/${id}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
}

// -- Helper functions
export function basicAuth(user) {
  return `Basic ${user.authdata}`
}
