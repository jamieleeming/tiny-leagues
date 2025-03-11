import { useState, useEffect, Fragment, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  useTheme,
  IconButton,
  Tooltip,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
} from '@mui/material'
import {
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Share as ShareIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { supabase } from '../config/supabaseClient'
import { Game, RSVP, GameStatus, Result, Payment } from '../types/database'
import { useAuth } from '../contexts/AuthContext'
import GameForm from '../components/games/GameForm'
import { GameResultsDialog } from '../components/games/GameResultsDialog'
import { ChatSection } from '../components/games/ChatSection'
import { PageWrapper, ContentWrapper } from '../components/styled/Layouts'
import { PageTitle, SectionTitle, CardHeader } from '../components/styled/Typography'
import { HoverListItem, StyledList } from '../components/styled/Lists'
import { ContentCard } from '../components/styled/Layout'
import { GradientButton } from '../components/styled/Buttons'
import { BackLink } from '../components/styled/Navigation'
import { Helmet } from 'react-helmet-async'
import { StyledDialog } from '../components/styled/Layout'
import MarkdownRenderer from '../components/common/MarkdownRenderer'
import { useAnalytics } from '../contexts/AnalyticsContext'

// Add interface for transformed game data
interface TransformedGame extends Omit<Game, 'host'> {
  confirmed_count: number;
  host: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    payment: Payment | null;
  };
}

const GameDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const theme = useTheme()
  const { user } = useAuth()
  const [game, setGame] = useState<TransformedGame | null>(null)
  const [rsvps, setRsvps] = useState<RSVP[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRsvp, setUserRsvp] = useState<RSVP | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const { trackEvent } = useAnalytics()

  const isConfirmedPlayer = useMemo(() => {
    // Return false if user is not logged in or game is not loaded yet
    if (!user || !game) return false;
    
    // Host always sees full address
    if (user.id === game.host_id) return true;
    
    // Check if user is a confirmed player
    const userRsvp = rsvps.find(r => r.user_id === user.id);
    return userRsvp?.confirmed && !userRsvp?.waitlist_position;
  }, [user, game, rsvps]);

  useEffect(() => {
    // Redirect if ID is invalid
    if (id === 'create') {
      navigate('/games')
      return
    }

    fetchGameDetails()
  }, [id])

  useEffect(() => {
    if (!user) {
      // Clear sensitive data when user signs out
      setRsvps([])
      setUserRsvp(null)
      setResults([])
      
      // Re-fetch public game data
      fetchGameDetails()
    }
  }, [user])

  useEffect(() => {
    const fetchReferralCode = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('referral_code')
            .eq('id', user.id)
            .single()
          
          if (error) {
            return
          }
          
          setReferralCode(data.referral_code)
        } catch (error) {
          return
        }
      }
    }
    
    fetchReferralCode()
  }, [user])

  const fetchGameDetails = async () => {
    try {
      setLoading(true)
      
      // First get the game with a count of confirmed players
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          host:users!games_host_id_fkey(
            id,
            username,
            first_name,
            last_name,
            payments(
              payment_id,
              type
            )
          ),
          rsvp!inner(confirmed, waitlist_position)
        `)
        .eq('id', id)
        .single()

      if (gameError) throw gameError
      if (!gameData) throw new Error('Game not found')

      // Transform the host data to include payment info and calculate confirmed count
      const venmoPayment = gameData.host?.payments?.find((p: Payment) => p.type === 'venmo')
      const transformedGame = {
        ...gameData,
        host: {
          ...gameData.host,
          payment: venmoPayment || null
        },
        confirmed_count: gameData.rsvp?.filter((r: { confirmed: boolean; waitlist_position: number | null }) => 
          r.confirmed && r.waitlist_position === null
        ).length || 0
      }

      setGame(transformedGame)

      // Fetch RSVPs if user is logged in
      if (user) {
        // Fetch RSVPs
        const { data: rsvpData, error: rsvpError } = await supabase
          .from('rsvp')
          .select(`
            *,
            user:users(
              id,
              username,
              first_name,
              last_name,
              email
            )
          `)
          .eq('game_id', id)
          .order('created_at', { ascending: true })

        if (!rsvpError) {
          setRsvps(rsvpData || [])
          const userRsvp = rsvpData?.find(rsvp => rsvp.user_id === user?.id)
          setUserRsvp(userRsvp || null)
        }
      } else {
        // For non-logged in users, set empty arrays for RSVPs
        setRsvps([])
        setUserRsvp(null)
      }

      // Fetch results if game is completed (for both logged in and non-logged in users)
      if (gameData.status === 'completed') {
        // First get the results
        const { data: resultsData, error: resultsError } = await supabase
          .from('results')
          .select(`
            *,
            user:users(
              first_name,
              last_name,
              username
            )
          `)
          .eq('game_id', id)
          .order('created_at', { ascending: true })

        if (resultsError) throw resultsError

        // Only fetch payment data if user is logged in
        if (user) {
          // Then get venmo payments for all users in the results
          const userIds = resultsData?.map(result => result.user_id) || []
          const { data: paymentsData, error: paymentsError } = await supabase
            .from('payments')
            .select('*')
            .in('user_id', userIds)
            .eq('type', 'venmo')

          if (paymentsError) throw paymentsError

          // Combine results with payment data
          const combinedResults = resultsData?.map(result => ({
            ...result,
            payment: paymentsData?.find(p => p.user_id === result.user_id)
          }))

          setResults(combinedResults || [])
        } else {
          // For non-logged in users, still set results but without payment data
          setResults(resultsData || [])
        }
      } else {
        // Clear results if game is not completed
        setResults([])
      }

    } catch (err) {
      setError('Failed to load game details')
    } finally {
      setLoading(false)
    }
  }

  const isGameFull = () => {
    if (!game) return false
    return rsvps.filter(rsvp => !rsvp.waitlist_position).length >= game.seats
  }

  const handleRSVP = async () => {
    try {
      if (!user) {
        // Redirect to signup page with referral code from URL if available
        const urlParams = new URLSearchParams(window.location.search);
        const referralFromUrl = urlParams.get('referral');
        
        // Navigate to signup with game ID and referral code if available
        navigate(`/auth?mode=signup&gameId=${id}${referralFromUrl ? `&referral=${referralFromUrl}` : ''}`);
        return;
      }

      setLoading(true)

      // Get current RSVP count
      const { data: rsvpCount, error: countError } = await supabase
        .from('rsvp')
        .select('id', { count: 'exact' })
        .eq('game_id', id)
        .is('waitlist_position', null)
        .eq('confirmed', true)

      if (countError) throw countError

      // Check if game is full
      const isGameFull = (rsvpCount?.length || 0) >= (game?.seats || 0)

      // Create new RSVP - always unconfirmed
      const { error: rsvpError } = await supabase
        .from('rsvp')
        .insert({
          game_id: id,
          user_id: user.id,
          confirmed: false,  // Always false now
          waitlist_position: isGameFull ? 0 : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (rsvpError) throw rsvpError

      // Refresh game details
      await fetchGameDetails()

      // Track the RSVP action
      trackEvent('Game', 'rsvp_declined', game?.id)
    } catch (err) {
      setError('Failed to RSVP for this game')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmRSVP = async (rsvpId: string, confirmed: boolean) => {
    try {
      if (!game) return

      // Get the RSVP to check if it's the host
      const { data: rsvpData, error: rsvpError } = await supabase
        .from('rsvp')
        .select('*')
        .eq('id', rsvpId)

      if (rsvpError) throw rsvpError
      if (!rsvpData || rsvpData.length === 0) {
        return
      }

      const rsvp = rsvpData[0]
      
      // Don't allow modifying host's RSVP
      if (rsvp.user_id === game.host_id) {
        return
      }

      // If confirming a waitlisted player, check if there's space
      if (confirmed && rsvp.waitlist_position !== null) {
        const confirmedCount = rsvps.filter(r => r.confirmed && r.waitlist_position === null).length
        if (confirmedCount >= game.seats) {
          setError('Cannot confirm player: game is full')
          return
        }

        // Update the RSVP to move them off waitlist and confirm them
        const { error } = await supabase
          .from('rsvp')
          .update({ 
            confirmed: true,
            waitlist_position: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', rsvpId)

        if (error) throw error

        // Reorder remaining waitlist
        const waitlistRsvps = rsvps
          .filter(r => r.waitlist_position !== null && r.id !== rsvpId)
          .sort((a, b) => (a.waitlist_position || 0) - (b.waitlist_position || 0))

        for (let i = 0; i < waitlistRsvps.length; i++) {
          const { error: updateError } = await supabase
            .from('rsvp')
            .update({ 
              waitlist_position: i,
              updated_at: new Date().toISOString()
            })
            .eq('id', waitlistRsvps[i].id)

          if (updateError) throw updateError
        }
      } else {
        // Regular confirmation update for non-waitlisted players
        const { error } = await supabase
          .from('rsvp')
          .update({ 
            confirmed,
            updated_at: new Date().toISOString()
          })
          .eq('id', rsvpId)

        if (error) throw error
      }
      
      // Refresh the game details to show updated status
      await fetchGameDetails()

      // Track the RSVP action
      trackEvent('Game', `rsvp_${confirmed ? 'confirmed' : 'declined'}`, game?.id)
    } catch (err) {
      setError('Failed to update player confirmation')
    }
  }

  const promoteFromWaitlist = async () => {
    if (!game) return

    // Get the first person on the waitlist
    const { data: nextInLine, error: fetchError } = await supabase
      .from('rsvp')
      .select('*')
      .eq('game_id', game.id)
      .not('waitlist_position', 'is', null)
      .order('waitlist_position', { ascending: true })
      .limit(1)
      .single()

    if (fetchError || !nextInLine) return

    // Remove them from waitlist
    const { error: updateError } = await supabase
      .from('rsvp')
      .update({
        waitlist_position: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', nextInLine.id)

    if (updateError) throw updateError

    // Reorder remaining waitlist
    const { data: waitlistRsvps, error: listError } = await supabase
      .from('rsvp')
      .select('id, waitlist_position')
      .eq('game_id', game.id)
      .gt('waitlist_position', nextInLine.waitlist_position)
      .order('waitlist_position', { ascending: true })

    if (listError) throw listError

    // Update positions
    for (const rsvp of waitlistRsvps || []) {
      const { error: positionError } = await supabase
        .from('rsvp')
        .update({ 
          waitlist_position: (rsvp.waitlist_position as number) - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', rsvp.id)

      if (positionError) throw positionError
    }
  }

  const handleRemovePlayer = async (rsvpId: string) => {
    try {
      // Get the RSVP to check if it's the host
      const { data: rsvpData, error: rsvpError } = await supabase
        .from('rsvp')
        .select('user_id')
        .eq('id', rsvpId)
        .single()

      if (rsvpError) throw rsvpError
      
      // Don't allow removing host
      if (rsvpData.user_id === game?.host_id) {
        return
      }

      const { error } = await supabase
        .from('rsvp')
        .delete()
        .eq('id', rsvpId)

      if (error) throw error

      // Check if we should promote someone from waitlist
      if (!isGameFull()) {
        await promoteFromWaitlist()
      }
      
      fetchGameDetails()
    } catch (err) {
      // console.error('Error removing player:', err)
    }
  }

  const handleStatusUpdate = async (newStatus: GameStatus) => {
    try {
      if (!game) return

      if (newStatus === 'completed') {
        setShowResults(true)
        return
      }

      const { error } = await supabase
        .from('games')
        .update({ 
          status: newStatus,
          date_end: new Date().toISOString()
        })
        .eq('id', game.id)

      if (error) throw error

      fetchGameDetails()
    } catch (err) {
      setError('Failed to update game status')
    }
  }

  // Add this helper function to sort RSVPs
  const sortedRsvps = () => {
    return [...rsvps].sort((a, b) => {
      // Host always first
      if (a.user_id === game?.host_id) return -1
      if (b.user_id === game?.host_id) return 1
      
      // Then active players (no waitlist position)
      if (a.waitlist_position === null && b.waitlist_position !== null) return -1
      if (a.waitlist_position !== null && b.waitlist_position === null) return 1
      
      // Then sort by waitlist position
      if (a.waitlist_position !== null && b.waitlist_position !== null) {
        return a.waitlist_position - b.waitlist_position
      }
      
      // Finally sort by creation date
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }

  // Add function to handle seat changes

  // Add this helper function near the other helper functions
  const isAtMaxConfirmed = () => {
    if (!game) return false
    const confirmedCount = rsvps.filter(r => r.confirmed && r.waitlist_position === null).length
    return confirmedCount >= game.seats
  }

  const handleDeleteGame = async () => {
    try {
      if (!game) return
      
      const { error } = await supabase
        .from('games')
        .update({ 
          status: 'cancelled',
          date_end: new Date().toISOString()
        })
        .eq('id', game.id)

      if (error) throw error

      // Navigate back to games list
      navigate('/games', { 
        state: { message: 'Game successfully cancelled' }
      })

      // Track the game cancellation
      trackEvent('Game', 'cancel_game', game?.id)
    } catch (err) {
      setError('Failed to cancel game')
    }
  }

  // Add a helper function to get confirmed player count
  const getConfirmedCount = () => {
    if (!game) return 0
    if (user) {
      return rsvps.filter(r => r.confirmed && r.waitlist_position === null).length
    }
    // For non-logged in users, get the count from the query
    return game.confirmed_count || 0
  }

  // Update the handleShare function to track sharing
  const handleShare = async () => {
    if (!game) return

    try {
      // Use the game-preview.html page for better WhatsApp compatibility
      const baseGameUrl = `https://jamieleeming.github.io/tiny-leagues/game-preview.html?id=${game.id}`
      
      // Add referral code if available
      const gameUrl = referralCode 
        ? `${baseGameUrl}&referral=${referralCode}` 
        : baseGameUrl
      
      // Add a cache-busting parameter for WhatsApp
      const shareUrl = `${gameUrl}&v=${Date.now().toString().slice(-6)}`
      
      // Create a simple share text
      const shareText = `Wanna play some poker? ${shareUrl}`
      
      // Track the share event
      trackEvent('Game', 'share_game', game.id)
      
      if (navigator.share) {
        await navigator.share({
          title: 'Wanna play some poker?',
          text: shareText,
          url: shareUrl
        })
        trackEvent('Game', 'share_game_native', game.id)
      } else {
        await navigator.clipboard.writeText(shareText)
        alert('Link copied to clipboard!')
        trackEvent('Game', 'share_game_clipboard', game.id)
      }
    } catch (err) {
      // console.error('Error sharing:', err)
    }
  }

  const testMetadata = () => {
    try {
      // Get meta tags from current document
    } catch (error) {
      // console.error('Error testing metadata:', error)
    }
  }

  useEffect(() => {
    if (game) {
      // Add a small delay to allow Helmet to update the meta tags
      setTimeout(testMetadata, 100);
    }
  }, [game]);

  if (loading) {
    return (
      <PageWrapper maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </PageWrapper>
    )
  }

  if (error || !game) {
    return (
      <PageWrapper maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error || 'Game not found'}
        </Alert>
      </PageWrapper>
    )
  }

  return (
    <>
      <Helmet>
        {/* Basic Meta Tags */}
        <title>Wanna play some poker?</title>
        
        {/* WhatsApp and Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Tiny Leagues Poker" />
        <meta property="og:url" content={`https://jamieleeming.github.io/tiny-leagues/games/${id}`} />
        <meta property="og:title" content="Wanna play some poker?" />
        <meta property="og:description" content="Join this upcoming game over on Tiny Leagues" />
        
        {/* Image tags - critical for WhatsApp */}
        <meta property="og:image" content="https://jamieleeming.github.io/tiny-leagues/poker-icon.png" />
        <meta property="og:image:secure_url" content="https://jamieleeming.github.io/tiny-leagues/poker-icon.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="200" />
        <meta property="og:image:height" content="200" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://jamieleeming.github.io/tiny-leagues/poker-icon.png" />
        
        {/* Additional schema.org markup for WhatsApp */}
        <meta itemProp="image" content="https://jamieleeming.github.io/tiny-leagues/poker-icon.png" />
        <meta property="og:locale" content="en_US" />
      </Helmet>
      
      {/* We don't need this anymore since we're using meta itemProp="image" instead */}
      {/* <span itemProp="thumbnail" itemScope itemType="http://schema.org/ImageObject" style={{ display: 'none' }}>
        <link itemProp="url" href="https://zlsmhizixetvplocbulz.supabase.co/storage/v1/object/public/tiny-leagues-assets/poker-preview-256.png" />
      </span> */}
      <PageWrapper maxWidth="lg">
        <ContentWrapper>
          <BackLink onClick={() => {
            if (!user) {
              // Redirect to signup page with referral code from URL if available
              const urlParams = new URLSearchParams(window.location.search);
              const referralFromUrl = urlParams.get('referral');
              
              // Navigate to signup with game ID and referral code if available
              navigate(`/auth?mode=signup&gameId=${id}${referralFromUrl ? `&referral=${referralFromUrl}` : ''}`);
            } else {
              navigate('/games');
            }
          }}>
            <ArrowBackIcon />
            Back to Games
          </BackLink>

          <Grid container spacing={3}>
            {/* Header Card */}
            <Grid item xs={12}>
              <ContentCard>
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 3, sm: 2 },
                  width: '100%'
                }}>
                  {/* Title and Status */}
                  <Box sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    width: '100%'
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: 2,
                      flexWrap: 'wrap'
                    }}>
                      <PageTitle>
                        {game.format === 'cash' ? 'Cash Game' : 'Tournament'}
                      </PageTitle>
                      <Chip
                        label={game.status?.replace('_', ' ').toUpperCase() || 'SCHEDULED'}
                        color={
                          !game.status || game.status === 'scheduled' ? 'default' :
                          game.status === 'in_progress' ? 'primary' :
                          game.status === 'completed' ? 'success' :
                          'error'
                        }
                      />
                    </Box>
                  </Box>

                  {/* Utility Buttons */}
                  <Box sx={{ 
                    display: 'flex',
                    gap: 1,
                    width: { xs: '100%', sm: 'auto' },
                    alignItems: 'center'
                  }}>
                    {/* Add Edit Ledger button when game is completed and user is host */}
                    {game.status === 'completed' && user?.id === game.host_id && (
                      <GradientButton
                        startIcon={<EditIcon />}
                        onClick={() => setShowResults(true)}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          '&&': {
                            px: { xs: 3, sm: 2.5 },
                            py: { xs: 1, sm: 0.5 },
                            minHeight: '36px',
                            whiteSpace: 'nowrap'
                          }
                        }}
                      >
                        Edit Ledger
                      </GradientButton>
                    )}

                    {/* Only show Share button for authenticated users */}
                    {user && (
                      <GradientButton
                        startIcon={<ShareIcon />}
                        onClick={handleShare}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          '&&': {
                            px: { xs: 3, sm: 2.5 },
                            py: { xs: 1, sm: 0.5 },
                            minHeight: '36px',
                            whiteSpace: 'nowrap'
                          }
                        }}
                      >
                        Share
                      </GradientButton>
                    )}

                    {/* Host-only actions */}
                    {user?.id === game.host_id && (game.status === 'scheduled' || game.status === 'in_progress') && (
                      <>
                        <GradientButton
                          startIcon={<EditIcon />}
                          onClick={() => setEditMode(true)}
                          size="small"
                          variant="outlined"
                          sx={{ 
                            '&&': {
                              px: { xs: 3, sm: 2.5 },
                              py: { xs: 1, sm: 0.5 },
                              minHeight: '36px',
                              whiteSpace: 'nowrap'
                            }
                          }}
                        >
                          Edit
                        </GradientButton>
                        <GradientButton
                          startIcon={<CancelIcon />}
                          onClick={() => setDeleteDialogOpen(true)}
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ 
                            '&&': {
                              px: { xs: 3, sm: 2.5 },
                              py: { xs: 1, sm: 0.5 },
                              minHeight: '36px',
                              whiteSpace: 'nowrap'
                            }
                          }}
                        >
                          Cancel
                        </GradientButton>
                      </>
                    )}
                  </Box>
                </Box>
              </ContentCard>
            </Grid>

            {/* Main Content Column - Full width when game is completed */}
            <Grid item xs={12} lg={game.status === 'completed' ? 12 : 8}>
              {/* Stack cards with consistent spacing */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Game Details Card */}
                <ContentCard>
                  <CardHeader>
                    <SectionTitle>Details</SectionTitle>
                  </CardHeader>
                  <Grid container spacing={3}>
                    {/* Row 1 */}
                    {/* Date & Time */}
                    <Grid item xs={12} sm={6}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Date & Time
                        </Typography>
                        <Typography>
                          {format(new Date(game.date_start), 'PPP p')}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    {/* Variant */}
                    <Grid item xs={12} sm={6}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Variant
                        </Typography>
                        <Typography>
                          {game.variant === 'holdem' ? 'Texas Hold\'em' : 'Pot-Limit Omaha'}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    {/* Row 2 */}
                    {/* Location */}
                    <Grid item xs={12} sm={6}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Location
                        </Typography>
                        <Typography>
                          {game ? (
                            isConfirmedPlayer ? (
                              <>
                                {game.street && `${game.street}, `}
                                {game.city}
                                {game.zip && `, ${game.zip}`}
                              </>
                            ) : (
                              // Only show city for non-confirmed players
                              <>{game.city}</>
                            )
                          ) : (
                            // Show loading state when game data isn't available yet
                            <Skeleton width={150} />
                          )}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    {/* Buy-in */}
                    <Grid item xs={12} sm={6}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Buy-in
                        </Typography>
                        <Typography>
                          ${game.buyin_min === 0 
                            ? game.buyin_max 
                            : `${game.buyin_min}${game.buyin_min !== game.buyin_max ? ` - $${game.buyin_max}` : ''}`}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    {/* Row 3 */}
                    {/* Blinds - only if greater than 0 */}
                    {(game.blind_small > 0 || game.blind_large > 0) && (
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Blinds
                          </Typography>
                          <Typography>
                            ${game.blind_small}/${game.blind_large}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                    
                    {/* Rebuys */}
                    <Grid item xs={12} sm={6}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Rebuys
                        </Typography>
                        <Typography>
                          {game.rebuy ? 'Allowed' : 'Not allowed'}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    {/* Row 4 */}
                    {/* Bomb Pots */}
                    <Grid item xs={12} sm={6}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Bomb Pots
                        </Typography>
                        <Typography>
                          {game.bomb_pots ? 'Enabled' : 'Disabled'}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    {/* Reservation Fee - only if greater than 0 */}
                    {game.reserve > 0 && (
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Reservation Fee
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography>
                              ${game.reserve}
                            </Typography>
                            {game.reserve_type === 'buyin' && (
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ 
                                  fontStyle: 'italic',
                                  fontSize: '0.75rem'
                                }}
                              >
                                (goes towards buy-in)
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </ContentCard>

                {/* Additional Info Card - Only render if there's a note */}
                {game.note && (
                  <ContentCard>
                    <CardHeader>
                      <SectionTitle>Additional Info</SectionTitle>
                    </CardHeader>
                    <Box sx={{ color: 'text.secondary' }}>
                      <MarkdownRenderer text={game.note} />
                    </Box>
                  </ContentCard>
                )}

                {/* Host Information Card */}
                <ContentCard>
                  <CardHeader>
                    <SectionTitle>Host Information</SectionTitle>
                  </CardHeader>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Avatar 
                        sx={{ 
                          mr: 2, 
                          bgcolor: theme.palette.primary.main,
                          width: 40,
                          height: 40
                        }}
                      >
                        {game.host?.username?.[0]?.toUpperCase() || <PersonIcon />}
                      </Avatar>
                      <Box>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontSize: '1.125rem',
                            fontWeight: 600,
                            mb: 0.5
                          }}
                        >
                          {game.host?.username || 'Anonymous'}
                        </Typography>
                        {user && (userRsvp?.confirmed || user.id === game.host_id) && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            <span>{game.host?.first_name} {game.host?.last_name}</span>
                            {game.host?.payment?.payment_id && (
                              <>
                                <span>•</span>
                                <span>@{game.host.payment.payment_id}</span>
                              </>
                            )}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Reserve Payment Button */}
                    {user && 
                      user.id !== game.host_id && 
                      game.reserve > 0 && 
                      userRsvp && 
                      !userRsvp.confirmed && (
                        <Button
                          size="small"
                          startIcon={<MoneyIcon />}
                          disabled={!game.host?.payment?.payment_id}
                          onClick={() => window.open(
                            `https://venmo.com/${game.host?.payment?.payment_id}?txn=pay&amount=${game.reserve}&note=⛽`,
                            '_blank'
                          )}
                          sx={{ 
                            color: 'text.secondary',
                            fontSize: '0.75rem',
                            '&:hover': {
                              color: 'primary.main'
                            }
                          }}
                        >
                          {game.host?.payment?.payment_id ? 'PAY RESERVE' : 'UNAVAILABLE'}
                        </Button>
                      )}
                  </Box>
                </ContentCard>
              </Box>
            </Grid>

            {/* Players Card - Only show if game is not completed */}
            {game.status !== 'completed' && (
              <Grid item xs={12} lg={4}>
                <ContentCard>
                  <CardHeader>
                    <SectionTitle>
                      Players ({getConfirmedCount()}/{game.seats})
                    </SectionTitle>
                  </CardHeader>

                  {/* Show player list only to logged in users */}
                  {user ? (
                    <StyledList>
                      {sortedRsvps().map((rsvp, index, array) => {
                        const showDivider = index > 0 && 
                          array[index-1].waitlist_position === null && 
                          rsvp.waitlist_position !== null

                        return (
                          <Fragment key={rsvp.id}>
                            {showDivider && (
                              <HoverListItem>
                                <Typography variant="body2" color="text.secondary">
                                  Waitlist
                                </Typography>
                              </HoverListItem>
                            )}
                            <HoverListItem
                              secondaryAction={
                                user?.id === game.host_id && rsvp.user_id !== game.host_id && (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    {/* Only show confirm button if not at max confirmed or this RSVP is already confirmed */}
                                    {(!isAtMaxConfirmed() || rsvp.confirmed) && (
                                      <Tooltip title={rsvp.confirmed ? "Remove Confirmation" : "Confirm Player"}>
                                        <IconButton
                                          onClick={() => handleConfirmRSVP(rsvp.id, !rsvp.confirmed)}
                                          color={rsvp.confirmed ? "success" : "default"}
                                          size="small"
                                        >
                                          {rsvp.confirmed ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    <Tooltip title="Remove Player">
                                      <IconButton
                                        onClick={() => handleRemovePlayer(rsvp.id)}
                                        color="error"
                                        size="small"
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                )
                              }
                            >
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                width: '100%',
                                pr: user?.id === game.host_id ? 8 : 0 // Add padding when host controls are shown
                              }}>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {rsvp.user?.first_name} {rsvp.user?.last_name}
                                </Typography>
                                {rsvp.user_id === game.host_id ? (
                                  <Chip 
                                    label="Host" 
                                    size="small" 
                                    color="primary" 
                                    sx={{ ml: 1 }}
                                  />
                                ) : rsvp.waitlist_position !== null ? (
                                  <Chip 
                                    label={`Waitlist #${rsvp.waitlist_position + 1}`}
                                    size="small"
                                    color="warning"
                                    sx={{ ml: 1 }}
                                  />
                                ) : (
                                  <Chip 
                                    label={rsvp.confirmed ? "Confirmed" : "Pending"}
                                    size="small"
                                    color={rsvp.confirmed ? "success" : "default"}
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </Box>
                            </HoverListItem>
                          </Fragment>
                        )
                      })}
                    </StyledList>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                      Sign in to see player details
                    </Typography>
                  )}

                  {/* RSVP and Log Results buttons */}
                  {(game.status === 'scheduled' || game.status === 'in_progress') && (
                    <>
                      {/* Only show RSVP button if not the host */}
                      {user?.id !== game.host_id && (
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={handleRSVP}
                          sx={{
                            mt: 2,
                            background: userRsvp 
                              ? theme.palette.error.main 
                              : `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                          }}
                        >
                          {!user 
                            ? 'Sign Up to RSVP'
                            : userRsvp 
                            ? 'Cancel RSVP'
                            : isGameFull()
                            ? `Join Waitlist (#${rsvps.filter(r => r.waitlist_position !== null).length + 1})`
                            : game.reserve > 0
                            ? `RSVP - $${game.reserve} Reservation`
                            : 'RSVP'}
                        </Button>
                      )}

                      {/* Show Log Results button for host */}
                      {user?.id === game.host_id && (
                        game.status === 'scheduled' || 
                        game.status === 'in_progress'
                      ) && (
                        <GradientButton
                          fullWidth
                          onClick={() => handleStatusUpdate('completed')}
                          sx={{ mt: 2 }}
                        >
                          Log Results
                        </GradientButton>
                      )}
                    </>
                  )}
                </ContentCard>
              </Grid>
            )}

            {/* Ledger Card - Only show if game is completed, full width, and user was part of the game */}
            {game.status === 'completed' && (
              <Grid item xs={12}>
                {user && (results.some(r => r.user_id === user.id) || user.id === game.host_id) ? (
                  <ContentCard>
                    <CardHeader>
                      <SectionTitle>Ledger</SectionTitle>
                    </CardHeader>
                    {/* Results List - Sort by delta */}
                    {[...results]
                      .sort((a, b) => (b.delta || 0) - (a.delta || 0))
                      .map((result) => (
                        <Box
                          key={result.id}
                          sx={{ 
                            py: 2,
                            px: 2,
                            borderBottom: 1,
                            borderColor: 'divider',
                            '&:last-child': {
                              borderBottom: 0
                            }
                          }}
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <Typography sx={{ fontWeight: 500 }}>
                              {result.user?.username || 'Anonymous'}
                            </Typography>
                            <Typography
                              sx={{
                                fontWeight: 500,
                                color: result.delta > 0 
                                  ? 'success.main' 
                                  : result.delta < 0 
                                  ? 'error.main' 
                                  : 'text.primary'
                              }}
                            >
                              {result.delta > 0 ? '+' : ''}${result.delta}
                            </Typography>
                          </Box>
                          <Box sx={{ 
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mt: 0.5
                          }}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                In: ${result.in}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Out: ${result.out}
                              </Typography>
                            </Box>
                            {result.out > 0 && (
                              (user?.id === game.host_id || user?.id === result.user_id) && (
                                <Button
                                  size="small"
                                  startIcon={<MoneyIcon />}
                                  disabled={!((user?.id === game.host_id ? result.payment?.payment_id : game.host?.payment?.payment_id))}
                                  onClick={() => window.open(
                                    `https://venmo.com/${
                                      user?.id === game.host_id 
                                        ? (result.payment?.payment_id || result.user?.username)
                                        : (game.host?.payment?.payment_id || game.host?.username)
                                    }?txn=${user?.id === game.host_id ? 'pay' : 'request'}&amount=${result.out}&note=⛽`,
                                    '_blank'
                                  )}
                                  sx={{ 
                                    color: 'text.secondary',
                                    fontSize: '0.75rem',
                                    '&:hover': {
                                      color: 'primary.main'
                                    }
                                  }}
                                >
                                  {((user?.id === game.host_id ? result.payment?.payment_id : game.host?.payment?.payment_id))
                                    ? (user?.id === game.host_id ? 'PAY' : 'REQUEST')
                                    : 'UNAVAILABLE'
                                  }
                                </Button>
                              )
                            )}
                          </Box>
                        </Box>
                      ))}
                  </ContentCard>
                ) : (
                  /* Leaderboard Card - Show to users who weren't part of the game */
                  <ContentCard>
                    <CardHeader>
                      <SectionTitle>Leaderboard</SectionTitle>
                    </CardHeader>
                    {/* Top 3 Players */}
                    {[...results]
                      .sort((a, b) => (b.delta || 0) - (a.delta || 0))
                      .slice(0, 3)
                      .map((result, index) => (
                        <Box
                          key={result.id}
                          sx={{ 
                            py: 2,
                            px: 2,
                            borderBottom: 1,
                            borderColor: 'divider',
                            '&:last-child': {
                              borderBottom: 0
                            }
                          }}
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <Typography 
                              component="span" 
                              sx={{ 
                                fontWeight: 600, 
                                color: index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'
                              }}
                            >
                              #{index + 1}
                            </Typography>
                            <Typography component="span" sx={{ fontWeight: 500 }}>
                              {result.user?.username || 'Anonymous'}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                  </ContentCard>
                )}
              </Grid>
            )}

            {/* Chat Section Card - Full width when game is completed */}
            <Grid 
              item 
              xs={12} 
              lg={game.status === 'completed' ? 12 : 8}
              sx={{ 
                order: { xs: 4, lg: 3 }
              }}
            >
              {/* Only render chat card if user is logged in */}
              {user && (
                <ContentCard>
                  <CardHeader>
                    <SectionTitle>Chat</SectionTitle>
                  </CardHeader>
                  <ChatSection 
                    gameId={game.id}
                    userId={user.id}
                    isParticipant={Boolean(userRsvp || game.host_id === user.id)}
                  />
                </ContentCard>
              )}
            </Grid>
          </Grid>
        </ContentWrapper>

        {/* Dialogs */}
        <GameForm 
          open={editMode}
          onClose={() => setEditMode(false)}
          gameId={game.id}
          initialData={game}
          onSuccess={() => {
            fetchGameDetails()
            setEditMode(false)
          }}
        />

        <StyledDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Cancel Game</DialogTitle>
          <DialogContent>
            Are you sure you want to cancel this game? This action cannot be undone.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Keep Game
            </Button>
            <Button 
              onClick={async () => {
                await handleDeleteGame()
                setDeleteDialogOpen(false)
              }}
              color="error"
              variant="contained"
            >
              Cancel Game
            </Button>
          </DialogActions>
        </StyledDialog>

        <GameResultsDialog
          open={showResults}
          onClose={() => setShowResults(false)}
          gameId={game.id}
          players={rsvps}
          existingResults={game.status === 'completed' ? results : undefined}
          isEdit={game.status === 'completed'}
          onComplete={async () => {
            // Update game status after results are saved
            if (game.status !== 'completed') {
              const { error } = await supabase
                .from('games')
                .update({ 
                  status: 'completed',
                  date_end: new Date().toISOString()
                })
                .eq('id', game.id)

              if (error) {
                return
              }
            }

            setShowResults(false)
            fetchGameDetails()
          }}
        />
      </PageWrapper>
    </>
  )
}

export default GameDetails