import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Box, Typography, CircularProgress, Alert } from '@mui/material'
import { supabase } from '../config/supabaseClient'

const AuthCallback = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  // Helper function to call the server-side update_referred_by function
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

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const { error } = await supabase.auth.refreshSession()
        if (error) throw error

        // Check if we have stored referrer_id and user_id in localStorage
        const referrerId = localStorage.getItem('referrer_id')
        const userId = localStorage.getItem('user_id')

        if (referrerId && userId) {
          // Try to update the referred_by field using the server-side function
          const updateResult = await callUpdateReferredBy(userId, referrerId);
          
          // Store debug info
          setDebugInfo(JSON.stringify({
            user: userId,
            referrer: referrerId,
            updateResult: {
              success: updateResult.success,
              method: updateResult.method,
              details: updateResult.details
            }
          }, null, 2));
          
          // Verify the update
          const { data: verifyData, error: verifyError } = await supabase
            .from('users')
            .select('referred_by, id, created_at')
            .eq('id', userId)
            .single();
            
          if (verifyError) {
            setDebugInfo((prev: string | null) => 
              (prev || '') + '\n\nVerification Error: ' + JSON.stringify(verifyError, null, 2)
            );
          } else {
            setDebugInfo((prev: string | null) => 
              (prev || '') + '\n\nVerification Result: ' + JSON.stringify(verifyData, null, 2)
            );
          }
          
          // Clear the localStorage items
          localStorage.removeItem('referrer_id')
          localStorage.removeItem('user_id')
        }

        // Redirect to games page with success message
        navigate('/games', {
          state: {
            message: 'Email verified successfully! Your account is now active.',
            debug: debugInfo
          }
        })
      } catch (err) {
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
          {debugInfo && (
            <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {debugInfo}
              </Typography>
            </Alert>
          )}
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