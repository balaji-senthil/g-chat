import React, {useState, useEffect} from 'react'
import {useNavigate} from 'react-router-dom'
import {useAuthContext} from '../../context/AuthContext'
import {
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material'

export const LoginForm = () => {
  const navigate = useNavigate()
  const {login, error: authError, isLoading, clearError} = useAuthContext()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [formErrors, setFormErrors] = useState({})

  // Clear authentication errors when component mounts
  useEffect(() => {
    if (clearError) {
      clearError()
    }
  }, [clearError])

  const handleChange = e => {
    const {name, value} = e.target
    setFormData({...formData, [name]: value})

    // Clear validation errors when user types
    if (formErrors[name]) {
      setFormErrors({...formErrors, [name]: ''})
    }

    // Clear authentication errors when user starts interacting
    if (authError && clearError) {
      clearError()
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email address is invalid'
    }

    if (!formData.password) {
      errors.password = 'Password is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()

    if (validateForm()) {
      const success = await login(formData.email, formData.password)
      if (success) {
        navigate('/chat')
      }
    }
  }

  const goToRegister = () => {
    navigate('/register')
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Login
        </Typography>

        {authError && (
          <Alert severity="error" sx={{mb: 2}}>
            {authError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={formData.email}
            onChange={handleChange}
            error={!!formErrors.email}
            helperText={formErrors.email}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            error={!!formErrors.password}
            helperText={formErrors.password}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={isLoading}
            sx={{mt: 3, mb: 2}}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Login'}
          </Button>

          <Box sx={{mt: 2, textAlign: 'center'}}>
            <Typography variant="body2">
              Don't have an account?{' '}
              <Link component="button" variant="body2" onClick={goToRegister}>
                Register
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}
