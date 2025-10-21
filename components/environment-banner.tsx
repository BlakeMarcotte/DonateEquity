'use client'

import { getEnvironment } from '@/lib/config/environment'

export function EnvironmentBanner() {
  const environment = getEnvironment()
  
  if (environment === 'production') {
    return null
  }

  const styles = {
    development: {
      bg: 'bg-blue-600',
      text: 'DEVELOPMENT',
    },
    staging: {
      bg: 'bg-amber-600',
      text: 'STAGING',
    },
  }

  const config = styles[environment]

  return (
    <div className={`${config.bg} text-white text-xs font-bold py-1 px-3 text-center fixed top-0 left-0 right-0 z-50`}>
      {config.text} ENVIRONMENT
    </div>
  )
}
