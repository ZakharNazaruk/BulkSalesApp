import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const I18nContext = createContext()

const messages = {
  ru: {
    home: 'Главная',
    users: 'Пользователи',
    products: 'Товары',
    categories: 'Категории',
    planograms: 'Планограммы',
    discounts: 'Скидки',
    analytics: 'Аналитика',
    dashboard: 'Личный кабинет',
    cart: 'Корзина',
    orders: 'Заказы',
    login: 'Войти',
    signup: 'Регистрация',
    hello: 'Привет',
    logout: 'Выйти',
    lang: 'Язык',
    theme: 'Тема',
    light: 'Светлая',
    dark: 'Тёмная',
    adminDash: 'Панель администратора',
    notifications: 'Уведомления',
  },
  en: {
    home: 'Home',
    users: 'Users',
    products: 'Products',
    categories: 'Categories',
    planograms: 'Planograms',
    discounts: 'Discounts',
    analytics: 'Analytics',
    dashboard: 'Dashboard',
    cart: 'Cart',
    orders: 'Orders',
    login: 'Login',
    signup: 'Sign Up',
    hello: 'Hi',
    logout: 'Logout',
    lang: 'Lang',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    adminDash: 'Admin dashboard',
    notifications: 'Notifications',
  }
}

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState('ru')

  useEffect(() => {
    const saved = localStorage.getItem('locale')
    if (saved) setLocale(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem('locale', locale)
  }, [locale])

  const t = useMemo(() => messages[locale] || messages.ru, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() { return useContext(I18nContext) }







