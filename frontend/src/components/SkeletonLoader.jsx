import React from 'react'
import {
  Box,
  Paper,
  Stack,
  useTheme as useMuiTheme,
  keyframes,
} from '@mui/material'
import {useAppTheme} from '../context/ThemeContext'

// Skeleton animation keyframes
const skeletonAnimation = keyframes`
  0% {
    background-color: rgba(165, 165, 165, 0.1);
  }
  50% {
    background-color: rgba(165, 165, 165, 0.3);
  }
  100% {
    background-color: rgba(165, 165, 165, 0.1);
  }
`

const darkSkeletonAnimation = keyframes`
  0% {
    background-color: rgba(255, 255, 255, 0.1);
  }
  50% {
    background-color: rgba(255, 255, 255, 0.2);
  }
  100% {
    background-color: rgba(255, 255, 255, 0.1);
  }
`

/**
 * Base Skeleton component with animation
 */
const Skeleton = ({
  width = '100%',
  height = '1rem',
  borderRadius = '4px',
  sx = {},
  ...props
}) => {
  const {isDarkMode} = useAppTheme()

  return (
    <Box
      sx={{
        width,
        height,
        borderRadius,
        animation: `${
          isDarkMode ? darkSkeletonAnimation : skeletonAnimation
        } 1.5s ease-in-out infinite`,
        ...sx,
      }}
      {...props}
    />
  )
}

/**
 * Message Skeleton - Simulates AI message loading
 */
export const MessageSkeleton = ({isUser = false}) => {
  const {isDarkMode} = useAppTheme()

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 0.5,
        mx: 0,
      }}
    >
      <Paper
        sx={{
          p: 1.5,
          maxWidth: '75%',
          minWidth: '200px',
          backgroundColor: isUser
            ? isDarkMode
              ? 'rgba(46, 160, 67, 0.3)'
              : 'rgba(220, 248, 198, 0.5)'
            : isDarkMode
            ? 'rgba(33, 38, 45, 0.5)'
            : 'rgba(255, 255, 255, 0.8)',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          border: isDarkMode
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: isDarkMode
            ? '0 1px 2px rgba(0,0,0,0.3)'
            : '0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        <Stack spacing={1}>
          {/* Message content lines */}
          <Skeleton height="14px" width="90%" />
          <Skeleton height="14px" width="75%" />
          <Skeleton height="14px" width="60%" />
          <Box sx={{display: 'flex', justifyContent: 'flex-end', mt: 1}}>
            <Skeleton height="10px" width="60px" />
          </Box>
        </Stack>
      </Paper>
    </Box>
  )
}

/**
 * Typing Indicator Skeleton - Shows when AI is actively typing
 */
export const TypingSkeleton = () => {
  const {isDarkMode} = useAppTheme()

  const dotAnimation = keyframes`
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    30% {
      transform: translateY(-10px);
      opacity: 1;
    }
  `

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-start',
        mb: 0.5,
        mx: 0,
      }}
    >
      <Paper
        sx={{
          p: 1.5,
          minWidth: '80px',
          backgroundColor: isDarkMode ? '#21262d' : '#ffffff',
          borderRadius: '18px 18px 18px 4px',
          border: isDarkMode
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: isDarkMode
            ? '0 1px 2px rgba(0,0,0,0.3)'
            : '0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {[0, 1, 2].map(i => (
            <Box
              key={i}
              sx={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isDarkMode ? '#ffffff' : '#000000',
                opacity: 0.4,
                animation: `${dotAnimation} 1.4s infinite ease-in-out`,
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </Box>
      </Paper>
    </Box>
  )
}

/**
 * Thread Item Skeleton - For loading threads in sidebar
 */
export const ThreadSkeleton = () => {
  const {isDarkMode} = useAppTheme()

  return (
    <Box
      sx={{
        p: 2,
        borderBottom: isDarkMode
          ? '1px solid rgba(255, 255, 255, 0.1)'
          : '1px solid rgba(0, 0, 0, 0.1)',
      }}
    >
      <Stack spacing={1}>
        <Skeleton height="16px" width="80%" />
        <Skeleton height="12px" width="60%" />
        <Box sx={{display: 'flex', justifyContent: 'space-between', mt: 1}}>
          <Skeleton height="10px" width="40px" />
          <Skeleton height="20px" width="60px" borderRadius="12px" />
        </Box>
      </Stack>
    </Box>
  )
}

/**
 * Thread List Skeleton - Multiple thread skeletons
 */
export const ThreadListSkeleton = ({count = 5}) => {
  return (
    <Box>
      {Array.from({length: count}).map((_, index) => (
        <ThreadSkeleton key={index} />
      ))}
    </Box>
  )
}

/**
 * Chat Header Skeleton - For loading states in header
 */
export const ChatHeaderSkeleton = () => {
  const {isDarkMode} = useAppTheme()

  return (
    <Box
      sx={{
        p: 2,
        borderBottom: isDarkMode
          ? '1px solid rgba(255, 255, 255, 0.1)'
          : '1px solid rgba(0, 0, 0, 0.1)',
      }}
    >
      <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
        <Skeleton width="40px" height="40px" borderRadius="50%" />
        <Box sx={{flex: 1}}>
          <Skeleton height="16px" width="60%" />
          <Skeleton height="12px" width="40%" sx={{mt: 0.5}} />
        </Box>
        <Skeleton width="80px" height="32px" borderRadius="16px" />
      </Box>
    </Box>
  )
}

/**
 * Search Bar Skeleton
 */
export const SearchBarSkeleton = () => {
  return (
    <Box sx={{p: 2}}>
      <Skeleton height="40px" borderRadius="20px" />
    </Box>
  )
}

/**
 * Model Selector Skeleton
 */
export const ModelSelectorSkeleton = () => {
  return (
    <Box sx={{p: 1}}>
      <Skeleton height="36px" width="200px" borderRadius="8px" />
    </Box>
  )
}

/**
 * Input Area Skeleton
 */
export const InputAreaSkeleton = () => {
  return (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        gap: 1,
        alignItems: 'flex-end',
      }}
    >
      <Box sx={{flex: 1}}>
        <Skeleton height="56px" borderRadius="28px" />
      </Box>
      <Skeleton width="56px" height="56px" borderRadius="50%" />
    </Box>
  )
}

/**
 * Full Chat Loading Skeleton - Combines multiple skeletons for complete loading state
 */
export const ChatLoadingSkeleton = () => {
  return (
    <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <SearchBarSkeleton />
      <Box sx={{flex: 1, p: 2}}>
        <Stack spacing={2}>
          <MessageSkeleton isUser={true} />
          <MessageSkeleton isUser={false} />
          <MessageSkeleton isUser={true} />
          <TypingSkeleton />
        </Stack>
      </Box>
    </Box>
  )
}

export default Skeleton
