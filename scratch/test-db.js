const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // try loading from .env

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key configured:", !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('trip_type', 'clinico')
      .neq('status', 'cancelado');
      
    if (error) {
      console.error("Error querying trips:", error);
      return;
    }
    
    console.log(`Found ${data.length} clinical trips total.`);
    data.forEach(t => {
      console.log(`ID: ${t.id}, Date: ${t.scheduled_date}, Patient: ${t.patient_name}, Status: ${t.status}, Staff: ${t.assigned_clinical_staff}`);
    });
  } catch (err) {
    console.error("Exec error:", err);
  }
}

run();
