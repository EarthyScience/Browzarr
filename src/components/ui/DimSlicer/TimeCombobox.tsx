'use client'
import React, { useState, useMemo, useEffect } from 'react'
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
  const selectedLabel =
    includeEnd && currentIndex === effectiveDimSize
      ? formattedValue(Math.max(effectiveDimSize - 1, 0))
      : formattedValue(currentIndex)

  const [inputQuery, setInputQuery] = useState('')
  const inputValue = inputQuery === '' ? selectedLabel : inputQuery

  const [windowRadius, setWindowRadius] = useState(50)

  useEffect(() => {
    setWindowRadius(50)
  }, [inputValue, currentIndex])

  const handleValueChange = (value: unknown) => {
    const label = typeof value === 'string' ? value : ''
    if (label === '') {
      setInputQuery('')
      onIndexChange(includeEnd ? effectiveDimSize : 0)
      return
    }
    const item = labeledValues.find(({ label: l }) => l === label)
    if (item) {
      setInputQuery('')
      onIndexChange(item.index)
    }
  }

  const labeledValues = useMemo(() => {
    return values.map((_, i) => ({ label: formattedValue(i), index: i }))
  }, [values, formattedValue])

  const filtered = useMemo(() => {
    const normalizedInput = inputValue.trim().toLowerCase()
    const selectedQuery = selectedLabel.trim().toLowerCase()
    const isFiltering = normalizedInput !== '' && normalizedInput !== selectedQuery;

    if (isFiltering) {
      const results = labeledValues.filter(({ label }) => label.toLowerCase().includes(normalizedInput))
      return results.slice(0, windowRadius * 2);
    }

    const startIdx = Math.max(0, currentIndex - windowRadius);
    const endIdx = Math.min(labeledValues.length, currentIndex + windowRadius);
    return labeledValues.slice(startIdx, endIdx);
  }, [inputValue, selectedLabel, labeledValues, windowRadius, currentIndex])

  const targetWidth = Math.min(
    Math.max(Math.max(selectedLabel.length, placeholder.length) + 2, 12),
    20
  )

  return (
    <Combobox
      value={selectedLabel}
      onValueChange={handleValueChange}
      onInputValueChange={value =>
        setInputQuery(typeof value === 'string' ? value : String(value))
      }
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
        <ComboboxList
          onScroll={(e: React.UIEvent<HTMLDivElement>) => {
            const target = e.currentTarget;
            const scrollPos = target.scrollTop;
            const maxScroll = target.scrollHeight - target.clientHeight;
            
            const isNearBottom = maxScroll > 0 && maxScroll - scrollPos <= target.clientHeight;
            const isNearTop = maxScroll > 0 && scrollPos <= target.clientHeight;
            
            if (isNearBottom || isNearTop) {
              setWindowRadius(r => {
                const normalizedInput = inputValue.trim().toLowerCase()
                const selectedQuery = selectedLabel.trim().toLowerCase()
                const isFiltering = normalizedInput !== '' && normalizedInput !== selectedQuery;
                
                if (isFiltering) {
                  return isNearBottom ? Math.min(r + 50, 5000) : r;
                } else {
                  const startIdx = Math.max(0, currentIndex - r);
                  const endIdx = Math.min(labeledValues.length, currentIndex + r);
                  const canGrowTop = startIdx > 0 && isNearTop;
                  const canGrowBottom = endIdx < labeledValues.length && isNearBottom;
                  if (canGrowTop || canGrowBottom) {
                    return Math.min(r + 50, 5000);
                  }
                }
                return r;
              });
            }
          }}
        >
          {filtered.map(({ label, index }) => (
            <ComboboxItem key={index} value={label}>
              {label}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}