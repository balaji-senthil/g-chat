import React, {useState} from 'react'
import {
  Box,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Paper,
  Stack,
  Divider,
} from '@mui/material'
import {useAppTheme} from '../context/ThemeContext'
import {
  MessageSkeleton,
  TypingSkeleton,
  ThreadSkeleton,
  ThreadListSkeleton,
  ChatHeaderSkeleton,
  SearchBarSkeleton,
  ModelSelectorSkeleton,
  InputAreaSkeleton,
  ChatLoadingSkeleton,
} from './SkeletonLoader'

/**
 * Demo component to showcase all skeleton loading types
 */
function SkeletonDemo() {
  const {isDarkMode, toggleTheme} = useAppTheme()
  const [activeDemo, setActiveDemo] = useState('all')
  const [isSimulatingLoad, setIsSimulatingLoad] = useState(false)

  const demos = [
    {id: 'all', name: 'All Components', component: null},
    {id: 'message', name: 'Message Skeleton', component: MessageSkeleton},
    {id: 'typing', name: 'Typing Skeleton', component: TypingSkeleton},
    {id: 'thread', name: 'Thread Skeleton', component: ThreadSkeleton},
    {
      id: 'threadList',
      name: 'Thread List Skeleton',
      component: ThreadListSkeleton,
    },
    {
      id: 'chatHeader',
      name: 'Chat Header Skeleton',
      component: ChatHeaderSkeleton,
    },
    {
      id: 'searchBar',
      name: 'Search Bar Skeleton',
      component: SearchBarSkeleton,
    },
    {
      id: 'modelSelector',
      name: 'Model Selector Skeleton',
      component: ModelSelectorSkeleton,
    },
    {
      id: 'inputArea',
      name: 'Input Area Skeleton',
      component: InputAreaSkeleton,
    },
    {
      id: 'chatLoading',
      name: 'Chat Loading Skeleton',
      component: ChatLoadingSkeleton,
    },
  ]

  const simulateLoading = (duration = 3000) => {
    setIsSimulatingLoad(true)
    setTimeout(() => {
      setIsSimulatingLoad(false)
    }, duration)
  }

  const renderSingleDemo = component => {
    if (!component) return null

    return (
      <Paper
        sx={{
          p: 3,
          minHeight: '200px',
          backgroundColor: isDarkMode ? '#0d1117' : '#f5f5f5',
        }}
      >
        {React.createElement(component, {count: 3})}
      </Paper>
    )
  }

  const renderAllComponents = () => (
    <Box sx={{display: 'flex', flexDirection: 'column', gap: 3}}>
      {/* Live Chat Simulation */}
      <Paper sx={{p: 3}}>
        <Typography variant="h6" sx={{mb: 2}}>
          Live Chat Simulation
        </Typography>
        <Box
          sx={{
            height: '300px',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: isDarkMode ? '#0d1117' : '#f0f2f5',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <MessageSkeleton isUser={true} />
          {isSimulatingLoad ? (
            <TypingSkeleton />
          ) : (
            <MessageSkeleton isUser={false} />
          )}
          <Typography
            variant="caption"
            sx={{
              textAlign: 'center',
              color: 'text.secondary',
              mt: 1,
              fontStyle: 'italic',
            }}
          >
            {isSimulatingLoad
              ? 'AI is typing... (only typing animation shows)'
              : 'Click simulation buttons above to see typing animation'}
          </Typography>
        </Box>
      </Paper>

      {/* Messages Section */}
      <Paper sx={{p: 3}}>
        <Typography variant="h6" sx={{mb: 2}}>
          Message Skeletons
        </Typography>
        <Stack spacing={1}>
          {isSimulatingLoad ? (
            <>
              <MessageSkeleton isUser={true} />
              <TypingSkeleton />
            </>
          ) : (
            <>
              <MessageSkeleton isUser={true} />
              <MessageSkeleton isUser={false} />
              <TypingSkeleton />
            </>
          )}
        </Stack>
      </Paper>

      {/* Thread List Section */}
      <Paper sx={{p: 3}}>
        <Typography variant="h6" sx={{mb: 2}}>
          Thread List Skeleton
        </Typography>
        <Box sx={{maxHeight: '300px', overflow: 'auto'}}>
          {isSimulatingLoad ? (
            <ThreadListSkeleton count={4} />
          ) : (
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{p: 2, textAlign: 'center'}}
              >
                Click simulation buttons to see loading state
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Header and Controls */}
      <Paper sx={{p: 3}}>
        <Typography variant="h6" sx={{mb: 2}}>
          UI Component Skeletons
        </Typography>
        <Stack spacing={2}>
          {isSimulatingLoad ? (
            <ChatHeaderSkeleton />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Chat Header (click simulation to see skeleton)
            </Typography>
          )}
          <Divider />
          {isSimulatingLoad ? (
            <SearchBarSkeleton />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Search Bar (click simulation to see skeleton)
            </Typography>
          )}
          <Divider />
          <Box sx={{display: 'flex', gap: 2, alignItems: 'center'}}>
            {isSimulatingLoad ? (
              <ModelSelectorSkeleton />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Model Selector (click simulation to see skeleton)
              </Typography>
            )}
          </Box>
          <Divider />
          {isSimulatingLoad ? (
            <InputAreaSkeleton />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Input Area (click simulation to see skeleton)
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* Full Chat Loading */}
      <Paper sx={{p: 3, height: '400px'}}>
        <Typography variant="h6" sx={{mb: 2}}>
          Full Chat Loading Skeleton
        </Typography>
        <Box sx={{height: '350px'}}>
          {isSimulatingLoad ? (
            <ChatLoadingSkeleton />
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Click simulation buttons to see full chat loading
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  )

  return (
    <Box sx={{maxWidth: 1200, mx: 'auto', p: 3}}>
      {/* Header */}
      <Box sx={{mb: 4, textAlign: 'center'}}>
        <Typography variant="h3" sx={{mb: 2, fontWeight: 'bold'}}>
          Skeleton Loading Demo
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{mb: 3}}>
          Enhanced UX with skeleton screens for better perceived performance
        </Typography>

        {/* Controls */}
        <Stack
          direction="row"
          spacing={2}
          sx={{justifyContent: 'center', alignItems: 'center', mb: 3}}
        >
          <FormControlLabel
            control={<Switch checked={isDarkMode} onChange={toggleTheme} />}
            label="Dark Mode"
          />
        </Stack>

        {/* Loading Simulation Controls */}
        <Paper sx={{p: 2, mb: 3, bgcolor: 'background.default'}}>
          <Typography variant="subtitle1" sx={{mb: 2, textAlign: 'center'}}>
            Loading Simulation (to see skeletons in action)
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{justifyContent: 'center', flexWrap: 'wrap', gap: 1}}
          >
            <Button
              variant="outlined"
              size="small"
              onClick={() => simulateLoading(1000)}
              disabled={isSimulatingLoad}
            >
              1 Second
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => simulateLoading(3000)}
              disabled={isSimulatingLoad}
            >
              3 Seconds
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => simulateLoading(5000)}
              disabled={isSimulatingLoad}
            >
              5 Seconds
            </Button>
            {isSimulatingLoad && (
              <Typography
                variant="body2"
                color="primary"
                sx={{alignSelf: 'center'}}
              >
                ⏳ Simulating loading...
              </Typography>
            )}
          </Stack>
        </Paper>

        {/* Demo Selector */}
        <Stack
          direction="row"
          spacing={1}
          sx={{justifyContent: 'center', flexWrap: 'wrap', gap: 1}}
        >
          {demos.map(demo => (
            <Button
              key={demo.id}
              variant={activeDemo === demo.id ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setActiveDemo(demo.id)}
              sx={{textTransform: 'none'}}
            >
              {demo.name}
            </Button>
          ))}
        </Stack>
      </Box>

      {/* Demo Content */}
      <Box>
        {activeDemo === 'all'
          ? renderAllComponents()
          : renderSingleDemo(demos.find(d => d.id === activeDemo)?.component)}
      </Box>

      {/* Info Section */}
      <Paper sx={{p: 3, mt: 4, bgcolor: 'primary.main', color: 'white'}}>
        <Typography variant="h6" sx={{mb: 2}}>
          About Skeleton Loading
        </Typography>
        <Typography variant="body1" sx={{mb: 2}}>
          Skeleton screens are animated placeholders that simulate the layout of
          a website while data is being loaded. They provide several UX
          benefits:
        </Typography>
        <Box component="ul" sx={{pl: 3}}>
          <li>
            <Typography variant="body2">
              Improved perceived performance - users feel the app is faster
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Better user engagement - maintains attention during loading
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Clear loading indication - users know what content is coming
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Reduced uncertainty - no blank screens or confusion
            </Typography>
          </li>
        </Box>
      </Paper>
    </Box>
  )
}

export default SkeletonDemo
