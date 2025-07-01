import React, {useEffect, useRef} from 'react'
import {Box, TextField, IconButton, Typography} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import {useSearch} from '../context/SearchContext'

const SearchBar = () => {
  const {
    searchQuery,
    setSearchQuery,
    currentMatchIndex,
    totalMatches,
    isSearchOpen,
    setIsSearchOpen,
    findNextMatch,
    findPreviousMatch,
    resetSearch,
  } = useSearch()

  const inputRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = e => {
      // Escape to close search
      if (e.key === 'Escape' && isSearchOpen) {
        e.preventDefault()
        setIsSearchOpen(false)
        resetSearch()
      }

      // F3 for next match
      if (e.key === 'F3' && !e.shiftKey && isSearchOpen) {
        e.preventDefault()
        findNextMatch()
      }

      // Shift+F3 for previous match
      if (e.key === 'F3' && e.shiftKey && isSearchOpen) {
        e.preventDefault()
        findPreviousMatch()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isSearchOpen,
    findNextMatch,
    findPreviousMatch,
    setIsSearchOpen,
    resetSearch,
  ])

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isSearchOpen])

  if (!isSearchOpen) return null

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: 'background.paper',
        p: 0.5,
        borderRadius: 1,
        boxShadow: 1,
        border: '1px solid',
        borderColor: 'divider',
        height: '32px',
        pointerEvents: 'auto', // Ensure the search bar is clickable
      }}
    >
      <SearchIcon sx={{color: 'text.secondary', fontSize: '20px'}} />
      <TextField
        inputRef={inputRef}
        size="small"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search messages..."
        variant="outlined"
        sx={{
          width: '180px',
          '& .MuiOutlinedInput-root': {
            height: '24px',
            fontSize: '14px',
            '& fieldset': {
              border: 'none',
            },
            '&:hover fieldset': {
              border: 'none',
            },
            '&.Mui-focused fieldset': {
              border: 'none',
            },
          },
        }}
      />
      {totalMatches > 0 && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            minWidth: '36px',
            textAlign: 'center',
            fontSize: '12px',
          }}
        >
          {currentMatchIndex + 1}/{totalMatches}
        </Typography>
      )}
      <IconButton
        size="small"
        onClick={() => {
          setIsSearchOpen(false)
          resetSearch()
        }}
        sx={{
          padding: '4px',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <CloseIcon sx={{fontSize: '18px'}} />
      </IconButton>
    </Box>
  )
}

export default SearchBar
