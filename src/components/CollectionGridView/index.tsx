'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import './styles.css'

interface CollectionGridProps {
  collection: string
}

// Define searchable fields for each collection
const SEARCHABLE_FIELDS: Record<string, string[]> = {
  albums: ['title', 'artist', 'slug', 'description'],
  books: ['title', 'author', 'slug', 'description'],
  films: ['title', 'director', 'slug', 'description'],
  art: ['title', 'artist', 'slug', 'description'],
}

// Define default columns (labels) for each collection
const DEFAULT_COLUMNS: Record<string, string[]> = {
  albums: ['title', 'artist'],
  books: ['title', 'author'],
  films: ['title', 'director'],
  art: ['title', 'artist'],
}

// Format field values for display
const formatFieldValue = (value: any, fieldName: string): string => {
  if (value === null || value === undefined) return ''

  // Format dates
  if (fieldName === 'updatedAt' || fieldName === 'createdAt') {
    const date = new Date(value)
    return date.toLocaleDateString()
  }

  // Convert to string for display
  return String(value)
}

const CollectionGrid: React.FC<CollectionGridProps> = ({ collection }) => {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const searchParams = useSearchParams()

  // Hide the table immediately to prevent flash - only for this collection
  useEffect(() => {
    // Find the main content area and hide only tables within it
    const mainContent = document.querySelector('[class*="template-default"]') || document.querySelector('main')
    if (mainContent) {
      const tables = mainContent.querySelectorAll('table')
      tables.forEach(table => {
        ;(table as HTMLElement).style.display = 'none'
      })
    }
  }, [])

  // Hide the columns button from the Payload admin UI
  useEffect(() => {
    const hideColumnsButton = () => {
      // Try multiple selectors to find and hide the columns button
      const selectors = [
        'button[aria-label*="Columns"]',
        'button[aria-label*="columns"]',
        'button[title*="Columns"]',
        'button[title*="columns"]',
        '.list-controls button:has(svg)',
        '[class*="list-controls"] button:last-of-type',
      ]

      selectors.forEach(selector => {
        const buttons = document.querySelectorAll(selector)
        buttons.forEach(button => {
          const text = button.textContent?.toLowerCase() || ''
          const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || ''
          const title = button.getAttribute('title')?.toLowerCase() || ''

          if (text.includes('column') || ariaLabel.includes('column') || title.includes('column')) {
            ;(button as HTMLElement).style.display = 'none'
          }
        })
      })
    }

    // Run immediately and on a delay to catch dynamically loaded elements
    hideColumnsButton()
    const interval = setInterval(hideColumnsButton, 100)
    const timeout = setTimeout(() => clearInterval(interval), 3000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
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
        if (searchTerm && SEARCHABLE_FIELDS[collection]) {
          const fields = SEARCHABLE_FIELDS[collection]
          fields.forEach((field, index) => {
            params.append(`where[or][${index}][${field}][like]`, searchTerm)
          })
        }

        // Add default alphabetical sort by title if no sort is specified
        if (!searchParams.has('sort')) {
          params.append('sort', 'title')
        }

        const response = await fetch(`/api/${collection}?${params}`)
        const json = await response.json()
        setData(json)
      } catch (error) {
        console.error(`Error fetching ${collection}:`, error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [searchParams, collection])

  if (isLoading) {
    return <div className="collection-grid-loading">Loading...</div>
  }

  const docs = data?.docs || []
  const columns = DEFAULT_COLUMNS[collection] || []

  return (
    <>
      <div className="collection-grid-container">
        <div className="collection-grid">
        {docs.map((doc: any) => {
          // Different collections have different image field structures
          const imageUrl = doc.coverImage?.sizes?.thumbnail?.url ||
                          doc.coverImage?.url ||
                          doc.sizes?.thumbnail?.url ||
                          doc.url

          const title = doc.title || doc.filename || 'Untitled'

          // Get labels from columns, excluding coverImage
          const labels = columns
            .filter(col => col !== 'coverImage')
            .map(col => ({
              field: col,
              value: formatFieldValue(doc[col], col)
            }))
            .filter(label => label.value) // Only show non-empty values

          // Get year for tag display
          const year = doc.year

          return (
            <Link
              key={doc.id}
              href={`/admin/collections/${collection}/${doc.id}`}
              className={`collection-grid-item collection-grid-item-${collection}`}
            >
              <div className="collection-grid-item-image">
                {imageUrl && (
                  <img src={imageUrl} alt={doc.alt || title} loading="lazy" />
                )}
              </div>
              <div className="collection-grid-item-info">
                <div className="collection-grid-item-labels">
                  {labels.map((label, index) => (
                    <span
                      key={label.field}
                      className={index === 0 ? 'collection-grid-item-title' : 'collection-grid-item-label'}
                    >
                      {label.value}
                    </span>
                  ))}
                </div>
                {year && (
                  <span className="collection-grid-item-tag">{year}</span>
                )}
              </div>
            </Link>
          )
        })}
        </div>
      </div>
    </>
  )
}

const CollectionGridView: React.FC<CollectionGridProps> = ({ collection }) => {
  return (
    <Suspense fallback={<div className="collection-grid-loading">Loading...</div>}>
      <CollectionGrid collection={collection} />
    </Suspense>
  )
}

export default CollectionGridView
