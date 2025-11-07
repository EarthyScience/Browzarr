import React from 'react'

const Hider = ({children, show}:{children: React.ReactNode, show: boolean}) => {
  return (
    <div 
        className="grid transition-all duration-300 ease-in-out"
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

export default Hider
