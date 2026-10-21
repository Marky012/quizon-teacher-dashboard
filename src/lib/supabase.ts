import { createClient } from '@supabase/supabase-js'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'

/* ===========================================================================
   THE SUPABASE CLIENT.

   The URL and the publishable key are PUBLIC. They are in the shipped
   JavaScript bundle and anyone can read them. That is not a leak, it is how
   Supabase works: the publishable key identifies the project, and Row Level
   Security is what decides what it may read.

   The secret key, which bypasses RLS, exists ONLY inside the sync edge
   function. It is never in this repository and never in this bundle.

   WHAT A LEAKED PUBLISHABLE KEY WOULD BUY AN ATTACKER: the ability to try
   to read and write rows. RLS refuses every read outside the teacher's own
   classes and refuses every write to a student row, so the attempt returns
   nothing useful. The one thing it CAN do is write into a class whose code
   it knows, which is exactly the capability the class code is meant to be.
   =========================================================================== */

export const configured = true

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
