import React, {useState, useEffect, useRef} from 'react'
import {
  Box,
  Typography,
  Paper,
  useTheme as useMuiTheme,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Button,
  Fade,
  Avatar,
  Stack,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DoneIcon from '@mui/icons-material/Done'
import RefreshIcon from '@mui/icons-material/Refresh'
import PersonIcon from '@mui/icons-material/Person'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import {useAppTheme} from '../context/ThemeContext'
import {useChatContext} from '../context/ChatContext'
import {useThread} from '../context/ThreadContext'
import {useAuthContext} from '../context/AuthContext'
import MarkdownRenderer from './MarkdownRenderer'
import {useSearch} from '../context/SearchContext'
import SearchBar from './SearchBar'
import {getUserInitials, getUserAvatarColor} from '../utils/userUtils'
import {
  formatDateHeader,
  formatMessageTime,
  getDateKey,
} from '../utils/dateUtils'
import {TypingSkeleton, ChatLoadingSkeleton} from './SkeletonLoader'

/**
 * DateHeader - WhatsApp-style date separator
 */
const DateHeader = ({date, isDarkMode}) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      my: 2,
    }}
  >
    <Paper
      sx={{
        px: 2,
        py: 0.5,
        bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        borderRadius: 3,
        boxShadow: 'none',
        border: isDarkMode
          ? '1px solid rgba(255,255,255,0.1)'
          : '1px solid rgba(0,0,0,0.1)',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
          fontSize: '0.75rem',
          fontWeight: 500,
        }}
      >
        {date}
      </Typography>
    </Paper>
  </Box>
)

/**
 * MessageBubble - WhatsApp-style message bubble with timestamp
 */
