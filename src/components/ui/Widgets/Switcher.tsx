import React from 'react'

export const Switcher = ({leftText, rightText, state, onClick, className} : {leftText: string, rightText: string, state: boolean, onClick: () => void, className?: string}) => {

  return (
    <div 
        className={`${className} relative w-full text-center h-10 bg-primary rounded-full cursor-pointer mb-2 flex items-center justify-between px-4`}
        onClick={onClick}  
    >
        <span className={`z-10 font-semibold transition-colors ${state ? 'text-primary' : 'text-secondary'}`}>
        {leftText}
        </span>
        <span className={`z-10 font-semibold transition-colors ${!state ? 'text-primary' : 'text-secondary'}`}>
        {rightText}
        </span>
        <div 
        className={`absolute top-1 h-8 w-[calc(50%-8px)] bg-secondary shadow-xs hover:bg-secondary/80 rounded-full transition-all duration-300 ${
            state ? 'left-1' : 'left-[calc(50%+4px)]'
        }`}
        />
    </div>
  )
}

