'use client'

import React, { useEffect, useState } from 'react'
import { useFormFields, useField } from '@payloadcms/ui'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy } from '@fortawesome/free-solid-svg-icons'
import { generateSlug } from '@/utilities/generateSlug'
import './styles.css'

interface SlugFieldProps {
  path: string
  creatorField: string
}

const SlugField: React.FC<SlugFieldProps> = ({ path, creatorField }) => {
  const { value, setValue } = useField<string>({ path })
  const [copied, setCopied] = useState(false)

  const title = useFormFields(([fields]) => fields?.title?.value as string)
  const creator = useFormFields(([fields]) => fields?.[creatorField]?.value as string)
  const year = useFormFields(([fields]) => fields?.year?.value as number)

  useEffect(() => {
    if (title && creator) {
      const newSlug = generateSlug({
        title,
        creator,
        year,
      })
      setValue(newSlug)
    }
  }, [title, creator, year, setValue])

  const handleCopy = async () => {
    if (value) {
      try {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  return (
    <div className="slug-field">
      <label className="slug-field__label">
        Slug
      </label>
      <div className="slug-field__content">
        <code className="slug-field__value">
          {value || 'Will be generated...'}
        </code>
        {value && (
          <button
            type="button"
            onClick={handleCopy}
            className="slug-field__copy-button"
            data-tooltip={copied ? 'Copied' : 'Copy'}
            data-copied={copied}
          >
            <FontAwesomeIcon icon={faCopy} />
          </button>
        )}
      </div>
    </div>
  )
}

export default SlugField
