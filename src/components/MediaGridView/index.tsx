'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import './styles.css'

// Searchable fields for media
const SEARCHABLE_FIELDS = ['filename', 'alt']

const MediaGrid: React.FC = () => {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const searchParams = useSearchParams()

  // Hide the default table view
  useEffect(() => {
    const mainContent =
      document.querySelector('[class*="template-default"]') || document.querySelector('main')
    if (mainContent) {
      const tables = mainContent.querySelectorAll('table')
      tables.forEach((table) => {
        ;(table as HTMLElement).style.display = 'none'
      })
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const params = new URLSearchParams()

        // Copy all params except 'search'
        searchParams.forEach((value, key) => {
          if (key !== 'search') {
            params.append(key, value)
          }
        })

        // Convert 'search' param to Payload 'where' clause
        const searchTerm = searchParams.get('search')
        if (searchTerm) {
          SEARCHABLE_FIELDS.forEach((field, index) => {
            params.append(`where[or][${index}][${field}][like]`, searchTerm)
          })
        }

        // Add default alphabetical sort by filename if no sort is specified
        if (!searchParams.has('sort')) {
          params.append('sort', 'filename')
        }

        const response = await fetch(`/api/media?${params}`)
        const json = await response.json()
        setData(json)
      } catch (error) {
        console.error('Error fetching media:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [searchParams])

  if (isLoading) {
    return <div className="media-grid-loading">Loading media...</div>
  }

  const docs = data?.docs || []

  return (
    <div className="media-grid-container">
      <div className="media-grid">
        {docs.map((doc: any) => {
          const imageUrl = doc.sizes?.thumbnail?.url || doc.url
          const filename = doc.filename || 'Untitled'

          return (
            <Link
              key={doc.id}
              href={`/admin/collections/media/${doc.id}`}
              className="media-grid-item"
            >
              <div className="media-grid-item-image">
                {imageUrl && <img src={imageUrl} alt={doc.alt || filename} loading="lazy" />}
              </div>
              <div className="media-grid-item-info">
                <span className="media-grid-item-filename">{filename}</span>
                {doc.alt && <span className="media-grid-item-alt">{doc.alt}</span>}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

const MediaGridView: React.FC = () => {
  return (
    <Suspense fallback={<div className="media-grid-loading">Loading...</div>}>
      <MediaGrid />
    </Suspense>
  )
}

export default MediaGridView
