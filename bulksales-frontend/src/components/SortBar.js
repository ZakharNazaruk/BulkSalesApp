import React from 'react'

function SortBar({ sortKey, setSortKey, total, viewMode, setViewMode }) {
  return (
    <div style={styles.wrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ color: 'var(--muted)' }}>Всего: {total}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ color: 'var(--muted)' }}>Сортировать:</label>
        <select value={sortKey} onChange={(e)=>setSortKey(e.target.value)} style={styles.select}>
          <option value="display">Витрина</option>
          <option value="popular">Популярные</option>
          <option value="price_asc">Цена ↑</option>
          <option value="price_desc">Цена ↓</option>
          <option value="new">Новинки</option>
        </select>
        <label style={{ color: 'var(--muted)' }}>Вид:</label>
        <select value={viewMode} onChange={(e)=>setViewMode(e.target.value)} style={styles.select}>
          <option value="grid">Сетка</option>
          <option value="list">Список</option>
        </select>
      </div>
    </div>
  )
}

const styles = {
  wrap: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  select: { padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #ddd', background: 'var(--card)', color: 'var(--text)' },
}

export default SortBar