import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const appUrl = Deno.env.get('APP_URL')

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !appUrl) {
      throw new Error('Invite email service is not configured')
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: request.headers.get('Authorization') || '' } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return new Response(JSON.stringify({ message: 'You must be signed in.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const { data: profile } = await admin.from('users').select('role, active').eq('id', user.id).single()
    if (profile?.role !== 'head_guard' || profile.active === false) {
      return new Response(JSON.stringify({ message: 'Only active head guards can create invites.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { email, role } = await request.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!normalizedEmail || !['instructor', 'head_guard'].includes(role)) throw new Error('Invite email and role are required')

    const { data: invite, error: inviteError } = await admin
      .from('invites')
      .insert({ email: normalizedEmail, role, created_by: user.id })
      .select('id, email, role, code, used, expires_at, created_at')
      .single()
    if (inviteError) throw inviteError

    const signupUrl = `${appUrl.replace(/\/$/, '')}/?invite=${encodeURIComponent(invite.code)}`
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('INVITE_FROM_EMAIL') || 'Swim Guard <onboarding@resend.dev>',
        to: [normalizedEmail],
        subject: 'Your Swim Guard staff invite',
        text: `You have been invited to Swim Guard as a ${role === 'head_guard' ? 'head guard' : 'instructor'}.\n\nInvite code: ${invite.code}\n\nCreate your account here: ${signupUrl}\n\nThis code expires in 7 days.`,
      }),
    })

    if (!emailResponse.ok) {
      await admin.from('invites').delete().eq('id', invite.id)
      throw new Error('The invite email could not be sent')
    }

    return new Response(JSON.stringify({ invite }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ message: error instanceof Error ? error.message : 'Invite creation failed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
