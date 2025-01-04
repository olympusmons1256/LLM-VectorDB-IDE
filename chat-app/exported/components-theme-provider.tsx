'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes/dist/types'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    try {
      // Delay mounting slightly to ensure DOM is ready
      const timer = setTimeout(() => {
        setMounted(true)
      }, 0)
      return () => clearTimeout(timer)
    } catch (e) {
      console.error('Theme provider mount error:', e)
      setError(e as Error)
    }
  }, [])

  // If there's an error, render children without theme provider
  if (error) {
    console.error('Theme provider disabled due to error:', error)
    return <>{children}</>
  }

  // Don't render provider until mounted
  if (!mounted) {
    return <>{children}</>
  }

  // Wrap provider in error boundary
  try {
    return (
      <NextThemesProvider {...props}>
        {children}
      </NextThemesProvider>
    )
  } catch (e) {
    console.error('Theme provider render error:', e)
    return <>{children}</>
  }
}