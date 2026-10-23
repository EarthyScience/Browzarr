import React from 'react'

export const Hider = ({children, className, show}:{children: React.ReactNode, className?:string, show: boolean}) => {
  return (
    <div 
        className={`${className} transition-all duration-300 ease-in-out`}
        style={{
          gridTemplateRows: show ? '1fr' : '0fr',
          display: 'grid'
        }}
    >
        <div className="overflow-hidden w-full">
            {children}
        </div>
    </div>
  )
}

