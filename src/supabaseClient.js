import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://dhpfxourfmccblvdwcjy.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRocGZ4b3VyZm1jY2JsdmR3Y2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTg1ODIsImV4cCI6MjA3NTQzNDU4Mn0.9xm9wDw6d_6aDVWwP0M7KPmpFkuvmK9UusUGuLA_CZA"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
