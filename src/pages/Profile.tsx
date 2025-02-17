import { useState, useEffect } from 'react'
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Alert,
  Paper,
  Grid,
  Divider
} from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabaseClient'

const Profile = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profile, setProfile] = useState({
    username: '',
    first_name: '',
    last_name: '',
    phone: ''
  })

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error
        if (data) setProfile(data)
      } catch (err) {
        console.error('Error fetching profile:', err)
      }
    }

    fetchProfile()
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          ...profile,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      setSuccess('Profile updated successfully')
    } catch (err) {
      setError('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Profile
          </Typography>
          <Divider sx={{ mb: 4 }} />
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Username"
                  fullWidth
                  value={profile.username || ''}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone"
                  fullWidth
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  fullWidth
                  value={profile.first_name || ''}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  fullWidth
                  value={profile.last_name || ''}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                />
              </Grid>
            </Grid>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ mt: 4 }}
            >
              Save Changes
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default Profile 