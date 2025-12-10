import React, { useState } from 'react'
import { Navigate, NavLink } from 'react-router-dom'
import { bulkApi } from '../misc/BulkApi'

function RegisterPage() {
  const [form, setForm] = useState({ username: '', name: '', email: '', password: '' })
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')

  // список старых аккаунтов
  const oldAccounts = [
    { username: 'qwe', password: '1' }
  ]

  const validateForm = () => {
    const { username, name, email, password } = form
    // проверка старых аккаунтов
    const isOldAccount = oldAccounts.some(acc => acc.username === username && acc.password === password)

    if (!username || !name || !email || !password) {
      setErr('Пожалуйста, заполните все поля')
      return false
    }

    if (!isOldAccount) {
      if (username.length < 3) {
        setErr('Имя пользователя должно содержать не менее 3 символов')
        return false
      }
      if (password.length < 6) {
        setErr('Пароль должен содержать не менее 6 символов')
        return false
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setErr('Введите корректный email')
        return false
      }
    }

    setErr('')
    return true
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      await bulkApi.signup(form)
      setOk(true)
    } catch (e) {
      setErr('Ошибка регистрации. Проверьте данные и попробуйте снова')
    }
  }

  if (ok) return <Navigate to="/login" />

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Регистрация</h2>
        <form style={styles.form} onSubmit={onSubmit}>
          <input
            style={styles.input}
            placeholder="Имя"
            value={form.name}
            onChange={(e)=>setForm({ ...form, name: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="Имя пользователя"
            value={form.username}
            onChange={(e)=>setForm({ ...form, username: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="Email"
            value={form.email}
            onChange={(e)=>setForm({ ...form, email: e.target.value })}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Пароль"
            value={form.password}
            onChange={(e)=>setForm({ ...form, password: e.target.value })}
          />
          <button style={styles.button} type="submit">Создать аккаунт</button>
        </form>
        {err && <p style={styles.error}>{err}</p>}
        <p style={styles.footerText}>
          Уже есть аккаунт? <NavLink to="/login" style={styles.link}>Войти</NavLink>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg)', fontFamily: "'Poppins', sans-serif" },
  card: { width: '420px', padding: '2rem', borderRadius: '16px', background: 'var(--card)', boxShadow: '0 12px 40px var(--shadow)', color: 'var(--text)' },
  title: { marginBottom: '1rem', fontWeight: '600', fontSize: '1.5rem', textAlign: 'center' },
  form: { display: 'grid', gap: '0.8rem' },
  input: { padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid #ddd', background: 'var(--card)', color: 'var(--text)' },
  button: { padding: '0.9rem', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: '600' },
  error: { color: '#FF6B6B', marginTop: '0.5rem' },
  footerText: { marginTop: '1rem', color: 'var(--muted)', textAlign: 'center' },
  link: { color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }
}

export default RegisterPage
