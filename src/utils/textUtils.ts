import React from 'react'

export const linkifyText = (text: string | null) => {
  if (!text) return ''
  
  // Regex for matching URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g
  
  // Split text into parts and map URLs to anchor tags
  const parts = text.split(urlRegex)
  
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return React.createElement('a', {
        key: i,
        href: part,
        target: '_blank',
        rel: 'noopener noreferrer',
        style: { 
          color: 'inherit',
          textDecoration: 'underline'
        }
      }, part)
    }
    return part
  })
} 