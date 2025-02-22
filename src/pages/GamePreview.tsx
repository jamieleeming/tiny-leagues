import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabaseClient'
import { Helmet } from 'react-helmet-async'

export default function GamePreview() {
  const { id } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const { data: game } = await supabase
          .from('games')
          .select(`
            *,
            host:users!games_host_id_fkey(username)
          `)
          .eq('id', id)
          .single()

        if (game) {
          console.log('Game found, redirecting...');
          // Redirect to actual game page after a short delay
          setTimeout(() => navigate(`/games/${id}`), 500)
        } else {
          console.log('Game not found');
        }
      } catch (error) {
        console.error('Error fetching game:', error);
      }
    }

    fetchGame()
  }, [id, navigate])

  return (
    <>
      <Helmet>
        <title>Tiny Leagues Poker Game</title>
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Tiny Leagues Poker" />
        <meta property="og:url" content={`https://jamieleeming.github.io/tiny-leagues/preview/${id}`} />
        <meta property="og:title" content="Poker Game" />
        <meta property="og:description" content="View poker game details on Tiny Leagues" />
        <meta property="og:image" content="https://zlsmhizixetvplocbulz.supabase.co/storage/v1/object/public/tiny-leagues-assets/poker-preview.png" />
        <meta property="og:image:secure_url" content="https://zlsmhizixetvplocbulz.supabase.co/storage/v1/object/public/tiny-leagues-assets/poker-preview.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: '#fff'
      }}>
        Redirecting to game...
      </div>
    </>
  )
} 