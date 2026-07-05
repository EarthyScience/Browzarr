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

  const filteredData = useMemo(() => {
    const normalizedInput = inputValue.trim().toLowerCase()
    const selectedQuery = selectedLabel.trim().toLowerCase()
    const isFiltering = normalizedInput !== '' && normalizedInput !== selectedQuery;

    if (isFiltering) {
      const results = labeledValues.filter(({ label }) => label.toLowerCase().includes(normalizedInput))
      return { items: results.slice(0, windowRadius * 2), startIdx: 0 };
    }

    const startIdx = Math.max(0, currentIndex - windowRadius);
    const endIdx = Math.min(labeledValues.length, currentIndex + windowRadius);
    return { items: labeledValues.slice(startIdx, endIdx), startIdx };
  }, [inputValue, selectedLabel, labeledValues, windowRadius, currentIndex])

  const filtered = filteredData.items;

  const listRef = React.useRef<HTMLDivElement>(null);
  const lastVisibleItem = React.useRef<{ index: string; offset: number } | null>(null);

  React.useLayoutEffect(() => {
    if (listRef.current && lastVisibleItem.current) {
      const { index, offset } = lastVisibleItem.current;
      const target = listRef.current;
      const item = target.querySelector(`[data-index="${index}"]`);
      if (item) {
        const targetRect = target.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        const currentOffset = itemRect.top - targetRect.top;
        const diff = currentOffset - offset;
        
        if (Math.abs(diff) > 0) {
          target.scrollTop += diff;
        }
      }
      // Also apply once in a microtask just in case Base UI auto-scrolls asynchronously
      requestAnimationFrame(() => {
        if (target && item) {
          const newCurrentOffset = item.getBoundingClientRect().top - target.getBoundingClientRect().top;
          const newDiff = newCurrentOffset - offset;
          if (Math.abs(newDiff) > 0) {
            target.scrollTop += newDiff;
          }
        }
      });
      lastVisibleItem.current = null;
    }
  }, [filteredData]);

  const targetWidth = Math.min(
    Math.max(Math.max(selectedLabel.length, placeholder.length) + 2, 12),
    40
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
        style={{ width: `${targetWidth}ch` }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        showClear
      />
      <ComboboxContent>
        {filtered.length === 0 ? <ComboboxEmpty>No items found.</ComboboxEmpty> : null}
        <ComboboxList
          ref={listRef}
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
                
                let nextR = r;
                if (isFiltering) {
                  nextR = isNearBottom ? Math.min(r + 50, 5000) : r;
                } else {
                  const startIdx = Math.max(0, currentIndex - r);
                  const endIdx = Math.min(labeledValues.length, currentIndex + r);
                  const canGrowTop = startIdx > 0 && isNearTop;
                  const canGrowBottom = endIdx < labeledValues.length && isNearBottom;
                  if (canGrowTop || canGrowBottom) {
                    nextR = Math.min(r + 50, 5000);
                  }
                }

                if (nextR !== r) {
                  const targetRect = target.getBoundingClientRect();
                  const children = Array.from(target.querySelectorAll('[data-slot="combobox-item"]'));
                  for (const child of children) {
                    const childRect = child.getBoundingClientRect();
                    if (childRect.bottom >= targetRect.top) {
                      lastVisibleItem.current = {
                        index: child.getAttribute('data-index') || '',
                        offset: childRect.top - targetRect.top
                      };
                      break;
                    }
                  }
                }

                return nextR;
              });
            }
          }}
        >
          {filtered.map(({ label, index }) => (
            <ComboboxItem key={index} value={label} data-index={index}>
              {label}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}