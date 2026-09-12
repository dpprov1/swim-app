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
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Account deletion service is not configured')

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: request.headers.get('Authorization') || '' } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return new Response(JSON.stringify({ message: 'You must be signed in.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'instructor') {
      return new Response(JSON.stringify({ message: 'Only instructor accounts can self-delete.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await admin.from('notifications').delete().eq('recipient_id', user.id)
    await admin.from('notes').delete().eq('author_id', user.id)
    await admin.from('sessions').delete().eq('instructor_id', user.id)
    await admin.from('invites').update({ created_by: null }).eq('created_by', user.id)
    await admin.from('students').update({ created_by: null }).eq('created_by', user.id)
    await admin.from('users').delete().eq('id', user.id)

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id)
    if (authDeleteError) throw authDeleteError

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ message: error instanceof Error ? error.message : 'Account deletion failed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
