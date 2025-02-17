import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Box, Typography, CircularProgress, Alert } from '@mui/material'
import { supabase } from '../config/supabaseClient'

const AuthCallback = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const { error } = await supabase.auth.refreshSession()
        if (error) throw error

        // Redirect to login with success message
        navigate('/login', {
          state: {
            message: 'Email verified successfully! You can now log in.'
          }
        })
      } catch (err) {
        console.error('Verification error:', err)
        setError('Failed to verify email. The link may have expired.')
      }
    }

    handleEmailConfirmation()
  }, [navigate])

  if (error) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Typography>
            Please request a new verification email by trying to log in.
          </Typography>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          Verifying your email...
        </Typography>
      </Box>
    </Container>
  )
}

export default AuthCallback 