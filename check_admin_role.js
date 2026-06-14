import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmin() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', '03000000000');

  if (error) {
    console.error('Error fetching admin profile:', error);
  } else {
    console.log('Admin Profile:', profiles);
  }
}

checkAdmin();
