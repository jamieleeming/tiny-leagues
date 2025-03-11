import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Alert,
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { supabase } from '../config/supabaseClient'
import { GradientButton } from '../components/styled/Buttons'

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const ResetPassword = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<ResetPasswordFormData>()

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setLoading(true)
      setError('')

      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password
      })

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        navigate('/auth', { state: { mode: 'login' } })
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Reset Password
          </Typography>

          {success ? (
            <Alert severity="success">
              Password updated successfully! Redirecting to login...
            </Alert>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <TextField
                fullWidth
                label="New Password"
                type="password"
                margin="normal"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
                error={!!errors.password}
                helperText={errors.password?.message}
              />

              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                margin="normal"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: value => 
                    value === watch('password') || 'Passwords do not match'
                })}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <GradientButton
                type="submit"
                fullWidth
                disabled={loading}
                sx={{ mt: 3 }}
              >
                Update Password
              </GradientButton>
            </form>
          )}
        </Paper>
      </Box>
    </Container>
  )
}

export default ResetPassword 