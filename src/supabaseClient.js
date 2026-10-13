import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://azxgqutcixsbtwrdeghm.supabase.co'

const supabasePublishableKey ='sb_publishable_seUvDIAeMNKDGd9H9PoNFg_LJJOc5U4'

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
)
