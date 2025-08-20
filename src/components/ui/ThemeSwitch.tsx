'use client';

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { BsMoonStarsFill } from "react-icons/bs";
import { BsSunFill } from "react-icons/bs";
import { Button } from "@/components/ui/button"
// import './css/ThemeSwitch.css'

const ThemeSwitch = () => {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()
  
  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }
  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  const current = mounted ? (theme ?? resolvedTheme) : undefined

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-10"
      onClick={toggleTheme} 
      >
        {!mounted ? <BsSunFill className="size-6" /> : current === 'dark' ? <BsMoonStarsFill className="size-6"/> : <BsSunFill className="size-6"/>}
    </Button>
  )
}

export default ThemeSwitch