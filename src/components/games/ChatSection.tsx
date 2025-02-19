import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  alpha,
  useTheme
} from '@mui/material'
import { Person as PersonIcon, Send as SendIcon } from '@mui/icons-material'
import { Message } from '../../types/database'
import { supabase } from '../../config/supabaseClient'
import { format } from 'date-fns'

interface ChatSectionProps {
  gameId: string
  userId: string
  isParticipant: boolean
}

export const ChatSection = ({ gameId, userId, isParticipant }: ChatSectionProps) => {
  const theme = useTheme()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    fetchMessages()
    
    // Create a specific channel for this game's messages
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
          console.log('New message received:', payload)
          // Fetch the complete message with user information
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
            console.error('Error fetching new message:', error)
            return
          }

          console.log('Fetched new message:', newMessage)
          setMessages(prev => [...prev, newMessage])
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    return () => {
      console.log('Unsubscribing from channel')
      channel.unsubscribe()
    }
  }, [gameId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
      console.error('Error fetching messages:', error)
      return
    }

    setMessages(data || [])
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !isParticipant) return

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          game_id: gameId,
          user_id: userId,
          message: newMessage.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      setNewMessage('')
    } catch (err) {
      console.error('Error sending message:', err)
    }
  }

  if (!isParticipant) return null

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>Chat</Typography>
      <Paper 
        variant="outlined"
        sx={{ 
          p: 2,
          background: alpha(theme.palette.background.paper, 0.5)
        }}
      >
        <Box 
          sx={{ 
            height: 400, 
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <List 
            sx={{ 
              flex: 1,
              overflow: 'auto',
              bgcolor: 'background.paper',
              borderRadius: 1,
              mb: 2
            }}
          >
            {messages.map((message) => {
              const isCurrentUser = message.user_id === userId

              return (
                <ListItem 
                  key={message.id}
                  sx={{
                    flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.05)
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: isCurrentUser 
                          ? theme.palette.primary.main 
                          : theme.palette.secondary.main,
                        ml: isCurrentUser ? 2 : 0,
                        mr: isCurrentUser ? 0 : 2
                      }}
                    >
                      {message.user?.first_name?.[0] || <PersonIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    sx={{
                      '.MuiListItemText-primary': {
                        display: 'flex',
                        justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                      },
                      '.MuiListItemText-secondary': {
                        width: '100%',
                        display: 'flex',
                        justifyContent: isCurrentUser ? 'flex-end' : 'flex-start'
                      }
                    }}
                    primary={
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                        width: '100%',
                        mb: 0.5
                      }}>
                        <Typography variant="subtitle2">
                          {message.user?.first_name} {message.user?.last_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(message.created_at), 'h:mm a')}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ 
                        width: '100%',
                        display: 'flex',
                        justifyContent: isCurrentUser ? 'flex-end' : 'flex-start'
                      }}>
                        <Typography
                          sx={{
                            bgcolor: isCurrentUser 
                              ? alpha(theme.palette.primary.main, 0.1)
                              : alpha(theme.palette.grey[200], 0.5),
                            borderRadius: 2,
                            px: 2,
                            py: 1,
                            maxWidth: '80%'
                          }}
                        >
                          {message.message}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              )
            })}
            <div ref={messagesEndRef} />
          </List>

          <form onSubmit={handleSendMessage}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                variant="outlined"
              />
              <Button
                type="submit"
                variant="contained"
                disabled={!newMessage.trim()}
                endIcon={<SendIcon />}
              >
                Send
              </Button>
            </Box>
          </form>
        </Box>
      </Paper>
    </Box>
  )
} 