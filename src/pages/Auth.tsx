import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAnalytics } from '../contexts/AnalyticsContext'
import { Helmet } from 'react-helmet-async'
import {
  Box,
  Typography,
  TextField,
  Alert,
  Link,
  Container,
  Paper,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress
} from '@mui/material'
import { supabase } from '../config/supabaseClient'
import { GradientButton } from '../components/styled/Buttons'
import { useForm } from 'react-hook-form'
import { AuthFormData } from '../types/auth'
import { StyledDialog } from '../components/styled/Layout'


const Auth = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const referralParam = searchParams.get('referral')
  const gameIdParam = searchParams.get('gameId')
  const { user, signIn } = useAuth()
  const { trackEvent } = useAnalytics()
  const [mode, setMode] = useState<'login' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 
    searchParams.get('mode') === 'signin' ? 'login' : 
    (location.state as any)?.mode || 'login'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [referralCodeError, setReferralCodeError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    setError: setFormError
  } = useForm<AuthFormData>()

  // Set referral code from URL parameter if available
  useEffect(() => {
    if (referralParam) {
      setValue('referralCode', referralParam)
    }
    
    // Store gameId in localStorage if available
    if (gameIdParam) {
      localStorage.setItem('redirectGameId', gameIdParam)
    }
  }, [referralParam, gameIdParam, setValue])

  useEffect(() => {
    if (user) {
      // Check for redirect game ID first
      const redirectGameId = localStorage.getItem('redirectGameId')
      if (redirectGameId) {
        localStorage.removeItem('redirectGameId')
        navigate(`/games/${redirectGameId}`)
        return
      }

      // Otherwise use the state.from or default to /games
      const from = location.state?.from || '/games'
      navigate(from)
    }
  }, [user])

  const handleModeChange = (newMode: 'login' | 'signup') => {
    setMode(newMode)
    setError('')
    setReferralCodeError('')
    setSignupSuccess(false)
    setHasSubmitted(false)
    reset()
    
    // Track mode change
    trackEvent('Auth', 'mode_change', newMode)
    
    // Preserve referral code when switching modes
    if (referralParam) {
      setValue('referralCode', referralParam)
    }
  }

  // Call the server-side function to update referred_by
  const callUpdateReferredBy = async (userId: string, referrerId: string) => {
    try {
      // Try both approaches in parallel for better performance
      const [rpcResult, directResult] = await Promise.allSettled([
        // RPC approach
        supabase.rpc('update_referred_by', {
          user_id: userId,
          referrer_id: referrerId
        }),
        
        // Direct update approach
        supabase
          .from('users')
          .update({ referred_by: referrerId })
          .eq('id', userId)
      ]);
      
      // Process results
      const rpcSuccess = rpcResult.status === 'fulfilled' && !rpcResult.value.error;
      const directSuccess = directResult.status === 'fulfilled' && !directResult.value.error;
      
      // Determine overall success
      const success = rpcSuccess || directSuccess;
      
      // Construct result object with detailed information
      return { 
        success, 
        error: !success ? 
          (rpcResult.status === 'fulfilled' ? rpcResult.value.error : null) || 
          (directResult.status === 'fulfilled' ? directResult.value.error : null) : 
          null,
        method: rpcSuccess && directSuccess ? 'both' : 
                rpcSuccess ? 'rpc' : 
                directSuccess ? 'direct' : 'none',
        details: {
          rpc: rpcResult.status === 'fulfilled' ? 
            { success: !rpcResult.value.error, data: rpcResult.value.data, error: rpcResult.value.error } : 
            { success: false, error: 'Promise rejected' },
          direct: directResult.status === 'fulfilled' ? 
            { success: !directResult.value.error, error: directResult.value.error } : 
            { success: false, error: 'Promise rejected' }
        }
      };
    } catch (err) {
      return { success: false, error: err, method: 'exception', details: null };
    }
  };

  const onSubmit = async (data: AuthFormData) => {
    setHasSubmitted(true)
    setLoading(true)
    setError('')
    setReferralCodeError('')

    try {
      if (mode === 'signup') {
        // Check if referral code is provided
        if (!data.referralCode) {
          setReferralCodeError('Referral code is required')
          setFormError('referralCode', { 
            type: 'manual', 
            message: 'Referral code is required' 
          })
          setLoading(false)
          return
        }
        
        // Convert referral code to uppercase
        const referralCode = data.referralCode.toUpperCase();
        
        try {
          // First, validate the referral code by checking if it exists
          const { data: referrerData, error: referrerError } = await supabase
            .from('users')
            .select('id, username')
            .eq('referral_code', referralCode)
            .single()

          if (referrerError || !referrerData) {
            setReferralCodeError('Invalid referral code - this code does not exist in our system')
            setFormError('referralCode', { 
              type: 'manual', 
              message: 'Invalid referral code - this code does not exist in our system' 
            })
            setLoading(false)
            return
          }

          // Now sign up the user
          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              emailRedirectTo: `${window.location.origin}/games`,
              data: {
                email: data.email,
                first_name: data.firstName,
                last_name: data.lastName,
                username: data.username
              }
            }
          })

          if (signUpError) {
            throw signUpError
          }

          if (authData.user) {
            // Store the referrer ID in localStorage to use it after email confirmation
            localStorage.setItem('referrer_id', referrerData.id);
            localStorage.setItem('user_id', authData.user.id);
            
            // Wait for the user record to be created
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Try to update the referred_by field
            await callUpdateReferredBy(authData.user.id, referrerData.id);
            
            trackEvent('Auth', 'signup_success', authData.user.id)
            
            // Verify the update
            const { error: verifyError } = await supabase
              .from('users')
              .select('referred_by')
              .eq('id', authData.user.id)
              .single()
              
            if (verifyError) {
              console.error('Verification error:', verifyError);
            }
            
            setSignupSuccess(true)
            reset()
          }
        } catch (err: unknown) {
          // Handle specific errors from the referral code validation or signup process
          setError(err instanceof Error ? err.message : 'Signup failed')
          trackEvent('Auth', 'signup_error', err instanceof Error ? err.message : 'Signup failed')
          setLoading(false)
        }
      } else {
        await signIn(data.email, data.password)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
      trackEvent('Auth', 'login_error', err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  // Add password reset handler
  const handlePasswordReset = async () => {
    try {
      setResetLoading(true)
      setResetError('')
      
      // Use a direct path to the reset password page
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      
      if (error) throw error
      
      setResetSuccess(true)
      trackEvent('Auth', 'password_reset_requested')
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to send reset email')
      trackEvent('Auth', 'password_reset_error', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Helmet>
        <title>Tiny Leagues - {mode === 'signup' ? 'Sign Up' : 'Login'}</title>
      </Helmet>
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </Typography>

          {signupSuccess ? (
            <Box sx={{ textAlign: 'center', my: 4 }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="body1" gutterBottom>
                  Your account has been created successfully!
                </Typography>
                <Typography variant="body2">
                  Please check your email for a confirmation link to activate your account.
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    setSignupSuccess(false)
                    setMode('login')
                  }}
                  sx={{ mt: 2 }}
                >
                  Return to Login
                </Button>
              </Alert>
            </Box>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              {mode === 'signup' && (
                <>
                  <TextField
                    fullWidth
                    label="First Name"
                    {...register('firstName', { required: 'First name is required' })}
                    error={hasSubmitted && !!errors.firstName}
                    helperText={hasSubmitted && errors.firstName?.message}
                    margin="normal"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Last Name"
                    {...register('lastName', { required: 'Last name is required' })}
                    error={hasSubmitted && !!errors.lastName}
                    helperText={hasSubmitted && errors.lastName?.message}
                    margin="normal"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Username"
                    {...register('username', {
                      required: 'Username is required',
                      minLength: {
                        value: 3,
                        message: 'Username must be at least 3 characters'
                      }
                    })}
                    error={hasSubmitted && !!errors.username}
                    helperText={hasSubmitted && errors.username?.message}
                    margin="normal"
                    sx={{ mb: 2 }}
                  />
                </>
              )}

              <TextField
                fullWidth
                label="Email"
                type="email"
                margin="normal"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                error={hasSubmitted && !!errors.email}
                helperText={hasSubmitted && errors.email?.message}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                margin="normal"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters'
                  }
                })}
                error={hasSubmitted && !!errors.password}
                helperText={hasSubmitted && errors.password?.message}
                sx={{ mb: mode === 'signup' ? 2 : 3 }}
              />

              {mode === 'signup' && (
                <TextField
                  fullWidth
                  label="Referral Code"
                  {...register('referralCode', { 
                    required: 'Referral code is required',
                    validate: (value: string | undefined) => {
                      if (!value) return 'Referral code is required';
                      return true;
                    }
                  })}
                  onChange={(e) => {
                    // Convert to uppercase and update the form value
                    const upperValue = e.target.value.toUpperCase();
                    e.target.value = upperValue;
                    setValue('referralCode', upperValue);
                    
                    // Clear any previous referral code error when the user types
                    if (referralCodeError) {
                      setReferralCodeError('');
                    }
                  }}
                  error={hasSubmitted && (!!errors.referralCode || !!referralCodeError)}
                  helperText={hasSubmitted && (errors.referralCode?.message || referralCodeError)}
                  margin="normal"
                  sx={{ mb: 3 }}
                  disabled={!!referralParam}
                  inputProps={{
                    style: { textTransform: 'uppercase' }
                  }}
                />
              )}

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <GradientButton
                type="submit"
                fullWidth
                disabled={loading}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  mode === 'signup' ? 'Sign Up' : 'Log In'
                )}
              </GradientButton>

              <Box sx={{ textAlign: 'center' }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => handleModeChange(mode === 'signup' ? 'login' : 'signup')}
                >
                  {mode === 'signup' 
                    ? 'Already have an account? Log in' 
                    : 'Need an account? Sign up'}
                </Link>
              </Box>

              {mode === 'login' && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => setResetDialogOpen(true)}
                  >
                    Forgot your password?
                  </Link>
                </Box>
              )}
            </form>
          )}
        </Paper>
      </Box>

      {/* Password Reset Dialog */}
      <StyledDialog
        open={resetDialogOpen} 
        onClose={() => {
          setResetDialogOpen(false)
          setResetSuccess(false)
          setResetError('')
          setResetEmail('')
        }}
      >
        <DialogTitle>
          Reset Password
        </DialogTitle>
        <DialogContent>
          {resetSuccess ? (
            <Typography>
              Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.
            </Typography>
          ) : (
            <>
              <Typography sx={{ mb: 2 }}>
                Enter your email address and we'll send you a link to reset your password.
              </Typography>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                error={!!resetError}
                helperText={resetError}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setResetDialogOpen(false)
              setResetSuccess(false)
              setResetError('')
              setResetEmail('')
            }}
          >
            {resetSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!resetSuccess && (
            <Button
              onClick={handlePasswordReset}
              disabled={!resetEmail || resetLoading}
              variant="contained"
            >
              Send Reset Link
            </Button>
          )}
        </DialogActions>
      </StyledDialog>
    </Container>
  )
}

export default Auth 