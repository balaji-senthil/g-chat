import React, {createContext, useContext, useState} from 'react'
import {Snackbar, Alert} from '@mui/material'

const NotificationContext = createContext()

export const NotificationProvider = ({children}) => {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info', // 'error', 'warning', 'info', 'success'
    autoHideDuration: 6000,
  })

  const showNotification = (
    message,
    severity = 'info',
    autoHideDuration = 6000,
  ) => {
    setNotification({
      open: true,
      message,
      severity,
      autoHideDuration,
    })
  }

  const hideNotification = () => {
    setNotification(prev => ({
      ...prev,
      open: false,
    }))
  }

  const value = {
    showNotification,
    hideNotification,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.autoHideDuration}
        onClose={hideNotification}
        anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
      >
        <Alert
          onClose={hideNotification}
          severity={notification.severity}
          variant="filled"
          sx={{width: '100%'}}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  )
}

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error(
      'useNotification must be used within a NotificationProvider',
    )
  }
  return context
}
