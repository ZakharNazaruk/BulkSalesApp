import React, { useState } from 'react'
import { bulkApi } from '../misc/BulkApi'

function BroadcastModal({ onClose, onSuccess }) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) {
      setError('Заполните все поля')
      return
    }
    setLoading(true)
    setError('')
    try {
      const resp = await bulkApi.broadcastNotification(title, message)
      onSuccess?.(resp.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка отправки уведомления')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 1rem 0' }}>Массовая рассылка уведомлений</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Заголовок</label>
            <input 
              style={styles.input} 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Введите заголовок"
              autoFocus
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Сообщение</label>
            <textarea 
              style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }} 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Введите сообщение"
            />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.actions}>
            <button type="button" style={styles.btnSecondary} onClick={onClose}>
              Отмена
            </button>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    background: 'var(--card)',
    padding: '2rem',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
    color: 'var(--text)',
  },
  field: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    color: 'var(--text)',
  },
  input: {
    width: '100%',
    padding: '0.7rem',
    border: '1px solid var(--border, #ddd)',
    borderRadius: '8px',
    fontSize: '1rem',
    background: 'var(--bg)',
    color: 'var(--text)',
  },
  error: {
    color: '#ef4444',
    marginBottom: '1rem',
    fontSize: '0.9rem',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
  },
  btnPrimary: {
    padding: '0.6rem 1.5rem',
    background: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1rem',
  },
  btnSecondary: {
    padding: '0.6rem 1.5rem',
    background: 'transparent',
    color: 'var(--text)',
    border: '1px solid var(--border, #ddd)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1rem',
  },
}

export default BroadcastModal
