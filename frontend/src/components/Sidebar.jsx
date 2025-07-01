import React, {useState, useEffect, useRef, useCallback} from 'react'
import {
  Box,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Fade,
  Collapse,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  alpha,
  CircularProgress,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Search as SearchIcon,
  ChatBubbleOutline as ChatIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  SettingsBrightness as SystemModeIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
} from '@mui/icons-material'
import {useThread} from '../context/ThreadContext'
import {useAuthContext as useAuth} from '../context/AuthContext'
import {useAppTheme} from '../context/ThemeContext'
import {themes} from '../context/ThemeContext'
import {useSearch} from '../context/SearchContext'
import {formatThreadTimestamp} from '../utils/dateUtils'

const Sidebar = ({isOpen, onToggle, onClose}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const {themePreference, setThemePreference, isDarkMode} = useAppTheme()
  const {user, logout} = useAuth()
  const {setIsSearchOpen} = useSearch()
  const {
    threads,
    selectedThread,
    fetchThreads,
    createNewThread,
    selectThread,
    deleteThread,
    renameThread,
    messagesByThreadId,
    isLoadingThreads,
    isLoadingMessagesForThread,
  } = useThread()

  // State management
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllConversations, setShowAllConversations] = useState(false)
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [showNewThreadForm, setShowNewThreadForm] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [threadToDelete, setThreadToDelete] = useState(null)
  const [threadToRename, setThreadToRename] = useState(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState(null)
  const [threadMenuAnchor, setThreadMenuAnchor] = useState(null)
  const [selectedThreadForMenu, setSelectedThreadForMenu] = useState(null)

  const sidebarRef = useRef(null)

  // Fetch threads on mount
  useEffect(() => {
    fetchThreads()
  }, [])

  // Format the user's initials for the avatar (same logic as header)
  const getInitials = name => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  // Filter and sort conversations
  const filteredThreads = threads
    .filter(thread =>
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))

  // Generate a smart preview for a thread
  const getThreadPreview = useCallback(
    thread => {
      // Use the preview data from the API if available
      if (thread.last_message_content) {
        const content = thread.last_message_content.trim()
        const truncated =
          content.length > 60 ? `${content.substring(0, 60)}...` : content
        return truncated
      }

      // If no preview data from API, fall back to the old approach
      const messages = messagesByThreadId[thread.id] || []
      const messageCount = messages.length

      // Show loading state if messages are being loaded and we don't have messages yet
      if (isLoadingMessagesForThread(thread.id) && messageCount === 0) {
        return 'Loading messages...'
      }

      if (messageCount === 0) {
        return 'No messages yet • Tap to start chatting'
      }

      // Get the last message
      const lastMessage = messages[messages.length - 1]
      if (lastMessage) {
        const content = lastMessage.content || lastMessage.text || ''
        const isUserMessage =
          lastMessage.role === 'user' || content.startsWith('You:')
        const cleanContent = content.replace(/^(You:|AI:)\s*/, '').trim()

        // Truncate message content
        const truncated =
          cleanContent.length > 35
            ? cleanContent.substring(0, 35) + '...'
            : cleanContent

        // Format based on message type
        if (isUserMessage) {
          return messageCount === 1 ? `You: ${truncated}` : `You: ${truncated}`
        } else {
          return truncated || 'AI response'
        }
      }

      // Fallback with message count
      return messageCount === 1
        ? '1 message • Tap to view'
        : `${messageCount} messages • Tap to continue`
    },
    [messagesByThreadId, isLoadingMessagesForThread],
  )

  // Show only recent conversations by default (limit to 10)
  const recentThreads = showAllConversations
    ? filteredThreads
    : filteredThreads.slice(0, 10)

  // Handle clicking outside sidebar to close it - only on mobile
  useEffect(() => {
    // Only enable click-outside-to-close on mobile devices
    if (!isMobile) return

    const handleClickOutside = event => {
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, isMobile])

  const handleThreadSelect = async thread => {
    await selectThread(thread)
    // Only close sidebar after selection on mobile
    if (isMobile) {
      onClose()
    }
  }

  const handleCreateThread = async () => {
    if (newThreadTitle.trim()) {
      await createNewThread(newThreadTitle.trim())
      setNewThreadTitle('')
      setShowNewThreadForm(false)
    }
  }

  const handleDeleteThread = async () => {
    if (threadToDelete) {
      await deleteThread(threadToDelete.id)
      setDeleteDialogOpen(false)
      setThreadToDelete(null)
    }
  }

  const handleRenameThread = async () => {
    if (threadToRename && renameTitle.trim()) {
      await renameThread(threadToRename.id, renameTitle.trim())
      setRenameDialogOpen(false)
      setThreadToRename(null)
      setRenameTitle('')
    }
  }

  const openThreadMenu = (event, thread) => {
    event.stopPropagation()
    setThreadMenuAnchor(event.currentTarget)
    setSelectedThreadForMenu(thread)
  }

  const closeThreadMenu = () => {
    setThreadMenuAnchor(null)
    setSelectedThreadForMenu(null)
  }

  const openDeleteDialog = () => {
    setThreadToDelete(selectedThreadForMenu)
    setDeleteDialogOpen(true)
    closeThreadMenu()
  }

  const openRenameDialog = () => {
    setThreadToRename(selectedThreadForMenu)
    setRenameTitle(selectedThreadForMenu?.title || '')
    setRenameDialogOpen(true)
    closeThreadMenu()
  }

  const handleSettingsClick = event => {
    setSettingsMenuAnchor(event.currentTarget)
  }

  const closeSettingsMenu = () => {
    setSettingsMenuAnchor(null)
  }

  const handleLogout = () => {
    logout()
    closeSettingsMenu()
  }

  const handleSearchClick = () => {
    if (!selectedThread) {
      return // Don't open search if no thread is selected
    }
    setIsSearchOpen(true)
  }

  // Theme change handlers for all three options
  const handleThemeChange = newTheme => {
    setThemePreference(newTheme)
    closeSettingsMenu()
  }

  // Get theme icon and label
  const getThemeInfo = () => {
    switch (themePreference) {
      case themes.LIGHT:
        return {icon: <LightModeIcon fontSize="small" />, label: 'Light mode'}
      case themes.DARK:
        return {icon: <DarkModeIcon fontSize="small" />, label: 'Dark mode'}
      case themes.SYSTEM:
      default:
        return {icon: <SystemModeIcon fontSize="small" />, label: 'System mode'}
    }
  }

  const currentTheme = getThemeInfo()

  return (
    <>
      {/* Backdrop for mobile */}
      <Fade in={isOpen}>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1200,
            display: {xs: 'block', md: 'none'},
          }}
          onClick={onClose}
        />
      </Fade>

      {/* Sidebar */}
      <Fade in={isOpen} timeout={200}>
        <Box
          ref={sidebarRef}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            width: {xs: '280px', md: '320px'},
            backgroundColor: theme.palette.background.paper,
            borderRight: `1px solid ${theme.palette.divider}`,
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: {
              xs: theme.shadows[8],
              md: 'none',
            },
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: theme.transitions.create('transform', {
              easing: theme.transitions.easing.easeInOut,
              duration: theme.transitions.duration.standard,
            }),
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="h6" sx={{fontWeight: 'bold'}}>
              AI Chat
            </Typography>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
              {/* Search button - now in sidebar */}
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
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'text.primary',
                        backgroundColor: 'action.hover',
                      },
                      '&:disabled': {
                        color: 'action.disabled',
                      },
                    }}
                  >
                    <SearchIcon />
                  </IconButton>
                </span>
              </Tooltip>
              {/* Collapse button - always visible */}
              <Tooltip title="Collapse sidebar">
                <IconButton
                  onClick={onClose}
                  size="small"
                  sx={{
                    color: 'text.secondary',
                    '&:hover': {
                      color: 'text.primary',
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* New Chat Button */}
          <Box sx={{p: 2}}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowNewThreadForm(!showNewThreadForm)}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              New Chat
            </Button>
          </Box>

          {/* New Thread Form */}
          <Collapse in={showNewThreadForm}>
            <Box sx={{px: 2, pb: 2}}>
              <TextField
                fullWidth
                size="small"
                placeholder="Chat title..."
                value={newThreadTitle}
                onChange={e => setNewThreadTitle(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleCreateThread()}
                sx={{mb: 1}}
              />
              <Box sx={{display: 'flex', gap: 1}}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleCreateThread}
                  disabled={!newThreadTitle.trim()}
                >
                  Create
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setShowNewThreadForm(false)
                    setNewThreadTitle('')
                  }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          </Collapse>

          {/* Search */}
          <Box sx={{px: 2, pb: 2}}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>

          {/* Conversations List */}
          <Box sx={{flex: 1, overflowY: 'auto', px: 1}}>
            <List dense>
              {recentThreads.map(thread => (
                <ListItem key={thread.id} disablePadding sx={{mb: 0.5}}>
                  <ListItemButton
                    selected={selectedThread?.id === thread.id}
                    onClick={() => handleThreadSelect(thread)}
                    sx={{
                      borderRadius: 2,
                      py: 1.5,
                      px: 1,
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        '&:hover': {
                          backgroundColor: alpha(
                            theme.palette.primary.main,
                            0.15,
                          ),
                        },
                      },
                      '&:hover': {
                        backgroundColor: alpha(
                          theme.palette.action.hover,
                          0.04,
                        ),
                      },
                    }}
                  >
                    {/* Chat Room Avatar */}
                    <Box sx={{mr: 1.5, flexShrink: 0}}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor:
                            selectedThread?.id === thread.id
                              ? alpha(theme.palette.primary.main, 0.2)
                              : alpha(theme.palette.primary.main, 0.1),
                          border: `2px solid ${alpha(
                            theme.palette.primary.main,
                            selectedThread?.id === thread.id ? 0.3 : 0.2,
                          )}`,
                          transition: 'all 0.2s ease-in-out',
                        }}
                      >
                        <ChatIcon
                          sx={{
                            fontSize: 20,
                            color:
                              selectedThread?.id === thread.id
                                ? theme.palette.primary.main
                                : alpha(theme.palette.primary.main, 0.8),
                            transition: 'color 0.2s ease-in-out',
                          }}
                        />
                      </Avatar>
                    </Box>

                    {/* Chat Content */}
                    <Box sx={{flex: 1, minWidth: 0, mr: 1}}>
                      {/* Thread Title and Timestamp Row */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 0.3,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight:
                              selectedThread?.id === thread.id ? 700 : 600,
                            fontSize: '0.9rem',
                            color: theme.palette.text.primary,
                            noWrap: true,
                            flex: 1,
                            mr: 1,
                            transition: 'font-weight 0.2s ease-in-out',
                          }}
                        >
                          {thread.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.72rem',
                            color:
                              selectedThread?.id === thread.id
                                ? theme.palette.primary.main
                                : theme.palette.text.secondary,
                            flexShrink: 0,
                            fontWeight: 500,
                            transition: 'color 0.2s ease-in-out',
                          }}
                        >
                          {formatThreadTimestamp(
                            thread.last_message_timestamp ||
                              thread.updated_at ||
                              thread.created_at,
                          )}
                        </Typography>
                      </Box>

                      {/* Last Message Preview */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.78rem',
                            color: alpha(theme.palette.text.secondary, 0.85),
                            noWrap: true,
                            fontStyle: 'normal',
                            opacity:
                              selectedThread?.id === thread.id ? 0.9 : 0.75,
                            transition: 'opacity 0.2s ease-in-out',
                            flex: 1,
                            mr: 1,
                          }}
                        >
                          {getThreadPreview(thread)}
                        </Typography>

                        {/* Loading indicator for messages */}
                        {isLoadingMessagesForThread(thread.id) && (
                          <CircularProgress
                            size={12}
                            thickness={4}
                            sx={{
                              color: alpha(theme.palette.primary.main, 0.6),
                              flexShrink: 0,
                              mr: 0.5,
                            }}
                          />
                        )}

                        {/* Unread indicator placeholder - can be enhanced later */}
                        {false && ( // Set to true when unread logic is implemented
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: theme.palette.primary.main,
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </Box>
                    </Box>

                    {/* Menu Button */}
                    <IconButton
                      size="small"
                      onClick={e => openThreadMenu(e, thread)}
                      sx={{
                        ml: 1,
                        opacity: 0.6,
                        '&:hover': {opacity: 1},
                        flexShrink: 0,
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            {/* Show More/Less Conversations */}
            {filteredThreads.length > 10 && (
              <Box sx={{px: 1, py: 1}}>
                <Button
                  fullWidth
                  size="small"
                  onClick={() => setShowAllConversations(!showAllConversations)}
                  endIcon={
                    showAllConversations ? <ArrowUpIcon /> : <ArrowDownIcon />
                  }
                  sx={{
                    textTransform: 'none',
                    color: theme.palette.text.secondary,
                  }}
                >
                  {showAllConversations
                    ? 'Show less'
                    : `Show ${filteredThreads.length - 10} more`}
                </Button>
              </Box>
            )}
          </Box>

          {/* Bottom Section */}
          <Box>
            <Divider />
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                <Avatar sx={{width: 32, height: 32, bgcolor: 'primary.main'}}>
                  {getInitials(user?.name || user?.username)}
                </Avatar>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{fontWeight: 500, lineHeight: 1.2}}
                  >
                    {user?.name || user?.username || 'User'}
                  </Typography>
                  {user?.email && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{lineHeight: 1}}
                    >
                      {user.email}
                    </Typography>
                  )}
                </Box>
              </Box>
              <IconButton onClick={handleSettingsClick} size="small">
                <SettingsIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Fade>

      {/* Thread Menu */}
      <Menu
        anchorEl={threadMenuAnchor}
        open={Boolean(threadMenuAnchor)}
        onClose={closeThreadMenu}
        anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
        transformOrigin={{vertical: 'top', horizontal: 'right'}}
      >
        <MenuItem onClick={openRenameDialog}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem onClick={openDeleteDialog} sx={{color: 'error.main'}}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Settings Menu - Enhanced with all theme options */}
      <Menu
        anchorEl={settingsMenuAnchor}
        open={Boolean(settingsMenuAnchor)}
        onClose={closeSettingsMenu}
        anchorOrigin={{vertical: 'top', horizontal: 'right'}}
        transformOrigin={{vertical: 'bottom', horizontal: 'right'}}
      >
        {/* Current theme indicator */}
        <MenuItem disabled>
          <ListItemIcon>{currentTheme.icon}</ListItemIcon>
          <ListItemText>
            <Typography variant="body2" color="text.secondary">
              Current: {currentTheme.label}
            </Typography>
          </ListItemText>
        </MenuItem>
        <Divider />

        {/* System theme */}
        <MenuItem
          onClick={() => handleThemeChange(themes.SYSTEM)}
          selected={themePreference === themes.SYSTEM}
        >
          <ListItemIcon>
            <SystemModeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>System</ListItemText>
        </MenuItem>

        {/* Light theme */}
        <MenuItem
          onClick={() => handleThemeChange(themes.LIGHT)}
          selected={themePreference === themes.LIGHT}
        >
          <ListItemIcon>
            <LightModeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Light</ListItemText>
        </MenuItem>

        {/* Dark theme */}
        <MenuItem
          onClick={() => handleThemeChange(themes.DARK)}
          selected={themePreference === themes.DARK}
        >
          <ListItemIcon>
            <DarkModeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Dark</ListItemText>
        </MenuItem>

        <Divider />
        <MenuItem onClick={handleLogout} sx={{color: 'error.main'}}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Conversation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{threadToDelete?.title}"? This
            action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteThread}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
      >
        <DialogTitle>Rename Conversation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Title"
            value={renameTitle}
            onChange={e => setRenameTitle(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleRenameThread()}
            sx={{mt: 1}}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRenameThread}
            variant="contained"
            disabled={!renameTitle.trim()}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default Sidebar
