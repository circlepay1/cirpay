'use client'

import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/wagmi-config'
import '@rainbow-me/rainbowkit/styles.css'
import { useState, useEffect } from 'react'

const queryClient = new QueryClient()

const DARK = darkTheme({
  accentColor: '#00C9B1',
  accentColorForeground: 'white',
  borderRadius: 'large',
})

const LIGHT = lightTheme({
  accentColor: '#00A896',
  accentColorForeground: 'white',
  borderRadius: 'large',
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => queryClient)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    // Sync with ThemeProvider's data-theme attribute
    const sync = () => {
      setIsDark(document.documentElement.getAttribute('data-theme') !== 'light')
    }
    sync()
    // Observe html attribute changes
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={client}>
        <RainbowKitProvider theme={isDark ? DARK : LIGHT}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
