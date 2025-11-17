'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useField, useFormFields } from '@payloadcms/ui'
import type { RelationshipField } from 'payload'
import './styles.css'

interface RelationshipGridFieldProps {
  field: RelationshipField
  path: string
  readOnly?: boolean
}

interface MediaItem {
  id: number
  _collection?: string // Track which collection this item belongs to
  title?: string
  artist?: string
  author?: string
  director?: string
  coverImage?: {
    url?: string
    sizes?: {
      thumbnail?: {
        url?: string
      }
    }
  }
  year?: number
}

const RelationshipGridField: React.FC<RelationshipGridFieldProps> = (props) => {
  const { field, path } = props
  const { value, setValue } = useField<any>({ path })
  const [items, setItems] = useState<MediaItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)

  // Extract ID from value - handle both polymorphic and simple formats
  const getValueId = (): number | undefined => {
    if (!value) return undefined
    // Polymorphic relationship format: { relationTo, value: { id, ... } }
    if (typeof value === 'object' && 'value' in value) {
      return typeof value.value === 'object' ? value.value?.id : value.value
    }
    // Simple number format
    return typeof value === 'number' ? value : undefined
  }

  const currentValueId = getValueId()

  // Get mediaType from form if it exists (for filtering collections)
  const mediaTypeField = useFormFields(([fields]) => fields?.mediaType)
  const mediaType = mediaTypeField?.value as string | undefined

  // Get relationTo from field config
  const relationTo = field.relationTo
  const label = typeof field.label === 'string' ? field.label : 'Item'
  const required = field.required

  // Determine which collections to fetch from
  // If mediaType is set, only fetch from that collection
  let collections: string[]
  if (mediaType) {
    collections = [mediaType]
  } else {
    collections = Array.isArray(relationTo) ? relationTo : [relationTo]
  }

  // Fetch items based on search term (search-driven approach)
  useEffect(() => {
    const fetchItems = async () => {
      // Skip if no collections or relationTo is undefined
      if (!relationTo || collections.length === 0) {
        console.warn('No relationTo configured for field')
        return
      }

      try {
        const allItems: MediaItem[] = []

        // Only fetch limited results - use search to find what you need
        const perCollectionLimit = 10 // Always fetch 10 per collection
        const totalLimit = 10 // Always show max 10 items

        for (const collection of collections) {
          if (!collection) continue

          // Build query with search filter if available
          let url = `/api/${collection}?limit=${perCollectionLimit}&sort=title`
          if (searchTerm) {
            const encoded = encodeURIComponent(searchTerm)
            // Build where query based on collection type - only query fields that exist
            url += `&where[or][0][title][contains]=${encoded}`

            // Add collection-specific fields
            if (collection === 'art' || collection === 'albums') {
              url += `&where[or][1][artist][contains]=${encoded}`
            }
            if (collection === 'books') {
              url += `&where[or][1][author][contains]=${encoded}`
            }
            if (collection === 'films') {
              url += `&where[or][1][director][contains]=${encoded}`
            }
          }

          const response = await fetch(url)
          const data = await response.json()
          if (data.docs) {
            // Add collection name to each item for unique keys
            const itemsWithCollection = data.docs.map((doc: any) => {
              return {
                id: doc.id,
                _collection: collection,
                title: doc.title,
                artist: doc.artist,
                author: doc.author,
                director: doc.director,
                coverImage: doc.coverImage,
                year: doc.year,
              } as MediaItem
            })
            allItems.push(...itemsWithCollection)
          }
        }

        // Limit total items to prevent overwhelming the UI
        setItems(allItems.slice(0, totalLimit))
      } catch (error) {
        console.error('Error fetching items:', error)
      }
    }

    // Debounce search to avoid too many requests
    const timeoutId = setTimeout(() => {
      fetchItems()
    }, searchTerm ? 300 : 0)

    return () => clearTimeout(timeoutId)
  }, [relationTo, searchTerm, mediaType])

  // Fetch selected item details separately
  useEffect(() => {
    const fetchSelectedItem = async () => {
      if (!currentValueId || !relationTo) return

      try {
        // Try each collection to find the item
        for (const collection of collections) {
          if (!collection) continue

          try {
            const response = await fetch(`/api/${collection}/${currentValueId}`)
            if (response.ok) {
              const data = await response.json()
              setSelectedItem({
                ...data,
                _collection: collection,
              })
              break
            }
          } catch (e) {
            // Item not in this collection, try next
            continue
          }
        }
      } catch (error) {
        console.error('Error fetching selected item:', error)
      }
    }

    fetchSelectedItem()
  }, [currentValueId, relationTo, mediaType])

  // No client-side filtering needed - server handles it
  const filteredItems = items

  const handleSelect = useCallback(
    (item: MediaItem) => {
      // Save in polymorphic format for multi-relationTo fields
      const collection = item._collection || mediaType
      if (collection && Array.isArray(relationTo) && relationTo.length > 1) {
        setValue({
          relationTo: collection,
          value: item.id,
        })
      } else {
        // Simple format for single relationTo
        setValue(item.id)
      }
      setSelectedItem(item)
      setIsOpen(false)
      setSearchTerm('')
    },
    [setValue, relationTo, mediaType],
  )

  const handleClear = useCallback(() => {
    setValue(undefined)
    setSelectedItem(null)
  }, [setValue])

  // Get display text for an item
  const getItemDisplay = (item: MediaItem) => {
    const creator = item.artist || item.author || item.director
    return creator ? `${item.title} - ${creator}` : item.title
  }

  // Get image URL for an item
  const getImageUrl = (item: MediaItem) => {
    return (
      item.coverImage?.sizes?.thumbnail?.url ||
      item.coverImage?.url ||
      '/placeholder.png'
    )
  }

  return (
    <div className="relationship-grid-field">
      <label className="relationship-grid-field__label">
        {label || 'Select Item'}
        {required && <span className="required">*</span>}
      </label>

      {selectedItem ? (
        <div className="relationship-grid-field__selected">
          <div className="relationship-grid-field__selected-item">
            <img
              src={getImageUrl(selectedItem)}
              alt={selectedItem.title}
              className="relationship-grid-field__selected-image"
            />
            <span className="relationship-grid-field__selected-text">
              {getItemDisplay(selectedItem)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="relationship-grid-field__clear"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="relationship-grid-field__change"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relationship-grid-field__trigger"
        >
          Select a value
        </button>
      )}

      {isOpen && (
        <div className="relationship-grid-field__modal">
          <div className="relationship-grid-field__modal-content">
            <div className="relationship-grid-field__modal-header">
              <h3>Select {label || 'Item'}</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="relationship-grid-field__modal-close"
              >
                ×
              </button>
            </div>

            <div className="relationship-grid-field__search">
              <input
                type="text"
                placeholder="Search by title, artist, author, or director..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="relationship-grid-field__search-input"
                autoFocus
              />
            </div>

            <div className="relationship-grid-field__grid">
              {filteredItems.map((item) => (
                <button
                  key={`${item._collection}-${item.id}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="relationship-grid-field__grid-item"
                  data-collection={item._collection}
                >
                  <div className="relationship-grid-field__grid-image">
                    <img src={getImageUrl(item)} alt={item.title || 'Item'} />
                  </div>
                  <div className="relationship-grid-field__grid-info">
                    <div className="relationship-grid-field__grid-title">
                      {item.title}
                    </div>
                    {(item.artist || item.author || item.director) && (
                      <div className="relationship-grid-field__grid-creator">
                        {item.artist || item.author || item.director}
                      </div>
                    )}
                    {item.year && (
                      <div className="relationship-grid-field__grid-year">{item.year}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RelationshipGridField
