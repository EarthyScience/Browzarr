'use client'

import React from 'react'
import { DimSlicerNumericInputWithStepper } from './DimSlicerNumericInputWithStepper'

interface DimSlicerNumericControlProps {
  value: string
  placeholder: string
  ariaLabel: string
  onValueChange: (value: string) => void
  onIncrement: () => void
  onDecrement: () => void
  showInput: boolean
}

export function DimSlicerNumericControl({
  value,
  placeholder,
  ariaLabel,
  onValueChange,
  onIncrement,
  onDecrement,
  showInput,
}: DimSlicerNumericControlProps) {
  return (
    <DimSlicerNumericInputWithStepper
      value={value}
      placeholder={placeholder}
      onValueChange={onValueChange}
      onIncrement={onIncrement}
      onDecrement={onDecrement}
      ariaLabel={ariaLabel}
      showInput={showInput}
    />
  )
}
