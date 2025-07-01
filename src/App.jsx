import React, {useState, useEffect} from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import {CssBaseline, Box, useMediaQuery, useTheme} from '@mui/material'

// Components
import ChatWindow from './components/ChatWindow'
import InputArea from './components/InputArea'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import {LoginForm} from './components/auth/LoginForm'
import {RegisterForm} from './components/auth/RegisterForm'
import {ProtectedRoute} from './components/auth/ProtectedRoute'
import SkeletonDemo from './components/SkeletonDemo'

// Contexts
import {ThemeProvider} from './context/ThemeContext'
import {ChatProvider} from './context/ChatContext'
import {AuthProvider} from './context/AuthContext'
import {ThreadProvider} from './context/ThreadContext'
import {SearchProvider} from './context/SearchContext'
import {NotificationProvider} from './context/NotificationContext'

/**
 * Main chat layout component
 */
const ChatLayout = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Initialize sidebar as open on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)

  // Update sidebar state when screen size changes
  useEffect(() => {
    // On desktop, default to open; on mobile, default to closed
    setSidebarOpen(!isMobile)
  }, [isMobile])

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleSidebarClose = () => {
    setSidebarOpen(false)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <Header
        onSidebarToggle={handleSidebarToggle}
        isSidebarOpen={sidebarOpen}
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={handleSidebarToggle}
        onClose={handleSidebarClose}
      />

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          marginLeft: {
            xs: 0,
            md: sidebarOpen ? '320px' : 0,
          },
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.easeInOut,
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        <ChatWindow />
        <InputArea />
      </Box>
    </Box>
  )
}

/**
 * Main application component
 */
function App() {
  return (
    <SearchProvider>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <ThreadProvider>
              <ChatProvider>
                <CssBaseline />
                <Router>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<LoginForm />} />
                    <Route path="/register" element={<RegisterForm />} />
                    <Route path="/skeleton-demo" element={<SkeletonDemo />} />

                    {/* Protected routes */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="/chat" element={<ChatLayout />} />
                    </Route>

                    {/* Redirect to chat if authenticated, otherwise to login */}
                    <Route path="*" element={<Navigate to="/chat" />} />
                  </Routes>
                </Router>
              </ChatProvider>
            </ThreadProvider>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </SearchProvider>
  )
}

export default App
