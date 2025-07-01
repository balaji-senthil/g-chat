import React from 'react'
import {Navigate, Outlet} from 'react-router-dom'
import {useAuthContext} from '../../context/AuthContext'
import {Box, CircularProgress} from '@mui/material'

export const ProtectedRoute = () => {
  const {isAuthenticated, isLoading} = useAuthContext()

  // Show loading indicator while checking authentication status
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress data-testid="progressbar" />
      </Box>
    )
  }

  // If authenticated, render the child routes
  if (isAuthenticated) {
    return <Outlet />
  }

  // If not authenticated, redirect to login page
  return <Navigate to="/login" replace />
}
