import React from 'react'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";

interface QuickSelectProps {
  	children: React.ReactNode;
	placeholder?: string;
	value?: string;
	defaultValue?: string;
	className?: string;
	onValueChange?: (value: string) => void;
}

export const QuickSelect = ({children, placeholder, value, defaultValue, className, onValueChange} : QuickSelectProps) => {
	return (
		<Select defaultValue={defaultValue} value={value} onValueChange={onValueChange}>
			<SelectTrigger className={className}>
				<SelectValue placeholder={placeholder}/>
			</SelectTrigger>
			<SelectContent>
				{children}
			</SelectContent>
		</Select>
	)
}
