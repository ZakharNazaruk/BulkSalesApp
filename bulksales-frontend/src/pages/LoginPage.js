import React, { useState, useEffect } from 'react'
import { NavLink, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { bulkApi } from '../misc/BulkApi'

function LoginPage() {
  const Auth = useAuth()
  const isLoggedIn = Auth.userIsAuthenticated()
  const userRole = Auth.getUser()?.role

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isError, setIsError] = useState(false)
  const [redirectTo, setRedirectTo] = useState('')

  useEffect(() => {
    if (isLoggedIn) {
      setRedirectTo(userRole === 'USER' ? '/userpage' : '/')
    }
  }, [isLoggedIn, userRole])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!(username && password)) { setIsError(true); return }

    try {
      const response = await bulkApi.authenticate(username, password)
      const { id, name, role } = response.data
      const authdata = window.btoa(username + ':' + password)
      Auth.userLogin({ id, name, role, authdata })

      setRedirectTo(role === 'USER' ? '/userpage' : '/')
    } catch (err) { setIsError(true) }
  }

  if (redirectTo) return <Navigate to={redirectTo} />

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Добро пожаловать</h2>
        <p style={styles.subtitle}>Войдите чтобы продолжить</p>
        <form style={styles.form} onSubmit={handleSubmit}>
          <input type="text" placeholder="Имя пользователя" value={username} onChange={(e)=>setUsername(e.target.value)} style={styles.input}/>
          <input type="password" placeholder="Пароль" value={password} onChange={(e)=>setPassword(e.target.value)} style={styles.input}/>
          <button type="submit" style={styles.button}>Войти</button>
        </form>
        {isError && <p style={styles.error}>Неверный логин или пароль</p>}
        <p style={styles.footerText}>
          Еще нет аккаунта? <NavLink to="/signup" style={styles.link}>Зарегистрироваться</NavLink>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg)', fontFamily: "'Poppins', sans-serif" },
  card: { width: '400px', padding: '2.5rem', borderRadius: '20px', background: 'var(--card)', boxShadow: '0 12px 40px var(--shadow)', textAlign: 'center', color: 'var(--text)' },
  title: { marginBottom: '0.5rem', fontSize: '1.8rem', fontWeight: '600', color: 'var(--text)' },
  subtitle: { marginBottom: '2rem', fontSize: '1rem', color: 'var(--muted)' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.2rem' },
  input: { padding: '0.9rem 1rem', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', outline: 'none', background: 'var(--card)', color: 'var(--text)' },
  button: { padding: '1rem', borderRadius: '12px', border: 'none', color: 'white', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', background: 'var(--primary)' },
  error: { marginTop: '1rem', color: '#FF6B6B', fontWeight: '500' },
  footerText: { marginTop: '2rem', fontSize: '0.9rem', color: 'var(--muted)' },
  link: { color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' },
}

export default LoginPage
