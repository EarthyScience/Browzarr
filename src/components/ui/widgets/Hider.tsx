import React from 'react'

const Hider = ({children, className, show}:{children: React.ReactNode, className?:string, show: boolean}) => {
  return (
    <div 
        className={`${className} grid transition-all duration-300 ease-in-out`}
        style={{
        gridTemplateRows: show ? '1fr' : '0fr',
        }}
    >
        <div className="overflow-hidden">
            {children}
        </div>
    </div>
  )
}

export {Hider}
