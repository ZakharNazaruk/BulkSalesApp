import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { bulkApi } from '../misc/BulkApi'
import { useI18n } from '../context/I18nContext'
import BroadcastModal from '../components/BroadcastModal'
import { useToast } from '../context/ToastContext'


function AdminPage() {
  const { userIsAuthenticated, getUser } = useAuth()
  const currentUser = getUser()
  const { t } = useI18n()
  const toast = useToast()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [roleUpdate, setRoleUpdate] = useState({ username: '', role: 'USER', vip: false })
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)

  useEffect(() => {
    if (userIsAuthenticated() && currentUser.role === 'ADMIN') {
      fetchUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!userIsAuthenticated() || currentUser.role !== 'ADMIN') {
    return <div style={{ padding: '2rem' }}>Access denied. Only admins can view this page.</div>
  }

  const fetchUsers = async () => {
    try {
      const response = await bulkApi.getUsers()
      setUsers(response.data)
      setLoading(false)
    } catch (err) {
      setError('Failed to fetch users')
      setLoading(false)
    }
  }

  const deleteUser = async (id, username) => {
    try {
      await bulkApi.deleteUser(username)
      setUsers(users.filter(u => u.id !== id))
    } catch (err) {
      setError('Failed to delete user')
    }
  }

  const onOpenRole = (u) => setRoleUpdate({ username: u.username, role: u.role, vip: u.vip })
  const onChangeRole = async () => {
    try {
      await bulkApi.updateUserRole(roleUpdate.username, roleUpdate.role)
      await bulkApi.setVip(roleUpdate.username, roleUpdate.vip)
      setUsers(users.map(u => u.username === roleUpdate.username ? { ...u, role: roleUpdate.role, vip: roleUpdate.vip } : u))
      setRoleUpdate({ username: '', role: 'USER', vip: false })
    } catch (e) { setError('Failed to update role/VIP') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ margin: 0 }}>{t.adminDash}</h1>
          <button 
            style={{ ...styles.button, background: '#10b981', fontSize: '0.95rem', padding: '0.6rem 1.2rem' }} 
            onClick={() => setShowBroadcastModal(true)}
          >
            📢 Массовая рассылка
          </button>
        </div>
        {roleUpdate.username && (
          <div style={styles.rolePanel}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span>Обновить для: <b>{roleUpdate.username}</b></span>
              <select value={roleUpdate.role} onChange={(e)=>setRoleUpdate({ ...roleUpdate, role: e.target.value })} style={styles.input}>
                <option value="USER">Пользователь</option>
                <option value="ADMIN">Администратор</option>
                <option value="MANAGER">Менеджер</option>
              </select>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input type="checkbox" checked={roleUpdate.vip} onChange={(e)=>setRoleUpdate({ ...roleUpdate, vip: e.target.checked })} />
                VIP
              </label>
              <button style={styles.button} onClick={onChangeRole}>Сохранить</button>
              <button style={{ ...styles.button, background: '#BDB2FF' }} onClick={()=>setRoleUpdate({ username: '', role: 'USER', vip: false })}>Close</button>
            </div>
          </div>
        )}
        {loading ? (
          <p>Загружаем пользователей...</p>
        ) : error ? (
          <p style={{ color: 'red' }}>{error}</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Имя</th>
                <th style={styles.th}>Логин</th>
                <th style={styles.th}>Роль</th>
                <th style={styles.th}>VIP</th>
                <th style={styles.th}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={styles.td}>{u.id}</td>
                  <td style={styles.td}>{u.name}</td>
                  <td style={styles.td}>{u.username}</td>
                  <td style={styles.td}>{u.role}</td>
                  <td style={styles.td}>{u.vip ? 'ДА' : 'НЕТ'}</td>
                  <td style={styles.td}>
                    <button style={styles.button} onClick={() => onOpenRole(u)}>Роль/VIP</button>
                    <button style={{ ...styles.button, background: '#FF6B6B' }} onClick={() => deleteUser(u.id, u.username)}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}

        {/* Editing modal removed since update endpoint not defined */}
      </main>
      <Footer />
      {showBroadcastModal && (
        <BroadcastModal 
          onClose={() => setShowBroadcastModal(false)}
          onSuccess={() => {
            toast?.push?.('Уведомление отправлено всем пользователям')
            window.dispatchEvent(new CustomEvent('notifications-updated'))
          }}
        />
      )}
    </div>
  )
}

const styles = {
  tableWrap: { overflowX: 'auto' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    background: 'var(--card)',
    color: 'var(--text)'
  },
  th: { textAlign: 'left', padding: '0.6rem', borderBottom: '1px solid #eee' },
  td: { padding: '0.6rem', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' },
  button: {
    marginRight: '0.5rem',
    padding: '0.3rem 0.6rem',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    background: '#6A4C93',
    color: 'white',
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    padding: '2rem',
    borderRadius: '12px',
    width: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    marginTop: '0.3rem',
    marginBottom: '0.5rem',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '1rem',
  },
  rolePanel: {
    padding: '1rem',
    borderRadius: '10px',
    background: 'rgba(189,178,255,0.2)',
    marginBottom: '1rem',
  },
}

export default AdminPage
