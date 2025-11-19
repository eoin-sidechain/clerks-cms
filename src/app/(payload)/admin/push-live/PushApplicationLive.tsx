'use client'

import React, { useState } from 'react'
import { pushApplicationLive } from './actions'

export default function PushApplicationLive() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<any>(null)

  async function handlePush() {
    if (!confirm('This will deactivate all current quiz templates and create new ones. Continue?')) {
      return
    }

    setStatus('loading')
    setMessage('Pushing application live...')

    try {
      const result = await pushApplicationLive()

      if (result.success) {
        setStatus('success')
        setMessage('Application successfully pushed live!')
        setResults(result)
      } else {
        setStatus('error')
        setMessage(result.error || 'Failed to push application live')
      }
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>Push Application Live</h1>

      <div style={{
        background: '#f5f5f5',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>What this does:</h2>
        <ol style={{ lineHeight: '1.8', paddingLeft: '20px' }}>
          <li>Fetches the active Clerks Application from PayloadCMS</li>
          <li>Deactivates all existing quiz templates in production</li>
          <li>Creates new quiz templates from application sections</li>
          <li>Fetches quiz format JSON from <code>/quiz-format</code> endpoint</li>
          <li>Maps main sections as required, follow-up as optional</li>
          <li>Ensures only 1 section per quiz template</li>
        </ol>
      </div>

      <button
        onClick={handlePush}
        disabled={status === 'loading'}
        style={{
          padding: '16px 32px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: status === 'loading' ? '#999' : '#0070f3',
          border: 'none',
          borderRadius: '8px',
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
        }}
      >
        {status === 'loading' ? '⏳ Pushing Live...' : '🚀 Push Application Live'}
      </button>

      {message && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: status === 'success' ? '#d4edda' : status === 'error' ? '#f8d7da' : '#d1ecf1',
          color: status === 'success' ? '#155724' : status === 'error' ? '#721c24' : '#0c5460',
        }}>
          <strong>{message}</strong>
        </div>
      )}

      {results && status === 'success' && (
        <div style={{
          padding: '20px',
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}>
          <h3 style={{ marginBottom: '10px' }}>Results:</h3>
          <ul style={{ lineHeight: '1.8' }}>
            <li>Application: {results.applicationTitle}</li>
            <li>Deactivated: {results.deactivatedCount} templates</li>
            <li>Created: {results.createdCount} templates</li>
            <li>Main Sections: {results.mainSections}</li>
            <li>Follow-up Sections: {results.followUpSections}</li>
          </ul>

          {results.templates && results.templates.length > 0 && (
            <details style={{ marginTop: '20px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                View Created Templates
              </summary>
              <pre style={{
                marginTop: '10px',
                padding: '10px',
                background: '#f5f5f5',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '400px',
              }}>
                {JSON.stringify(results.templates, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