const MessageBubble = ({
  message,
  index,
  isLastAiMessage,
  showRegenerateButton,
  isCopied,
  isDarkMode,
  userMsgBgColor,
  aiMsgBgColor,
  handleCopyMessage,
  regenerateResponse,
  globalMatchOffset = 0,
}) => {
  const {user} = useAuthContext()
  const {searchQuery} = useSearch()

  // Check if message has "(stopped)" indicator
  const isStopped = message.text.includes('(stopped)')

  // Format the message text - separate the stop indicator for styling
  let displayText = message.text
  if (isStopped) {
    displayText = message.text.replace(/\s*\(stopped\)$/, '')
  }

  const isUserMessage = message.text.startsWith('You:')

  // Remove "You:" and "AI:" prefixes for cleaner display
  const cleanText = displayText.replace(/^(You:|AI:)\s*/, '')

  // Get time for this message
  const messageTime = formatMessageTime(message.timestamp || new Date())

  // Function to escape special regex characters
  const escapeRegExp = string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // Render message content with search highlighting
  const renderMessageContent = () => {
    if (!searchQuery) {
      return <MarkdownRenderer content={cleanText} />
    }

    const escapedSearchQuery = escapeRegExp(searchQuery)
    const parts = cleanText.split(new RegExp(`(${escapedSearchQuery})`, 'gi'))
    let localMatchIndex = 0

    return (
      <Box sx={{wordBreak: 'break-word'}}>
        {parts.map((part, i) => {
          const isMatch = new RegExp(`^${escapedSearchQuery}$`, 'gi').test(part)

          if (isMatch) {
            const globalMatchIndex = globalMatchOffset + localMatchIndex
            const {currentMatchIndex} = useSearch()
            const isCurrentMatch = globalMatchIndex === currentMatchIndex
            localMatchIndex++

            return (
              <span
                key={i}
                style={{
                  backgroundColor: isCurrentMatch
                    ? isDarkMode
                      ? '#ffd700'
                      : '#ffeb3b'
                    : isDarkMode
                    ? '#ffd70033'
                    : '#ffeb3b66',
                  padding: '0 2px',
                  borderRadius: '2px',
                }}
              >
                {part}
              </span>
            )
          }
          return <MarkdownRenderer key={i} content={part} />
        })}
      </Box>
    )
  }

  return (
    <React.Fragment>
      <Box
        sx={{
          display: 'flex',
          justifyContent: isUserMessage ? 'flex-end' : 'flex-start',
          mb: 0.5,
          mx: 0,
        }}
      >
        <Paper
          sx={{
            p: 1.5,
            maxWidth: '75%',
            minWidth: '120px',
            backgroundColor: isUserMessage ? userMsgBgColor : aiMsgBgColor,
            borderRadius: isUserMessage
              ? '18px 18px 4px 18px'
              : '18px 18px 18px 4px',
            position: 'relative',
            wordBreak: 'break-word',
            boxShadow: isDarkMode
              ? '0 1px 2px rgba(0,0,0,0.3)'
              : '0 1px 2px rgba(0,0,0,0.1)',
            '&:hover .copy-button': {
              opacity: 1,
            },
          }}
          id={`message-${index}`}
          data-testid={`message-${index}`}
        >
          {/* Message Content */}
          <Box className="message-content" sx={{mb: 0.5}}>
            {renderMessageContent()}
            {isStopped && (
              <span
                style={{
                  color: isDarkMode ? '#ff9800' : '#ed6c02',
                  fontStyle: 'italic',
                  fontSize: '0.9em',
                  marginLeft: '8px',
                }}
              >
                (stopped)
              </span>
            )}
          </Box>

          {/* Timestamp and Copy Button */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              mt: 0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                opacity: 0.7,
                mr: 0.5,
                color: isUserMessage
                  ? isDarkMode
                    ? 'rgba(255,255,255,0.8)'
                    : 'rgba(0,0,0,0.6)' // Darker text for user messages in light mode
                  : isDarkMode
                  ? 'rgba(255,255,255,0.7)'
                  : 'rgba(0,0,0,0.6)', // Darker text for AI messages in light mode
              }}
            >
              {messageTime}
            </Typography>

            <IconButton
              className="copy-button"
              size="small"
              onClick={() => handleCopyMessage(message.text, index)}
              sx={{
                opacity: 0,
                transition: 'opacity 0.2s',
                p: 0.25,
                ml: 0.5,
                color: isCopied
                  ? isDarkMode
                    ? '#81c784'
                    : '#4caf50'
                  : isUserMessage
                  ? isDarkMode
                    ? 'rgba(255,255,255,0.5)'
                    : 'rgba(0,0,0,0.5)' // Better contrast for user messages in light mode
                  : isDarkMode
                  ? 'rgba(255,255,255,0.5)'
                  : 'rgba(0,0,0,0.5)', // Better contrast for AI messages in light mode
                '&:hover': {
                  color: isCopied
                    ? isDarkMode
                      ? '#a5d6a7'
                      : '#66bb6a'
                    : isUserMessage
                    ? isDarkMode
                      ? 'rgba(255,255,255,0.8)'
                      : 'rgba(0,0,0,0.7)' // Better hover state for user messages in light mode
                    : isDarkMode
                    ? 'rgba(255,255,255,0.8)'
                    : 'rgba(0,0,0,0.7)', // Better hover state for AI messages in light mode
                },
              }}
            >
              {isCopied ? (
                <DoneIcon sx={{fontSize: '14px'}} />
              ) : (
                <ContentCopyIcon titleAccess="Copy" sx={{fontSize: '14px'}} />
              )}
            </IconButton>
          </Box>
        </Paper>
      </Box>

      {/* Regenerate button for last AI message */}
      {isLastAiMessage && showRegenerateButton && (
        <Fade in={showRegenerateButton} timeout={400}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              mx: 0,
              mb: 1,
            }}
          >
            <Button
              size="small"
              variant="text"
              startIcon={<RefreshIcon fontSize="small" />}
              onClick={regenerateResponse}
              sx={{
                fontSize: '0.75rem',
                color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                textTransform: 'none',
                borderRadius: 3,
                px: 2,
                py: 0.5,
                '&:hover': {
                  color: isDarkMode
                    ? 'rgba(255,255,255,0.8)'
                    : 'rgba(0,0,0,0.7)',
                  bgcolor: isDarkMode
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.04)',
                },
              }}
            >
              Regenerate response
            </Button>
          </Box>
        </Fade>
      )}
    </React.Fragment>
  )
}

/**
 * CopyNotification - Snackbar notification for successful copy
 */
const CopyNotification = ({open, onClose}) => (
  <Snackbar
    open={open}
    autoHideDuration={2000}
    onClose={onClose}
    anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
    data-testid="copy-notification"
  >
    <Alert
      onClose={onClose}
      severity="success"
      variant="filled"
      sx={{width: '100%'}}
    >
      Message copied to clipboard!
    </Alert>
  </Snackbar>
)

/**
 * ChatWindow component - WhatsApp-style chat interface
 */
