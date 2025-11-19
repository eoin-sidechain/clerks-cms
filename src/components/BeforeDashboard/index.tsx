import { Banner } from '@payloadcms/ui/elements/Banner'
import React from 'react'

import { SeedButton } from './SeedButton'
import './index.scss'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC = () => {
  return (
    <div className={baseClass}>
      {/* Push Application Live Button */}
      <div
        className="push-live-banner"
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ color: 'white' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 'bold' }}>
              🚀 Push Application Live
            </h3>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem' }}>
              Deploy your application sections to production quiz templates
            </p>
          </div>
          <a
            href="/admin/push-live"
            className="push-live-button"
            style={{
              padding: '12px 24px',
              background: 'white',
              color: '#667eea',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '0.95rem',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              display: 'inline-block',
            }}
          >
            Go to Push Live →
          </a>
        </div>
      </div>
    </div>
  )
}

export default BeforeDashboard
