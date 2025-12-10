import React from 'react'
import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer style={styles.footer}>
      <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} Wholesale Store. All rights reserved.</p>
      <div style={styles.footerLinks}>
        <Link to="/" style={styles.footerLink}>Home</Link>
        <Link to="/contact" style={styles.footerLink}>Contact</Link>
        <Link to="/about" style={styles.footerLink}>About</Link>
      </div>
    </footer>
  )
}

const styles = {
  footer: { padding: '1.5rem 2rem', background: 'var(--card)', color: 'var(--text)', textAlign: 'center', boxShadow: '0 -4px 12px var(--shadow)' },
  footerLinks: { marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' },
  footerLink: { color: 'var(--text)', textDecoration: 'none' },
}

export default Footer
