import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider } from './context/AuthContext'
import { I18nProvider } from './context/I18nContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'

const RegisterPage = lazy(()=>import('./pages/RegisterPage'))
const HomePage = lazy(()=>import('./pages/HomePage'))
const LoginPage = lazy(()=>import('./pages/LoginPage'))
const UserPage = lazy(()=>import('./pages/UserPage'))
const AdminPage = lazy(()=>import('./pages/AdminPage'))
const ProductsAdmin = lazy(()=>import('./pages/ProductsAdmin'))
const PlanogramBuilder = lazy(()=>import('./pages/PlanogramBuilder'))
const DiscountsAdmin = lazy(()=>import('./pages/DiscountsAdminNew'))
const AnalyticsPage = lazy(()=>import('./pages/AnalyticsPageNew'))
const AnalyticsAbcXyz = lazy(()=>import('./pages/AnalyticsAbcXyz'))
const CartPage = lazy(()=>import('./pages/CartPage'))
const OrdersPage = lazy(()=>import('./pages/OrdersPage'))
const OrdersAdmin = lazy(()=>import('./pages/OrdersAdmin'))
const CategoriesAdmin = lazy(()=>import('./pages/CategoriesAdmin'))
const ProductDetails = lazy(()=>import('./pages/ProductDetails'))
const CategoriesPage = lazy(()=>import('./pages/CategoriesPage'))
const NotificationsPage = lazy(()=>import('./pages/NotificationsPage'))
const ProductGroupsManager = lazy(() => import('./pages/ProductGroupsManager'))
const BannersAdmin = lazy(() => import('./pages/BannersAdmin'))

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <ToastProvider>
            <Router>
            <Suspense fallback={<div style={{padding:'2rem'}}>Загрузка...</div>}>
            <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<RegisterPage />} />
          <Route path="/userpage" element={<UserPage />} />
          <Route path="/adminpage" element={<AdminPage />} />
          <Route path="/admin/products" element={<ProductsAdmin />} />
          <Route path="/admin/planograms" element={<PlanogramBuilder />} />
          <Route path="/admin/categories" element={<CategoriesAdmin />} />
          <Route path="/admin/discounts" element={<DiscountsAdmin />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
          <Route path="/admin/analytics-abcxyz" element={<AnalyticsAbcXyz />} />
          <Route path="/admin/orders" element={<OrdersAdmin />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/admin/product-groups" element={<ProductGroupsManager />} />
          <Route path="/admin/banners" element={<BannersAdmin />} />
          <Route path="*" element={<Navigate to="/" />} />
         
            </Routes>
            </Suspense>
          </Router>
          </ToastProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App
