import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { bulkApi } from '../misc/BulkApi'

function VipBadge() {
  const [vip, setVip] = React.useState(false)
  React.useEffect(() => {
    import('../misc/BulkApi').then(m => m.bulkApi.getMe()).then(r => setVip(!!r.data?.vip)).catch(()=>{})
  }, [])
  return <span style={{ fontSize: '0.85rem', background: vip ? '#1AA179' : '#ccc', color: 'white', padding: '0.15rem 0.5rem', borderRadius: 6 }}>{vip ? 'VIP' : 'NO VIP'}</span>
}

function VipInfo() {
  const [info, setInfo] = React.useState({ vip: false, threshold: null, discount: null })
  React.useEffect(() => {
    Promise.all([
      import('../misc/BulkApi').then(m => m.bulkApi.getMe()).then(r => r.data).catch(()=>null),
      import('../misc/BulkApi').then(m => m.bulkApi.getVipSettings()).then(r => r.data).catch(()=>null)
    ]).then(([me, cfg]) => setInfo({ vip: !!(me?.vip), threshold: cfg?.vipThreshold ?? null, discount: cfg?.vipDiscountPercent ?? null }))
  }, [])
  return (
    <div style={{ marginTop: '0.5rem', color: 'var(--muted)' }}>
      Статус: <b>{info.vip ? 'VIP' : 'Обычный'}</b>
      {info.threshold != null && <> | Порог: {info.threshold}</>}
      {info.discount != null && <> | VIP скидка: {info.discount}%</>}
    </div>
  )
}

function maskCard(num) { if (!num) return ''; return num.replace(/\d(?=\d{4})/g, '*') }

function UserPage() {
  const { getUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [payment, setPayment] = useState({ name: '', number: '', expiry: '', cvv: '' })
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const me = await bulkApi.getMe()
        setProfile(me.data)
      } catch(_) { try { setProfile(getUser()) } catch(_){} }
      try {
        const resp = await bulkApi.getMyPaymentInfo()
        setPayment({
          name: resp.data?.nameOnCard || '',
          number: resp.data?.cardNumber || '',
          expiry: resp.data?.expiry || '',
          cvv: resp.data?.cvv || ''
        })
      } catch(_){}
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // убрали обращение к админскому /api/users, чтобы не ловить 403 для USER

  const onSavePayment = async (e) => {
    e.preventDefault()
    try {
      await bulkApi.updateMyPaymentInfo({
        nameOnCard: payment.name,
        cardNumber: payment.number,
        expiry: payment.expiry,
        cvv: payment.cvv,
      })
      setSavedMsg('Payment info saved.')
    } catch (_) {
      setSavedMsg('Failed to save payment info')
    }
    setTimeout(()=>setSavedMsg(''), 2000)
  }

  const formatName = (v) => v.replace(/\s+/g,' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ').trim()
  const formatCard = (v) => v.replace(/[^\d]/g,'').slice(0,16).replace(/(\d{4})(?=\d)/g,'$1 ').trim()
  const formatExpiry = (v) => {
    const d = v.replace(/[^\d]/g,'').slice(0,4)
    if (d.length <= 2) return d
    return d.slice(0,2) + '/' + d.slice(2)
  }

  const user = getUser()
  if (!user) return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div>Пожалуйста, войдите, чтобы увидеть профиль.</div>
    </div>
  )
  if (user.role !== 'USER' && user.role !== 'CLIENT') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div>Доступ запрещён.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '2rem' }}>
        <h1 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>Личный кабинет <VipBadge /></h1>
        <div style={styles.grid}>
          <div style={styles.card}>
            <h3>Профиль</h3>
            <p><b>Имя:</b> {profile?.name}</p>
            <p><b>Email:</b> {profile?.email}</p>
            <p><b>Зарегистрирован:</b> {(profile?.createdAt||'').toString().slice(0,19).replace('T',' ')}</p>
            <p><b>Потрачено всего:</b> {profile?.totalSpent}</p>
            <VipInfo />
          </div>
          <div style={styles.card}>
            <h3>Платёжная информация</h3>
            <form onSubmit={onSavePayment} style={styles.formGrid}>
              <label style={styles.label}>Имя на карте
                <input style={styles.input} value={payment.name} onChange={(e)=>setPayment({ ...payment, name: formatName(e.target.value) })} />
              </label>
              <label style={styles.label}>Номер карты
                <input style={styles.input} value={payment.number} onChange={(e)=>setPayment({ ...payment, number: formatCard(e.target.value) })} placeholder="1234 5678 9012 3456" />
              </label>
              <label style={styles.label}>Срок (MM/YY)
                <input style={styles.input} value={payment.expiry} onChange={(e)=>setPayment({ ...payment, expiry: formatExpiry(e.target.value) })} placeholder="MM/YY" />
              </label>
              <label style={styles.label}>CVV
                <input style={styles.input} value={payment.cvv} onChange={(e)=>setPayment({ ...payment, cvv: e.target.value.replace(/[^\d]/g,'').slice(0,3) })} placeholder="123" />
              </label>
              <div style={{ gridColumn: '1 / -1' }}>
                <button style={styles.button} type="submit">Сохранить</button>
                {savedMsg && <span style={{ marginLeft: '0.5rem', color: 'var(--muted)' }}>{savedMsg}</span>}
              </div>
            </form>
            {payment.number && <p style={{ marginTop: '0.5rem' }}><b>Сохранено:</b> {maskCard(payment.number)}</p>}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' },
  card: { background: 'var(--card)', padding: '1rem', borderRadius: '12px', boxShadow: '0 8px 20px var(--shadow)' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'center' },
  label: { display: 'grid', gridTemplateColumns: '1fr', gap: '0.3rem' },
  input: { width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #ddd', background: 'var(--card)', color: 'var(--text)' },
  button: { padding: '0.6rem 0.9rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer' },
}

export default UserPage
