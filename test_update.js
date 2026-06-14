import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const { data: donee } = await supabase.from('donees').select('id, funded_credit').limit(1).single();
  if (!donee) return;

  console.log('Current credit:', donee.funded_credit);
  const newCredit = (Number(donee.funded_credit) || 0) + 10;

  const { error } = await supabase
    .from('donees')
    .update({ funded_credit: newCredit })
    .eq('id', donee.id);

  if (error) {
    console.error('Donee Update failed:', error);
  } else {
    console.log('Donee Update succeeded! New credit:', newCredit);
  }
}

testUpdate();
