import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  useTheme
} from '@mui/material'
import { Person as PersonIcon } from '@mui/icons-material'
import { format } from 'date-fns'
import { ChatContainer, ChatMessageList, ChatInput, MessageBubble } from '../styled/Chat'

export interface ChatMessage {
  id: string
  user_id: string
  message: string
  created_at: string
  user?: {
    first_name?: string
    last_name?: string
    username?: string
  }
}

interface ChatProps {
  messages: ChatMessage[]
  currentUserId: string
  isParticipant: boolean
  onSendMessage: (message: string) => Promise<void>
  emptyMessage?: string
  nonParticipantMessage?: string
}

export const Chat = ({ 
  messages, 
  currentUserId, 
  isParticipant,
  onSendMessage,
  emptyMessage = "No messages yet. Start the conversation!",
  nonParticipantMessage = "Only participants can view and send messages."
}: ChatProps) => {
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const theme = useTheme()
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    // Only scroll the chat container itself, not the entire page
    if (messagesEndRef.current) {
      // If it's the initial load, don't scroll
      if (isInitialLoad) {
        setIsInitialLoad(false)
        return
      }
      
      // For subsequent message updates, scroll the chat container
      const chatContainer = messagesEndRef.current.closest('.MuiList-root')
      if (chatContainer && chatContainer.parentElement) {
        chatContainer.parentElement.scrollTop = chatContainer.parentElement.scrollHeight
      }
    }
  }, [messages, isInitialLoad])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !isParticipant) return

    try {
      await onSendMessage(newMessage.trim())
      setNewMessage('')
      
      // Manually scroll to bottom when the current user sends a message
      setTimeout(() => {
        const chatContainer = messagesEndRef.current?.closest('.MuiList-root')
        if (chatContainer && chatContainer.parentElement) {
          chatContainer.parentElement.scrollTop = chatContainer.parentElement.scrollHeight
        }
      }, 100)
    } catch (err) {
      // Remove all console.error statements
    }
  }

  return (
    <Box>
      <ChatContainer>
        <List>
          {messages.length === 0 ? (
            <ListItem sx={{ justifyContent: 'center', height: '100%' }}>
              <ListItemText 
                sx={{ 
                  textAlign: 'center',
                  color: 'text.secondary',
                  fontStyle: 'italic'
                }}
                primary={isParticipant ? emptyMessage : nonParticipantMessage}
              />
            </ListItem>
          ) : (
            <ChatMessageList>
              {messages.map((message) => {
                const isCurrentUser = message.user_id === currentUserId
                return (
                  <ListItem 
                    key={message.id}
                    sx={{
                      flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                      py: 1,
                      px: 0
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: isCurrentUser 
                            ? theme.palette.primary.main 
                            : theme.palette.secondary.main,
                          ml: isCurrentUser ? 1 : 0,
                          mr: isCurrentUser ? 0 : 1,
                          fontSize: '0.875rem'
                        }}
                      >
                        {message.user?.first_name?.[0] || <PersonIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      sx={{
                        margin: 0,
                        '.MuiListItemText-primary': {
                          display: 'flex',
                          justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                          mb: 0.5
                        }
                      }}
                      primary={
                        <Typography 
                          component="span" 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: 1,
                            flexDirection: isCurrentUser ? 'row-reverse' : 'row'
                          }}
                        >
                          <Typography component="span" variant="subtitle2" sx={{ fontSize: '0.875rem' }}>
                            {message.user?.first_name} {message.user?.last_name}
                          </Typography>
                          <Typography 
                            component="span"
                            variant="caption" 
                            color="text.secondary"
                            sx={{ fontSize: '0.75rem' }}
                          >
                            {format(new Date(message.created_at), 'MMM d/yy')} {format(new Date(message.created_at), 'h:mm a')}
                          </Typography>
                        </Typography>
                      }
                      secondary={
                        <Typography 
                          component="span" 
                          sx={{ 
                            display: 'flex',
                            justifyContent: isCurrentUser ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <MessageBubble isCurrentUser={isCurrentUser}>
                            {message.message}
                          </MessageBubble>
                        </Typography>
                      }
                    />
                  </ListItem>
                )
              })}
              <div ref={messagesEndRef} />
            </ChatMessageList>
          )}
        </List>
      </ChatContainer>

      {isParticipant && (
        <Box 
          component="form" 
          onSubmit={handleSubmit} 
          sx={{ 
            display: 'flex', 
            gap: 1,
            position: 'relative'
          }}
        >
          <ChatInput
            fullWidth
            size="small"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Button 
            type="submit"
            variant="contained"
            disabled={!newMessage.trim()}
            sx={{ 
              borderRadius: 2,
              px: 3,
              minWidth: 'auto'
            }}
          >
            Send
          </Button>
        </Box>
      )}
    </Box>
  )
} 