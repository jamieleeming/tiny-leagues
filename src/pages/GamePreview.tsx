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
          setTimeout(() => navigate(`/games/${id}`), 500)
        }
      } catch (error) {
        // No console.error statements
      }
    }

    fetchGame()
  }, [id, navigate])

  return (
    <>
      <Helmet>
        <title>Tiny Leagues - Game Preview</title>
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Tiny Leagues Poker" />
        <meta property="og:url" content={`https://tinyleagues.co/games/${id}`} />
        <meta property="og:title" content="Poker Game" />
        <meta property="og:description" content="View poker game details on Tiny Leagues" />
        <meta property="og:image" itemProp="image" content="https://zlsmhizixetvplocbulz.supabase.co/storage/v1/object/public/tiny-leagues-assets/poker-preview-256.png" />
        <meta property="og:image:secure_url" content="https://zlsmhizixetvplocbulz.supabase.co/storage/v1/object/public/tiny-leagues-assets/poker-preview-256.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="256" />
        <meta property="og:image:height" content="256" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://zlsmhizixetvplocbulz.supabase.co/storage/v1/object/public/tiny-leagues-assets/poker-preview-256.png" />
        <meta property="og:locale" content="en_US" />
        <link itemProp="thumbnailUrl" href="https://zlsmhizixetvplocbulz.supabase.co/storage/v1/object/public/tiny-leagues-assets/poker-preview-256.png" />
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