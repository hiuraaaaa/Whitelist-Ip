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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { adminKey, allowAll } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid admin key' 
    });
  }

  try {
    const newValue = allowAll === true ? 'true' : 'false';

    const { error } = await supabase
      .from('whitelist_settings')
      .update({ setting_value: newValue, updated_at: new Date() })
      .eq('setting_key', 'allow_all');

    if (error) throw error;

    await addLog('TOGGLE_ALL', 'system', allowAll ? 'ENABLED' : 'DISABLED');

    res.json({ 
      success: true, 
      allow_all: allowAll 
    });

  } catch (error) {
    console.error('Error toggling allow all:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}
