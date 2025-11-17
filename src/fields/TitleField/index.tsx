'use client'

import React from 'react'
import { useField, useFormFields, TextInput } from '@payloadcms/ui'

interface TitleFieldProps {
  path: string
  required?: boolean
}

const TitleField: React.FC<TitleFieldProps> = ({ path, required }) => {
  const { value, setValue } = useField<string>({ path })

  // Get stepType and questionType from the form
  const stepTypeField = useFormFields(([fields]) => fields?.stepType)
  const questionTypeField = useFormFields(([fields]) => fields?.questionType)

  const stepType = stepTypeField?.value
  const questionType = questionTypeField?.value

  // Check if this is a rating question (should be read-only)
  const isRatingQuestion = stepType === 'question' && questionType === 'rating'

  return (
    <div className="field-type text">
      <label className="field-label">
        Title
        {required && <span className="required">*</span>}
      </label>
      {isRatingQuestion && (
        <p className="field-description" style={{ marginBottom: '0.5rem', color: '#666' }}>
          Auto-generated from the selected item
        </p>
      )}
      <TextInput
        path={path}
        value={value}
        onChange={setValue}
        disabled={isRatingQuestion}
        placeholder={isRatingQuestion ? 'Will be auto-generated...' : 'Enter title'}
      />
    </div>
  )
}

export default TitleField
