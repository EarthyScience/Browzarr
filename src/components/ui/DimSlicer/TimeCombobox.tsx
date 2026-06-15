'use client'

import React, { useState } from 'react'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'

interface TimeComboboxProps {
  currentIndex: number
  onIndexChange: (index: number) => void
  ariaLabel: string
  placeholder: string
  values: number[]
  effectiveDimSize: number
  formattedValue: (index: number) => string
  includeEnd?: boolean
}

export default function TimeCombobox({
  currentIndex,
  onIndexChange,
  ariaLabel,
  placeholder,
  values,
  effectiveDimSize,
  formattedValue,
  includeEnd = false,
}: TimeComboboxProps) {
  const selectedLabel = includeEnd && currentIndex === effectiveDimSize ? formattedValue(Math.max(effectiveDimSize - 1, 0)) : formattedValue(currentIndex)
  const [inputQuery, setInputQuery] = useState('')
  const inputValue = inputQuery === '' ? selectedLabel : inputQuery

  const getIndexFromLabel = (label: string) => {
    return values.findIndex((_, index) => formattedValue(index) === label)
  }

  const handleValueChange = (value: unknown) => {
    const label = typeof value === 'string' ? value : ''
    if (label === '') {
      setInputQuery('')
      onIndexChange(includeEnd ? effectiveDimSize : 0)
      return
    }
    const nextIndex = getIndexFromLabel(label)
    if (nextIndex !== -1) {
      setInputQuery('')
      onIndexChange(nextIndex)
    }
  }

  const labels = values.map((_, i) => formattedValue(i))
  const normalizedInput = inputValue.trim().toLowerCase()
  const selectedQuery = selectedLabel.trim().toLowerCase()
  const filtered = normalizedInput === '' || normalizedInput === selectedQuery ? labels : labels.filter(l => l.toLowerCase().includes(normalizedInput))
  const targetWidth = Math.min(Math.max(Math.max(selectedLabel.length, placeholder.length) + 2, 12), 20)

  return (
    <Combobox
      value={selectedLabel}
      onValueChange={handleValueChange}
      onInputValueChange={value => setInputQuery(typeof value === 'string' ? value : String(value))}
      autoHighlight
    >
      <ComboboxInput
        className="max-w-full"
        style={{ minWidth: `${targetWidth}ch`, width: `${targetWidth}ch` }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        showClear
      />
      <ComboboxContent>
        {filtered.length === 0 ? <ComboboxEmpty>No items found.</ComboboxEmpty> : null}
        <ComboboxList>
          {filtered.map(label => (
            <ComboboxItem key={label} value={label}>
              {label}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
