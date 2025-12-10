import React, { useEffect, useState } from 'react'
import { bulkApi } from '../misc/BulkApi'

// Запасные баннеры, если нет баннеров из планограмм
const fallbackBanners = [
  {
    id: 'fallback-1',
    title: 'Добро пожаловать в BulkSales!',
    description: 'Лучшие предложения для оптовых покупок',
    backgroundColor: '#3b82f6',
    textColor: '#ffffff'
  },
  {
    id: 'fallback-2',
    title: 'Скидки до 50%!',
    description: 'На выбранные товары каталога',
    backgroundColor: '#dc2626',
    textColor: '#ffffff'
  },
  {
    id: 'fallback-3',
    title: 'Новые поступления',
    description: 'Ознакомьтесь с новинками месяца',
    backgroundColor: '#059669',
    textColor: '#ffffff'
  }
]

function Banner() {
  const [banners, setBanners] = useState([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBanners = async () => {
      try {
        // 1) Пытаемся загрузить баннеры, настроенные менеджером
        const apiResp = await bulkApi.getBanners()
        const apiBanners = Array.isArray(apiResp.data) ? apiResp.data : []
        if (apiBanners.length > 0) {
          setBanners(apiBanners.filter(b => b.active !== false))
          return
        }
        // 2) Если нет - пробуем из планограмм
        const floorplansResponse = await bulkApi.floorplansGet()
        const floorplans = floorplansResponse.data || []
        const allBanners = floorplans.reduce((acc, floorplan) => {
          if (floorplan.banners && floorplan.banners.length > 0) {
            acc.push(...floorplan.banners)
          }
          return acc
        }, [])
        setBanners(allBanners.length > 0 ? allBanners : fallbackBanners)
      } catch (error) {
        console.error('Failed to load banners:', error)
        setBanners(fallbackBanners)
      } finally {
        setLoading(false)
      }
    }
    
    loadBanners()
  }, [])

  useEffect(() => {
    if (banners.length > 1) {
      const id = setInterval(() => setIdx(i => (i + 1) % banners.length), 5000)
      return () => clearInterval(id)
    }
  }, [banners.length])

  if (loading) {
    return (
      <div style={{ ...styles.wrap, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card)' }}>
        <div style={{ color: 'var(--text)', fontSize: '1.1rem' }}>🖼️ Загрузка баннеров...</div>
      </div>
    )
  }

  if (banners.length === 0) {
    return (
      <div style={{ ...styles.wrap, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎨</div>
          <div>Нет доступных баннеров</div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      {banners.map((banner, i) => (
        <div key={banner.id || i} style={{ ...styles.bannerSlide, opacity: i === idx ? 1 : 0 }}>
          {banner.imageUrl ? (
            <img 
              src={banner.imageUrl.startsWith('http') ? banner.imageUrl : `http://localhost:8082${banner.imageUrl}`} 
              alt={banner.title || 'Banner'} 
              style={styles.img} 
              onError={(e) => {
                // Если изображение не загрузилось, показываем текст
                e.target.style.display = 'none'
              }}
            />
          ) : null}
          
          {/* Текстовое содержание баннера */}
          {(banner.title || banner.description) && (
            <div style={{
              ...styles.textOverlay,
              background: banner.imageUrl ? 'linear-gradient(45deg, rgba(0,0,0,0.7), rgba(0,0,0,0.3))' : (banner.backgroundColor || '#3b82f6')
            }}>
              {banner.title && (
                <h2 style={{
                  ...styles.title,
                  color: banner.textColor || '#ffffff'
                }}>
                  {banner.title}
                </h2>
              )}
              {banner.description && (
                <p style={{
                  ...styles.description,
                  color: banner.textColor || '#ffffff'
                }}>
                  {banner.description}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
      
      {/* Индикаторы слайдов */}
      {banners.length > 1 && (
        <div style={styles.indicators}>
          {banners.map((_, i) => (
            <button
              key={i}
              style={{
                ...styles.indicator,
                background: i === idx ? '#ffffff' : 'rgba(255,255,255,0.5)'
              }}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  wrap: { 
    position: 'relative', 
    width: '100%', 
    height: '220px', 
    overflow: 'hidden', 
    borderRadius: '12px', 
    boxShadow: '0 8px 20px var(--shadow)', 
    marginBottom: '1rem',
    background: 'var(--card)'
  },
  bannerSlide: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    transition: 'opacity 0.6s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  img: { 
    position: 'absolute', 
    inset: 0, 
    width: '100%', 
    height: '100%', 
    objectFit: 'cover'
  },
  textOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '2rem'
  },
  title: {
    margin: 0,
    marginBottom: '0.5rem',
    fontSize: '2rem',
    fontWeight: 'bold',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
  },
  description: {
    margin: 0,
    fontSize: '1.1rem',
    textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
  },
  indicators: {
    position: 'absolute',
    bottom: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '0.5rem'
  },
  indicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  }
}

export default Banner