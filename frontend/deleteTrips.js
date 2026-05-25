require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const folios = ['TR-6151', 'TR-552151', 'TR-569266', 'TR569266'];
  const { data, error } = await supabase.from('trips').delete().in('folio', folios);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success deleting trips!');
  }
}

run();
