import React, {useState} from 'react'
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

export const RegisterForm = () => {
  const navigate = useNavigate()
  const {register, error: authError, isLoading} = useAuthContext()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [formErrors, setFormErrors] = useState({})

  const handleChange = e => {
    const {name, value} = e.target
    setFormData({...formData, [name]: value})

    // Clear validation errors when user types
    if (formErrors[name]) {
      setFormErrors({...formErrors, [name]: ''})
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.name) {
      errors.name = 'Name is required'
    }

    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email address is invalid'
    }

    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long'
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()

    if (validateForm()) {
      const success = await register(
        formData.name,
        formData.email,
        formData.password,
      )

      if (success) {
        navigate('/login')
      }
    }
  }

  const goToLogin = () => {
    navigate('/login')
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
          Register
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
            id="name"
            label="Username"
            name="name"
            autoComplete="name"
            autoFocus
            value={formData.name}
            onChange={handleChange}
            error={!!formErrors.name}
            helperText={formErrors.name}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
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
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            error={!!formErrors.password}
            helperText={formErrors.password}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={!!formErrors.confirmPassword}
            helperText={formErrors.confirmPassword}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={isLoading}
            sx={{mt: 3, mb: 2}}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Register'}
          </Button>

          <Box sx={{mt: 2, textAlign: 'center'}}>
            <Typography variant="body2">
              Already have an account?{' '}
              <Link component="button" variant="body2" onClick={goToLogin}>
                Login
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}