function ChatWindow() {
  const chatWindowRef = React.useRef(null)
  const muiTheme = useMuiTheme()
  const {isDarkMode} = useAppTheme()
  const {currentMessages, isGenerating, regenerateResponse, lastUserMessage} =
    useChatContext()
  const {selectedThread} = useThread()
  const [copySuccess, setCopySuccess] = useState(false)
  const [showRegenerateButton, setShowRegenerateButton] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState(null)
  const {
    searchQuery,
    setTotalMatches,
    setCurrentMatchIndex,
    currentMatchIndex,
  } = useSearch()

  // Group messages by date and format them
  const groupedMessages = React.useMemo(() => {
    if (!Array.isArray(currentMessages)) {
      return []
    }

    // Format messages and sort by timestamp
    const formattedMessages = currentMessages.map(msg => {
      // Handle various timestamp formats
      let timestamp = msg.timestamp || msg.created_at || Date.now()

      // If timestamp is a string in ISO format, parse it
      if (typeof timestamp === 'string') {
        timestamp = new Date(timestamp)
      }

      // If timestamp is a number (Unix timestamp), convert it
      if (typeof timestamp === 'number') {
        timestamp = new Date(timestamp)
      }

      // Ensure we have a valid Date object
      const dateObject =
        timestamp instanceof Date && !isNaN(timestamp.getTime())
          ? timestamp
          : new Date()

      return {
        text:
          msg.text || `${msg.role === 'user' ? 'You:' : 'AI:'} ${msg.content}`,
        timestamp: dateObject,
        isPartial: msg.isPartial || false,
        model: msg.model,
      }
    })

    // Sort chronologically
    formattedMessages.sort((a, b) => a.timestamp - b.timestamp)

    // Group by date - ensure we use consistent date keys
    const grouped = []
    const seenDateKeys = new Set() // Track date keys to prevent duplicates

    formattedMessages.forEach(message => {
      const dateKey = getDateKey(message.timestamp)

      // Only create a new group if we haven't seen this date key before
      if (!seenDateKeys.has(dateKey)) {
        seenDateKeys.add(dateKey)
        const newGroup = {
          dateKey,
          dateHeader: formatDateHeader(message.timestamp),
          messages: [],
        }
        grouped.push(newGroup)
      }

      // Find the group for this date and add the message
      const targetGroup = grouped.find(group => group.dateKey === dateKey)
      if (targetGroup) {
        targetGroup.messages.push(message)
      }
    })

    return grouped
  }, [currentMessages])

  // Determine if we can show the regenerate button
  useEffect(() => {
    const allMessages = groupedMessages.flatMap(group => group.messages)
    const canShowButton =
      allMessages.length > 0 &&
      allMessages[allMessages.length - 1].text.startsWith('AI:') &&
      !isGenerating &&
      lastUserMessage &&
      !selectedThread

    if (canShowButton) {
      const timer = setTimeout(() => {
        setShowRegenerateButton(true)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setShowRegenerateButton(false)
    }
  }, [groupedMessages, isGenerating, lastUserMessage, selectedThread])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight
    }
  }, [groupedMessages, showRegenerateButton])

  // Update search matches
  useEffect(() => {
    if (!searchQuery) {
      setTotalMatches(0)
      setCurrentMatchIndex(-1)
      return
    }

    const escapeRegExp = string => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    const escapedSearchQuery = escapeRegExp(searchQuery)
    const regex = new RegExp(escapedSearchQuery, 'gi')

    const allMessages = groupedMessages.flatMap(group => group.messages)
    const matches = allMessages.reduce((count, message) => {
      const messageMatches = (message.text.match(regex) || []).length
      return count + messageMatches
    }, 0)

    setTotalMatches(matches)
    setCurrentMatchIndex(matches > 0 ? 0 : -1)
  }, [searchQuery, groupedMessages, setTotalMatches, setCurrentMatchIndex])

  // Handle scroll to search matches
  useEffect(() => {
    if (searchQuery && currentMatchIndex >= 0) {
      const messageElements = document.querySelectorAll('.message-content')
      let currentMatchCount = 0

      const escapeRegExp = string => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      }

      const escapedSearchQuery = escapeRegExp(searchQuery)

      for (const element of messageElements) {
        const text = element.textContent
        const messageMatches =
          text.match(new RegExp(escapedSearchQuery, 'gi')) || []

        if (currentMatchCount + messageMatches.length > currentMatchIndex) {
          element.scrollIntoView({behavior: 'smooth', block: 'center'})
          break
        }

        currentMatchCount += messageMatches.length
      }
    }
  }, [searchQuery, currentMatchIndex])

  // Determine background colors
  const chatBgColor = isDarkMode ? '#0d1117' : '#f0f2f5'
  const userMsgBgColor = isDarkMode ? '#2ea043' : '#dcf8c6'
  const aiMsgBgColor = isDarkMode ? '#21262d' : '#ffffff'

  // Handle copy message
  const handleCopyMessage = (text, index) => {
    const messageContent = text.replace(/^(You:|AI:)/, '').trim()
    const cleanMessage = messageContent.replace(/\s*\(stopped\)$/, '')

    navigator.clipboard.writeText(cleanMessage).then(() => {
      setCopiedMessageId(index)
      setCopySuccess(true)

      setTimeout(() => setCopiedMessageId(null), 1500)
      setTimeout(() => setCopySuccess(false), 2000)
    })
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <SearchBar />
      <Box
        ref={chatWindowRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          bgcolor: chatBgColor,
          display: 'flex',
          flexDirection: 'column',
          transition: 'background-color 0.3s ease',
          position: 'relative',
          zIndex: 1,
          height: '100%',
          px: 2,
          py: 1,
          backgroundImage: isDarkMode
            ? 'none'
            : `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Cpath d='M0 0h20v20H0V0zm20 20h20v20H20V20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        id="chat-window"
        data-testid="chat-window"
      >
        {groupedMessages.length > 0 ? (
          (() => {
            let globalMatchOffset = 0
            let messageIndex = 0

            const allElements = groupedMessages
              .map((group, groupIndex) => {
                const groupElements = []

                // Add date header
                groupElements.push(
                  <DateHeader
                    key={`date-${group.dateKey}`}
                    date={group.dateHeader}
                    isDarkMode={isDarkMode}
                  />,
                )

                // Add messages for this date
                group.messages.forEach(message => {
                  const allMessages = groupedMessages.flatMap(g => g.messages)
                  const isLastAiMessage =
                    message.text.startsWith('AI:') &&
                    messageIndex === allMessages.length - 1
                  const isCopied = copiedMessageId === messageIndex

                  // Calculate match offset
                  const currentGlobalMatchOffset = globalMatchOffset
                  if (searchQuery) {
                    const escapeRegExp = string => {
                      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    }
                    const escapedSearchQuery = escapeRegExp(searchQuery)
                    const messageMatches = (
                      message.text.match(
                        new RegExp(escapedSearchQuery, 'gi'),
                      ) || []
                    ).length
                    globalMatchOffset += messageMatches
                  }

                  groupElements.push(
                    <MessageBubble
                      key={`message-${messageIndex}`}
                      message={message}
                      index={messageIndex}
                      isLastAiMessage={isLastAiMessage}
                      showRegenerateButton={showRegenerateButton}
                      isCopied={isCopied}
                      isDarkMode={isDarkMode}
                      userMsgBgColor={userMsgBgColor}
                      aiMsgBgColor={aiMsgBgColor}
                      handleCopyMessage={handleCopyMessage}
                      regenerateResponse={regenerateResponse}
                      globalMatchOffset={currentGlobalMatchOffset}
                    />,
                  )

                  messageIndex++
                })

                return groupElements
              })
              .flat()

            // Add typing skeleton if AI is generating a response AND no partial AI message exists yet
            const allMessages = groupedMessages.flatMap(g => g.messages)
            const hasPartialAiMessage = allMessages.some(
              msg => msg.text.startsWith('AI:') && msg.isPartial,
            )

            if (isGenerating && !hasPartialAiMessage) {
              allElements.push(<TypingSkeleton key="typing-skeleton" />)
            }

            return allElements
          })()
        ) : isGenerating ? (
          // Show skeleton loading for initial message generation
          <Box sx={{flex: 1, p: 2}}>
            <TypingSkeleton />
          </Box>
        ) : (
          // Empty state
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              opacity: 0.6,
              px: 3,
            }}
          >
            <SmartToyIcon sx={{fontSize: 64, mb: 2, opacity: 0.5}} />
            <Typography variant="h6" sx={{textAlign: 'center', mb: 1}}>
              {selectedThread
                ? `Start chatting in "${selectedThread.title}"`
                : 'No messages yet'}
            </Typography>
            <Typography
              variant="body2"
              sx={{textAlign: 'center', opacity: 0.8}}
            >
              {selectedThread
                ? 'Send a message to begin the conversation'
                : 'Choose a conversation from the sidebar or start a new one'}
            </Typography>
          </Box>
        )}

        <CopyNotification
          open={copySuccess}
          onClose={() => setCopySuccess(false)}
        />
      </Box>
    </Box>
  )
}

export default ChatWindow
