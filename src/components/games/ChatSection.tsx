import { useState, useEffect, useRef } from 'react'
import { Chat, ChatMessage } from '../chat/Chat'
import { supabase } from '../../config/supabaseClient'

interface ChatSectionProps {
  gameId: string
  userId: string
  isParticipant: boolean
}

export const ChatSection = ({ gameId, userId, isParticipant }: ChatSectionProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const isInitialFetchRef = useRef(true)

  useEffect(() => {
    fetchMessages()
    setupSubscription()
    
    return () => {
      isInitialFetchRef.current = true
    }
  }, [gameId])

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        user:users(
          first_name,
          last_name,
          username
        )
      `)
      .eq('game_id', gameId)
      .order('created_at', { ascending: true })

    if (error) {
      return
    }

    // Set messages without triggering scroll on initial load
    setMessages(data || [])
    isInitialFetchRef.current = false
  }

  const setupSubscription = () => {
    const channel = supabase.channel(`game-${gameId}-messages`)
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `game_id=eq.${gameId}`
        },
        async (payload) => {
          const { data: newMessage, error } = await supabase
            .from('messages')
            .select(`
              *,
              user:users(
                first_name,
                last_name,
                username
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (error) {
            return
          }

          setMessages(prev => [...prev, newMessage])
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  const handleSendMessage = async (message: string) => {
    const { error } = await supabase
      .from('messages')
      .insert({
        game_id: gameId,
        user_id: userId,
        message,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (error) {
      throw error
    }
  }

  return (
    <Chat
      messages={messages}
      currentUserId={userId}
      isParticipant={isParticipant}
      onSendMessage={handleSendMessage}
    />
  )
} 