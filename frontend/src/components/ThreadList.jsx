import React, {useState, useEffect} from 'react'
import {
  List,
  ListItem,
  ListItemText,
  TextField,
  Button,
  Box,
  Typography,
  Paper,
  Alert,
  IconButton,
  Divider,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Tooltip,
  InputAdornment,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import SearchIcon from '@mui/icons-material/Search'
import {useThread} from '../context/ThreadContext'
import {ThreadListSkeleton, ThreadSkeleton} from './SkeletonLoader'

function ThreadList({
  selectThread: propSelectThread,
  createNewThread: propCreateNewThread,
}) {
  const {
    threads,
    selectedThread,
    error,
    fetchThreads,
    createNewThread,
    selectThread,
    deleteThread,
    renameThread,
    isLoadingThreads,
    isLoadingMessagesForThread,
  } = useThread()
  const [newTitle, setNewTitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [threadToDelete, setThreadToDelete] = useState(null)
  const [loadingThreadId, setLoadingThreadId] = useState(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [threadToRename, setThreadToRename] = useState(null)
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Note: fetchThreads is called by parent component or context as needed
  // useEffect(() => {
  //   fetchThreads()
  // }, [])

  // Filter threads based on search query
  const filteredThreads = threads.filter(thread =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleSelect = async thread => {
    // Skip if already selected or currently loading
    if (selectedThread?.id === thread.id || loadingThreadId) {
      return
    }

    // Set loading state for this thread
    setLoadingThreadId(thread.id)

    try {
      // First update selection in parent component if provided
      if (propSelectThread) {
        propSelectThread(thread)
      }

      // Update in context - selectThread already handles fetching messages
      await selectThread(thread)
    } catch (err) {
      console.error('Error selecting thread:', err)
    } finally {
      // Clear loading state
      setLoadingThreadId(null)
    }
  }

  const handleCreate = () => {
    if (!newTitle.trim()) return
    if (propCreateNewThread) propCreateNewThread(newTitle)
    else createNewThread(newTitle)
    setNewTitle('')
  }

  const handleDeleteClick = (e, thread) => {
    e.stopPropagation() // Prevent thread selection when clicking delete
    if (!thread?.id) {
      console.error('Cannot delete thread: Invalid thread ID')
      return
    }
    setThreadToDelete(thread)
    setConfirmDelete(true)
  }

  const handleConfirmDelete = async () => {
    if (!threadToDelete?.id) {
      console.error('Cannot delete thread: Invalid thread ID')
      setConfirmDelete(false)
      setThreadToDelete(null)
      return
    }
    await deleteThread(threadToDelete.id)
    setConfirmDelete(false)
    setThreadToDelete(null)
  }

  const handleCancelDelete = () => {
    setConfirmDelete(false)
    setThreadToDelete(null)
  }

  // Handle opening the rename dialog
  const handleRenameClick = (e, thread) => {
    e.stopPropagation() // Prevent thread selection when clicking rename
    setThreadToRename(thread)
    setNewThreadTitle(thread.title) // Initialize with current title
    setRenameDialogOpen(true)
  }

  // Handle confirming the thread rename
  const handleConfirmRename = async () => {
    if (threadToRename && newThreadTitle.trim()) {
      try {
        await renameThread(threadToRename.id, newThreadTitle.trim())
        setRenameDialogOpen(false)
        setThreadToRename(null)
        setNewThreadTitle('')
      } catch (err) {
        console.error('Error renaming thread:', err)
        // Show error in the dialog
        setErrorMessage(err.message)
        // Keep dialog open so user can try again
      }
    }
  }

  // Handle canceling the rename operation
  const handleCancelRename = () => {
    setRenameDialogOpen(false)
    setThreadToRename(null)
    setNewThreadTitle('')
  }

  return (
    <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <Typography variant="h6" sx={{p: 1, fontWeight: 'bold'}}>
        Conversations
      </Typography>

      {/* Search Field */}
      <Box sx={{p: 1, mb: 1}}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search threads..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* New Thread Form */}
      <Box sx={{p: 1, mb: 2}}>
        <TextField
          fullWidth
          size="small"
          placeholder="New thread title"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          sx={{mb: 1}}
        />
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          disabled={!newTitle.trim()}
        >
          Create Thread
        </Button>
      </Box>

      <Divider />

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{m: 1}}>
          {error}
        </Alert>
      )}

      {/* Thread List */}
      {isLoadingThreads ? (
        <Box sx={{flex: 1, overflow: 'auto'}}>
          <ThreadListSkeleton count={6} />
        </Box>
      ) : filteredThreads.length > 0 ? (
        <List sx={{flex: 1, overflow: 'auto'}}>
          {filteredThreads.map(thread => (
            <ListItemButton
              key={thread.id}
              selected={selectedThread?.id === thread.id}
              onClick={() => handleSelect(thread)}
              disabled={loadingThreadId !== null}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: theme =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(144, 202, 249, 0.16)'
                      : 'rgba(33, 150, 243, 0.08)',
                },
                position: 'relative',
              }}
            >
              <ListItemText
                primary={thread.title}
                secondary={
                  thread.last_message_content ? (
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.75rem',
                          lineHeight: 1.2,
                        }}
                      >
                        {thread.last_message_content.length > 60
                          ? `${thread.last_message_content.slice(0, 60)}...`
                          : thread.last_message_content}
                      </Typography>
                      {thread.last_message_timestamp && (
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{
                            fontSize: '0.6rem',
                            display: 'block',
                            marginTop: '2px',
                          }}
                        >
                          {new Date(
                            thread.last_message_timestamp,
                          ).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.disabled"
                      sx={{
                        fontSize: '0.75rem',
                        fontStyle: 'italic',
                      }}
                    >
                      No messages yet
                    </Typography>
                  )
                }
                primaryTypographyProps={{
                  noWrap: true,
                  fontWeight:
                    selectedThread?.id === thread.id ? 'bold' : 'normal',
                }}
                secondaryTypographyProps={{
                  component: 'div',
                }}
              />

              {/* Loading indicator */}
              {(loadingThreadId === thread.id ||
                isLoadingMessagesForThread(thread.id)) && (
                <CircularProgress
                  size={24}
                  sx={{
                    position: 'absolute',
                    right: 80,
                  }}
                />
              )}

              {/* Thread action buttons */}
              <Box sx={{display: 'flex'}}>
                <Tooltip title="Rename thread">
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={e => handleRenameClick(e, thread)}
                    sx={{opacity: 0.6, '&:hover': {opacity: 1}}}
                    disabled={loadingThreadId !== null}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Delete thread">
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={e => handleDeleteClick(e, thread)}
                    sx={{opacity: 0.6, '&:hover': {opacity: 1}}}
                    disabled={loadingThreadId !== null}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </ListItemButton>
          ))}
        </List>
      ) : (
        <Box sx={{p: 2, textAlign: 'center'}}>
          <Typography variant="body2" color="text.secondary">
            {searchQuery
              ? 'No threads match your search'
              : 'No threads yet. Create your first one!'}
          </Typography>
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete} onClose={handleCancelDelete}>
        <DialogTitle>Delete Thread</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{threadToDelete?.title}"? This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Thread Dialog */}
      <Dialog open={renameDialogOpen} onClose={handleCancelRename}>
        <DialogTitle>Rename Thread</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{mb: 2}}>
            Enter a new title for "{threadToRename?.title}".
          </DialogContentText>
          {errorMessage && (
            <Alert severity="error" sx={{mb: 2}}>
              {errorMessage}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            label="New Title"
            value={newThreadTitle}
            onChange={e => {
              setNewThreadTitle(e.target.value)
              setErrorMessage('')
            }}
            error={!!errorMessage}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRename}>Cancel</Button>
          <Button
            onClick={handleConfirmRename}
            color="primary"
            disabled={
              !newThreadTitle.trim() || newThreadTitle === threadToRename?.title
            }
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ThreadList
