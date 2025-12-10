import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((msg) => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg }])
    setTimeout(()=> setToasts(t => t.filter(x=>x.id!==id)), 2000)
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, display: 'grid', gap: '8px', zIndex: 2000 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 12px var(--shadow)' }}>{t.msg}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() { return useContext(ToastContext) }