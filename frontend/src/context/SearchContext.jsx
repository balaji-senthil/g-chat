import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from 'react'

const SearchContext = createContext()

export const SearchProvider = ({children}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1)
  const [totalMatches, setTotalMatches] = useState(0)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const findNextMatch = useCallback(() => {
    if (currentMatchIndex < totalMatches - 1) {
      setCurrentMatchIndex(prev => prev + 1)
    } else {
      setCurrentMatchIndex(0) // Wrap around to first match
    }
  }, [currentMatchIndex, totalMatches])

  const findPreviousMatch = useCallback(() => {
    if (currentMatchIndex > 0) {
      setCurrentMatchIndex(prev => prev - 1)
    } else {
      setCurrentMatchIndex(totalMatches - 1) // Wrap around to last match
    }
  }, [currentMatchIndex, totalMatches])

  const resetSearch = useCallback(() => {
    setSearchQuery('')
    setCurrentMatchIndex(-1)
    setTotalMatches(0)
    setIsSearchOpen(false)
  }, [])

  // Listen for logout events to clear search data
  useEffect(() => {
    const handleUserLogout = () => {
      resetSearch()
    }

    window.addEventListener('userLogout', handleUserLogout)

    return () => {
      window.removeEventListener('userLogout', handleUserLogout)
    }
  }, [resetSearch])

  const value = {
    searchQuery,
    setSearchQuery,
    currentMatchIndex,
    setCurrentMatchIndex,
    totalMatches,
    setTotalMatches,
    isSearchOpen,
    setIsSearchOpen,
    findNextMatch,
    findPreviousMatch,
    resetSearch,
  }

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  )
}

export const useSearch = () => {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}
