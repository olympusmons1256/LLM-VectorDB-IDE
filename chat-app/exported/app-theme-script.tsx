// app/theme-script.tsx
'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

export function ThemeScript() {
  const { setTheme } = useTheme()

  useEffect(() => {
    // Get theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme')
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    
    setTheme(savedTheme || systemTheme)
  }, [setTheme])

  return null
}