"use client";
import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react';
import { BsFillQuestionCircleFill } from "react-icons/bs";
import { Button } from '@/components/ui/button-enhanced';
import { Slider } from '@/components/ui/slider';
import { QuickTip } from './QuickTip';
import { Hider } from './Hider';

// ---- Layout primitives so every settings row looks the same ---- //

export const FieldLabel = ({children, help, htmlFor} : {children: React.ReactNode, help?: React.ReactNode, htmlFor?: string}) => (
    <label htmlFor={htmlFor} className='flex items-center gap-1.5 text-sm font-medium'>
        {children}
        {help &&
            <QuickTip message={help} className='max-w-80'>
                <BsFillQuestionCircleFill className='size-3 shrink-0 text-muted-foreground' />
            </QuickTip>
        }
    </label>
)

export const Section = ({title, className, children} : {title: string, className?: string, children: React.ReactNode}) => (
    <div className={`flex flex-col gap-3 rounded-md p-3 text-left ${className ?? ''}`}>
        <span className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>{title}</span>
        {children}
    </div>
)

// Section whose body can be collapsed by clicking the title
export const CollapsibleSection = ({title, defaultOpen = false, className, children} : {
    title: string,
    defaultOpen?: boolean,
    className?: string,
    children: React.ReactNode,
}) => {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className={`flex flex-col rounded-md text-left ${className ?? ''}`}>
            <button
                type='button'
                onClick={() => setOpen(x => !x)}
                className='flex items-center justify-between w-full py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors cursor-pointer'
            >
                {title}
                <ChevronDown className={`size-4 transition-transform duration-200 ${open ? '' : '-rotate-180'}`} />
            </button>
            <Hider show={open}>
                <Group>{children}</Group>
            </Hider>
        </div>
    )
}

// Hider wraps children in a plain div, so re-apply the column spacing inside it
export const Group = ({children} : {children: React.ReactNode}) => (
    <div className='flex flex-col gap-2'>{children}</div>
)

// Label on the left, control taking the right half
export const Field = ({label, help, htmlFor, children} : {
    label: React.ReactNode,
    help?: React.ReactNode,
    htmlFor?: string,
    children: React.ReactNode,
}) => (
    <div className='flex items-center justify-between gap-2'>
        <FieldLabel htmlFor={htmlFor} help={help}>{label}</FieldLabel>
        <div className='w-1/2 shrink-0'>{children}</div>
    </div>
)

export const SliderField = ({label, help, action, value, onChange, min, max, step, disabled, ends} : {
    label: string,
    help?: React.ReactNode,
    action?: React.ReactNode,
    value: number,
    onChange: (val: number) => void,
    min: number,
    max: number,
    step: number,
    disabled?: boolean,
    ends?: [string, string],
}) => (
    <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between gap-2 min-h-6'>
            <FieldLabel help={help}>{label}</FieldLabel>
            {action}
        </div>
        {/* py keeps the thumb from being clipped by Hider's overflow-hidden */}
        <div className='flex items-center gap-2 py-1.5 text-xs text-muted-foreground'>
            {ends?.[0]}
            <Slider
                className='flex-1'
                min={min}
                max={max}
                step={step}
                value={[value]}
                disabled={disabled}
                onValueChange={(vals: number[]) => onChange(vals[0])}
            />
            {ends?.[1]}
        </div>
    </div>
)

export const ToggleButton = ({id, checked, onChange, disabled} : {
    id?: string,
    checked: boolean,
    onChange: (val: boolean) => void,
    disabled?: boolean,
}) => (
    <Button
        id={id}
        size='sm'
        variant={checked ? 'default' : 'outline'}
        className='h-7 w-full cursor-pointer'
        disabled={disabled}
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
    >
        {checked ? 'On' : 'Off'}
    </Button>
)

export const SwitchField = ({id, label, help, checked, onChange, disabled} : {
    id: string,
    label: React.ReactNode,
    help?: React.ReactNode,
    checked: boolean,
    onChange: (val: boolean) => void,
    disabled?: boolean,
}) => (
    <Field label={label} help={help} htmlFor={id}>
        <ToggleButton id={id} checked={checked} onChange={onChange} disabled={disabled} />
    </Field>
)

export const ColorField = ({label, defaultValue, onChange} : {
    label: string,
    defaultValue: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
}) => (
    <Field label={label}>
        <input type="color" className='h-7 w-full cursor-pointer' defaultValue={defaultValue} onChange={onChange} />
    </Field>
)
