import React, {useState} from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Box,
  useTheme,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DoneIcon from '@mui/icons-material/Done'
import {useAppTheme} from '../context/ThemeContext'
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import {tomorrow, prism} from 'react-syntax-highlighter/dist/esm/styles/prism'

/**
 * Component for rendering markdown content with syntax highlighting
 * @param {Object} props - Component props
 * @param {string} props.content - Markdown content to render
 * @returns {JSX.Element}
 */
const MarkdownRenderer = ({content}) => {
  const theme = useTheme()
  const {isDarkMode} = useAppTheme()
  const [copiedCodeBlocks, setCopiedCodeBlocks] = useState(new Set())
  const [showCopySuccess, setShowCopySuccess] = useState(false)

  // Select appropriate code highlighting theme based on dark/light mode
  const codeStyle = isDarkMode ? tomorrow : prism

  // Function to copy code to clipboard
  const copyCodeToClipboard = async (code, blockId) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCodeBlocks(prev => new Set(prev).add(blockId))
      setShowCopySuccess(true)

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedCodeBlocks(prev => {
          const newSet = new Set(prev)
          newSet.delete(blockId)
          return newSet
        })
      }, 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  return (
    <>
      <Box
        sx={{
          '& p': {
            margin: '8px 0',
          },
          '& a': {
            color: theme.palette.primary.main,
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            },
          },
          '& code:not([class*="language-"])': {
            backgroundColor: isDarkMode
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.05)',
            padding: '2px 4px',
            borderRadius: '3px',
            fontFamily: '"Roboto Mono", monospace',
            fontSize: '0.85em',
          },
          '& h1, & h2, & h3, & h4, & h5, & h6': {
            margin: '16px 0 8px 0',
            fontWeight: 500,
            lineHeight: 1.2,
          },
          '& h1': {fontSize: '1.5em'},
          '& h2': {fontSize: '1.3em'},
          '& h3': {fontSize: '1.2em'},
          '& h4': {fontSize: '1.1em'},
          '& h5, & h6': {fontSize: '1em'},
          '& ul, & ol': {
            paddingLeft: '20px',
            margin: '8px 0',
          },
          '& li': {
            margin: '4px 0',
          },
          '& blockquote': {
            borderLeft: `3px solid ${theme.palette.primary.main}`,
            margin: '8px 0',
            padding: '0 16px',
            color: theme.palette.text.secondary,
          },
          '& img': {
            maxWidth: '100%',
            height: 'auto',
          },
          '& hr': {
            border: 0,
            height: '1px',
            backgroundColor: theme.palette.divider,
            margin: '16px 0',
          },
          '& table': {
            borderCollapse: 'collapse',
            width: '100%',
            margin: '16px 0',
          },
          '& th, & td': {
            border: `1px solid ${theme.palette.divider}`,
            padding: '8px',
            textAlign: 'left',
          },
          '& th': {
            backgroundColor: isDarkMode
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.04)',
          },
          '& pre': {
            margin: '16px 0',
            borderRadius: '4px',
            overflow: 'auto',
            backgroundColor: 'transparent !important',
          },
          // Styles for code block container
          '& .code-block-container': {
            margin: '16px 0',
            borderRadius: '6px',
            backgroundColor: isDarkMode ? '#2d2d2d' : '#f6f8fa',
            border: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            '&:hover .copy-code-button': {
              opacity: 1,
            },
          },
          '& .code-block-header': {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: isDarkMode
              ? 'rgba(0, 0, 0, 0.2)'
              : 'rgba(0, 0, 0, 0.03)',
            borderBottom: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.1)',
            minHeight: '36px',
          },
          '& .code-language-label': {
            fontSize: '12px',
            fontFamily: '"Roboto Mono", monospace',
            fontWeight: 500,
            textTransform: 'lowercase',
            color: isDarkMode
              ? 'rgba(255, 255, 255, 0.8)'
              : 'rgba(0, 0, 0, 0.8)',
            userSelect: 'none',
          },
          '& .copy-code-button': {
            opacity: 0,
            transition: 'all 0.2s ease-in-out',
            backgroundColor: isDarkMode
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.1)',
            color: isDarkMode
              ? 'rgba(255, 255, 255, 0.8)'
              : 'rgba(0, 0, 0, 0.8)',
            padding: '4px',
            minWidth: 'auto',
            width: '28px',
            height: '28px',
            '&:hover': {
              backgroundColor: isDarkMode
                ? 'rgba(255, 255, 255, 0.2)'
                : 'rgba(0, 0, 0, 0.2)',
              transform: 'scale(1.05)',
            },
            '&.copied': {
              opacity: 1,
            },
          },
          '& .code-content': {
            '& pre': {
              margin: '0 !important',
              padding: '16px !important',
              backgroundColor: 'transparent !important',
              borderRadius: '0 !important',
            },
          },
        }}
        id="markdown-container"
        data-testid="markdown-container"
      >
        <ReactMarkdown
          components={{
            code({node, inline, className, children, ...props}) {
              const match = /language-(\w+)/.exec(className || '')
              const code = String(children).replace(/\n$/, '')

              if (!inline && match) {
                // Generate a stable unique ID for this code block based on content
                const blockId = `code-${code.slice(0, 50).replace(/\W/g, '')}-${
                  code.length
                }`
                const isCopied = copiedCodeBlocks.has(blockId)

                return (
                  <div className="code-block-container">
                    <div className="code-block-header">
                      <div className="code-language-label">{match[1]}</div>
                      <Tooltip title={isCopied ? 'Copied!' : 'Copy code'}>
                        <IconButton
                          className={`copy-code-button ${
                            isCopied ? 'copied' : ''
                          }`}
                          size="small"
                          onClick={() => copyCodeToClipboard(code, blockId)}
                          sx={{
                            color: isCopied
                              ? isDarkMode
                                ? '#81c784 !important'
                                : '#4caf50 !important'
                              : 'inherit',
                            backgroundColor: isCopied
                              ? isDarkMode
                                ? 'rgba(129, 199, 132, 0.2) !important'
                                : 'rgba(76, 175, 80, 0.2) !important'
                              : undefined,
                          }}
                        >
                          {isCopied ? (
                            <DoneIcon sx={{fontSize: '14px'}} />
                          ) : (
                            <ContentCopyIcon sx={{fontSize: '14px'}} />
                          )}
                        </IconButton>
                      </Tooltip>
                    </div>
                    <div className="code-content">
                      <SyntaxHighlighter
                        style={codeStyle}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {code}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                )
              }

              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </Box>

      {/* Success notification */}
      <Snackbar
        open={showCopySuccess}
        autoHideDuration={2000}
        onClose={() => setShowCopySuccess(false)}
        anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
      >
        <Alert
          onClose={() => setShowCopySuccess(false)}
          severity="success"
          variant="filled"
          sx={{width: '100%'}}
        >
          Code copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  )
}

export default MarkdownRenderer
