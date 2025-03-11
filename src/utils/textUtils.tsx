import React from 'react'
import MarkdownRenderer from '../components/common/MarkdownRenderer'

/**
 * Returns a MarkdownRenderer component for the given text
 * This preserves backward compatibility with existing code
 */
export const linkifyText = (text: string | null): React.ReactElement | string => {
  if (!text) return ''
  
  return <MarkdownRenderer text={text} />
} 