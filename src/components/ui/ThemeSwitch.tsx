'use client';

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from "lucide-react"
import './css/ThemeSwitch.css'
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
    <button onClick={toggleTheme} className="toggle">
      {!mounted ? <Sun /> : current === 'dark' ? <Moon size={32}/> : <Sun size={32}/>}
    </button>
  )
}

export default ThemeSwitch