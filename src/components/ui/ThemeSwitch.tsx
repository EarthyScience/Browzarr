'use client';

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { BsMoonStarsFill } from "react-icons/bs";
import { BsSunFill } from "react-icons/bs";
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"


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
    <Tooltip>
      <TooltipTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className="size-10 cursor-pointer"
      onClick={toggleTheme} 
      >
        {!mounted ? <BsSunFill className="size-6" /> : current === 'dark' ? <BsMoonStarsFill className="size-6"/> : <BsSunFill className="size-6"/>}
    </Button>
    </TooltipTrigger>
      <TooltipContent side="right" align="start">
        {current === 'dark' ? 
          <span>Switch to Light Mode</span> : 
          <span>Switch to Dark Mode</span>
        }
      </TooltipContent>
    </Tooltip>
  )
}

export default ThemeSwitch