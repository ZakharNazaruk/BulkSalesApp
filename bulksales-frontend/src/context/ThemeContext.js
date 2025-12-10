import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) setTheme(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem('theme', theme)
    const root = document.documentElement
    if (theme === 'dark') {
      root.style.setProperty('--bg', '#121212')
      root.style.setProperty('--card', '#1E1E1E')
      root.style.setProperty('--text', '#F5F5F5')
      root.style.setProperty('--primary', '#BDB2FF')
      root.style.setProperty('--muted', '#BBBBBB')
      root.style.setProperty('--shadow', 'rgba(0,0,0,0.5)')
      // Planogram specific
        root.style.setProperty('--canvas-outer-bg', '#0f0f10')
        root.style.setProperty('--canvas-border', '#2a2a2a')
        root.style.setProperty('--canvas-bg', '#1a1a1a')
        root.style.setProperty('--grid-line', 'rgba(255,255,255,0.07)')
        root.style.setProperty('--shelf-bg', '#1f2429')
        root.style.setProperty('--shelf-border', '#334155')
        root.style.setProperty('--shelf-shadow', '0 2px 8px rgba(0,0,0,0.4)')
        root.style.setProperty('--card-border', 'rgba(255,255,255,0.1)')
      // Additional dark theme variables
      root.style.setProperty('--input-bg', '#2a2a2a')
      root.style.setProperty('--input-border', '#404040')
      root.style.setProperty('--button-bg', '#3a3a3a')
      root.style.setProperty('--button-hover', '#4a4a4a')
      root.style.setProperty('--success', '#10b981')
      root.style.setProperty('--warning', '#f59e0b')
      root.style.setProperty('--error', '#ef4444')
    } else {
      root.style.setProperty('--bg', '#f5f5f5')
      root.style.setProperty('--card', '#ffffff')
      root.style.setProperty('--text', '#333333')
      root.style.setProperty('--primary', '#6A4C93')
      root.style.setProperty('--muted', '#666666')
      root.style.setProperty('--shadow', 'rgba(0,0,0,0.1)')
      // Planogram specific
        root.style.setProperty('--canvas-outer-bg', '#f3f4f6')
        root.style.setProperty('--canvas-border', '#e5e7eb')
        root.style.setProperty('--canvas-bg', '#ffffff')
        root.style.setProperty('--grid-line', 'rgba(0,0,0,0.06)')
        root.style.setProperty('--shelf-bg', '#f8fafc')
        root.style.setProperty('--shelf-border', '#cbd5e1')
        root.style.setProperty('--shelf-shadow', '0 1px 3px rgba(0,0,0,0.1)')
        root.style.setProperty('--card-border', 'rgba(0,0,0,0.1)')
      // Additional light theme variables
      root.style.setProperty('--input-bg', '#ffffff')
      root.style.setProperty('--input-border', '#d1d5db')
      root.style.setProperty('--button-bg', '#6A4C93')
      root.style.setProperty('--button-hover', '#5a3c83')
      root.style.setProperty('--success', '#10b981')
      root.style.setProperty('--warning', '#f59e0b')
      root.style.setProperty('--error', '#ef4444')
    }
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() { return useContext(ThemeContext) }




