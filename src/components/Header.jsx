import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  Tooltip,
} from '@mui/material'
import React, {useState, useEffect} from 'react'
import MenuIcon from '@mui/icons-material/Menu'
import ThemeToggle from './ThemeToggle'
import {useAuthContext} from '../context/AuthContext'
import {useNavigate} from 'react-router-dom'
import SearchIcon from '@mui/icons-material/Search'
import {useSearch} from '../context/SearchContext'
import {useThread} from '../context/ThreadContext'

/**
 * SidebarToggle component - Button to toggle sidebar
 */
const SidebarToggle = ({onToggle}) => {
  return (
    <Tooltip title="Toggle sidebar">
      <IconButton
        onClick={onToggle}
        size="medium"
        edge="start"
        sx={{
          mr: 2,
          color: 'inherit',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
        data-testid="sidebar-toggle"
      >
        <MenuIcon />
      </IconButton>
    </Tooltip>
  )
}

/**
 * AppTitle component - Displays the application title
 */
const AppTitle = () => (
  <Typography
    variant="h6"
    component="div"
    sx={{flexGrow: 1}}
    id="app-title"
    data-testid="app-title"
  >
    AI Chat App
  </Typography>
)

/**
 * UserMenu component - Displays the user's information and provides logout functionality
 */
const UserMenu = () => {
  const {user, logout} = useAuthContext()
  const navigate = useNavigate()

  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)

  const handleClick = event => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleClose()
    logout()
    navigate('/login')
  }

  // Format the user's initials for the avatar
  const getInitials = name => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div>
      <IconButton
        onClick={handleClick}
        size="small"
        aria-controls={open ? 'user-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        data-testid="user-avatar"
      >
        <Avatar sx={{width: 32, height: 32, bgcolor: 'primary.main'}}>
          {getInitials(user?.name)}
        </Avatar>
      </IconButton>
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'user-button',
        }}
      >
        <Box sx={{px: 2, py: 1}}>
          <Typography variant="subtitle1" fontWeight="bold">
            {user?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleLogout} data-testid="logout-button">
          Logout
        </MenuItem>
      </Menu>
    </div>
  )
}

/**
 * SearchButton component - Button to toggle search functionality
 */
const SearchButton = () => {
  const {setIsSearchOpen} = useSearch()
  const {selectedThread} = useThread()

  const handleSearchClick = () => {
    if (!selectedThread) {
      return // Don't open search if no thread is selected
    }
    setIsSearchOpen(true)
  }

  useEffect(() => {
    const handleKeyDown = e => {
      // Alt+F or Option+F to open search, but only if a thread is selected
      if ((e.altKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        if (selectedThread) {
          setIsSearchOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setIsSearchOpen, selectedThread])

  return (
    <Tooltip
      title={
        selectedThread
          ? 'Search messages (Alt+F)'
          : 'Select a topic to search messages'
      }
    >
      <span>
        <IconButton
          onClick={handleSearchClick}
          size="small"
          disabled={!selectedThread}
          sx={{
            color: 'inherit',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
            '&:disabled': {
              color: 'rgba(255, 255, 255, 0.3)',
            },
          }}
        >
          <SearchIcon />
        </IconButton>
      </span>
    </Tooltip>
  )
}

/**
 * HeaderControls component - Contains all header control buttons
 * Only shown when sidebar is closed to avoid redundancy
 */
const HeaderControls = ({isSidebarOpen}) => {
  const {isAuthenticated} = useAuthContext()

  // Don't show header controls when sidebar is open to avoid redundancy
  if (isSidebarOpen) {
    return null
  }

  return (
    <Box
      sx={{display: 'flex', alignItems: 'center', gap: 2}}
      id="header-controls"
      data-testid="header-controls"
    >
      {isAuthenticated && <SearchButton />}
      <ThemeToggle />
      {isAuthenticated && <UserMenu />}
    </Box>
  )
}

/**
 * Header component - The application's top navigation bar
 */
function Header({onSidebarToggle, isSidebarOpen}) {
  const {isAuthenticated} = useAuthContext()

  return (
    <AppBar
      position="static"
      sx={{width: '100%'}}
      id="main-header"
      data-testid="main-header"
    >
      <Toolbar
        sx={{width: '100%', display: 'flex'}}
        id="header-toolbar"
        data-testid="header-toolbar"
      >
        <SidebarToggle onToggle={onSidebarToggle} />
        <AppTitle />
        <HeaderControls isSidebarOpen={isSidebarOpen} />
      </Toolbar>
    </AppBar>
  )
}

export default Header
