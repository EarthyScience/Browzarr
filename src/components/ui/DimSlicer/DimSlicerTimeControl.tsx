'use client'

import React from 'react'
import TimeCombobox from './TimeCombobox'
import { DimSlicerNumericInputWithStepper } from './DimSlicerNumericInputWithStepper'

interface DimSlicerTimeControlProps {
  currentIndex: number
  onIndexChange: (index: number) => void
  value: string
  placeholder: string
  ariaLabel: string
  values: number[]
  effectiveDimSize: number
  formattedValue: (index: number) => string
  onValueChange: (value: string) => void
  onIncrement: () => void
  onDecrement: () => void
  includeEnd?: boolean
  layout?: 'row' | 'column'
  showInput?: boolean
}

export function DimSlicerTimeControl({
  currentIndex,
  onIndexChange,
  value,
  placeholder,
  ariaLabel,
  values,
  effectiveDimSize,
  formattedValue,
  onValueChange,
  onIncrement,
  onDecrement,
  includeEnd = false,
  layout = 'column',
  showInput = true,
}: DimSlicerTimeControlProps) {
  return (
    <div className={`flex gap-1 ${layout === 'row' ? 'items-center' : 'flex-col items-start'}`}>
      <div className={layout === 'row' ? 'min-w-0' : ''}>
        <TimeCombobox
          currentIndex={currentIndex}
          onIndexChange={onIndexChange}
          ariaLabel={ariaLabel}
          placeholder={placeholder}
          values={values}
          effectiveDimSize={effectiveDimSize}
          formattedValue={formattedValue}
          includeEnd={includeEnd}
        />
      </div>
      <DimSlicerNumericInputWithStepper
        value={value}
        placeholder={placeholder}
        onValueChange={onValueChange}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        ariaLabel={ariaLabel}
        showInput={showInput}
      />
    </div>
  )
}
