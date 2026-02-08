import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addLog(action, ipAddress, status) {
  try {
    await supabase
      .from('ip_logs')
      .insert([{ action, ip_address: ipAddress, status }]);
  } catch (error) {
    console.error('Error adding log:', error);
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  const { adminKey, allowAll } = req.body;

  console.log('Toggle request received:', { 
    hasAdminKey: !!adminKey, 
    allowAll,
    expectedKey: process.env.ADMIN_KEY ? 'set' : 'NOT SET'
  });

  if (!adminKey) {
    return res.status(400).json({ 
      success: false, 
      message: 'Admin key required' 
    });
  }

  if (adminKey !== process.env.ADMIN_KEY) {
    console.log('Admin key mismatch');
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid admin key' 
    });
  }

  try {
    // Convert boolean to string for Supabase
    const newValue = allowAll === true ? 'true' : 'false';

    console.log('Updating whitelist_settings to:', newValue);

    // First, check if the setting exists
    const { data: existingData, error: selectError } = await supabase
      .from('whitelist_settings')
      .select('*')
      .eq('setting_key', 'allow_all')
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing setting:', selectError);
      throw selectError;
    }

    let result;
    
    if (!existingData) {
      // Insert if doesn't exist
      console.log('Setting does not exist, inserting...');
      const { data, error } = await supabase
        .from('whitelist_settings')
        .insert([{
          setting_key: 'allow_all',
          setting_value: newValue,
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      result = { data, error: null };
    } else {
      // Update if exists
      console.log('Setting exists, updating...');
      const { data, error } = await supabase
        .from('whitelist_settings')
        .update({ 
          setting_value: newValue, 
          updated_at: new Date().toISOString() 
        })
        .eq('setting_key', 'allow_all')
        .select();

      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      result = { data, error: null };
    }

    console.log('Database operation result:', result);

    await addLog('TOGGLE_ALL', 'system', allowAll ? 'ENABLED' : 'DISABLED');

    console.log('Toggle successful, returning response');

    res.json({ 
      success: true, 
      allow_all: allowAll,
      message: `Allow all ${allowAll ? 'enabled' : 'disabled'} successfully`
    });

  } catch (error) {
    console.error('Error in toggle-all handler:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
}
