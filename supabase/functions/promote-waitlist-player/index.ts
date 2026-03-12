import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    try {
        const { game_id } = await req.json()

        // Initialize Supabase admin client to bypass RLS
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get the game seats
        const { data: game, error: gameError } = await supabaseAdmin
            .from('games')
            .select('seats')
            .eq('id', game_id)
            .single()

        if (gameError || !game) {
            throw new Error('Game not found')
        }

        // 2. Count current actual players holding a seat (Confirmed + Pending)
        const { count: seatsTaken, error: countError } = await supabaseAdmin
            .from('rsvp')
            .select('*', { count: 'exact', head: true })
            .eq('game_id', game_id)
            .is('waitlist_position', null)

        if (countError) {
            throw countError
        }

        // 3. If there are still seats available, find the next person on the waitlist
        if ((seatsTaken || 0) < game.seats) {
            const { data: waitlistPlayers, error: waitlistError } = await supabaseAdmin
                .from('rsvp')
                .select('*')
                .eq('game_id', game_id)
                .not('waitlist_position', 'is', null)
                .order('waitlist_position', { ascending: true })
                .order('created_at', { ascending: true })
                .limit(1)

            if (waitlistError) {
                throw waitlistError
            }

            if (waitlistPlayers && waitlistPlayers.length > 0) {
                const nextPlayer = waitlistPlayers[0]

                // 4. Erase their waitlist position (making them Pending)
                const { error: updateError } = await supabaseAdmin
                    .from('rsvp')
                    .update({
                        waitlist_position: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', nextPlayer.id)

                if (updateError) {
                    throw updateError
                }

                // 5. Resequence the remaining waitlist numbers
                const { data: remainingWaitlist, error: remainingError } = await supabaseAdmin
                    .from('rsvp')
                    .select('*')
                    .eq('game_id', game_id)
                    .not('waitlist_position', 'is', null)
                    .order('waitlist_position', { ascending: true })
                    .order('created_at', { ascending: true })

                if (remainingError) {
                    throw remainingError
                }

                if (remainingWaitlist && remainingWaitlist.length > 0) {
                    // Update everyone's waitlist position sequentially starting from 0
                    for (let i = 0; i < remainingWaitlist.length; i++) {
                        await supabaseAdmin
                            .from('rsvp')
                            .update({
                                waitlist_position: i,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', remainingWaitlist[i].id)
                    }
                }
            }
        }

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
