import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  text: string | null;
}

/**
 * Component to render text with Markdown formatting
 * Supports:
 * - Bold text with **word** syntax
 * - Line breaks
 * - Clickable URLs
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text }) => {
  if (!text) return null;
  
  return (
    <ReactMarkdown
      components={{
        a: ({ node, ...props }) => (
          <a 
            {...props} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: 'inherit',
              textDecoration: 'underline'
            }}
          />
        )
      }}
    >
      {text}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer; 