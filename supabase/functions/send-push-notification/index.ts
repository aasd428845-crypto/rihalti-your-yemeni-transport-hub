import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY')

interface NotificationPayload {
  userId?: string
  userIds?: string[]
  targetRole?: string
  title: string
  body: string
  sound?: string
  data?: Record<string, unknown>
  url?: string
  image?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload: NotificationPayload = await req.json()

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      throw new Error('OneSignal credentials not configured')
    }

    // Build targeting
    const notificationBody: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { ar: payload.title, en: payload.title },
      contents: { ar: payload.body, en: payload.body },
      data: payload.data || {},
      url: payload.url,
      ios_sound: payload.sound || 'default',
      android_sound: payload.sound || 'default',
      big_picture: payload.image,
      priority: 10,
      ttl: 86400,
    }

    if (payload.userId) {
      notificationBody.include_external_user_ids = [payload.userId]
    } else if (payload.userIds && payload.userIds.length > 0) {
      notificationBody.include_external_user_ids = payload.userIds
    } else if (payload.targetRole) {
      notificationBody.filters = [
        { field: 'tag', key: 'role', relation: '=', value: payload.targetRole }
      ]
    } else {
      // Send to all subscribed users
      notificationBody.included_segments = ['Subscribed Users']
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(notificationBody),
    })

    const result = await response.json()
    await response.body?.cancel()

    // Log notification in DB
    if (payload.userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)

      await supabase.from('notification_logs').insert({
        user_id: payload.userId,
        title: payload.title,
        body: payload.body,
        type: (payload.data as any)?.type || 'system',
        sound: payload.sound,
        data: payload.data,
      })

      // Also insert into notifications table for in-app display
      await supabase.from('notifications').insert({
        user_id: payload.userId,
        title: payload.title,
        body: payload.body,
        data: payload.data,
      })
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
