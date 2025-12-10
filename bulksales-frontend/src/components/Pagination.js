import React from 'react'

function Pagination({ page, setPage, pages }) {
  if (pages <= 1) return null
  const items = []
  for (let i = 1; i <= pages; i++) items.push(i)
  return (
    <div style={styles.wrap}>
      <button style={styles.btn} disabled={page<=1} onClick={()=>setPage(page-1)}>Назад</button>
      {items.map(n => (
        <button key={n} style={{ ...styles.btn, ...(n===page?styles.active:{}) }} onClick={()=>setPage(n)}>{n}</button>
      ))}
      <button style={styles.btn} disabled={page>=pages} onClick={()=>setPage(page+1)}>Вперёд</button>
    </div>
  )
}

const styles = {
  wrap: { display: 'flex', gap: '0.3rem', justifyContent: 'center', marginTop: '1rem' },
  btn: { padding: '0.4rem 0.7rem', borderRadius: '8px', border: '1px solid #ddd', background: 'var(--card)', color: 'var(--text)', cursor: 'pointer' },
  active: { background: 'var(--primary)', color: 'white', border: 'none' }
}

export default Pagination