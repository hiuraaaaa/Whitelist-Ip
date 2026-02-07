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
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ipAddress } = req.body;

  if (!ipAddress) {
    return res.status(400).json({ 
      allowed: false, 
      message: 'IP address required' 
    });
  }

  try {
    // Check allow_all setting
    const { data: settings } = await supabase
      .from('whitelist_settings')
      .select('setting_value')
      .eq('setting_key', 'allow_all')
      .single();

    const allowAll = settings?.setting_value === 'true';

    if (allowAll) {
      await addLog('CHECK', ipAddress, 'ALLOWED_ALL');
      return res.json({ 
        allowed: true, 
        ip: ipAddress,
        reason: 'allow_all_enabled',
        timestamp: new Date().toISOString()
      });
    }

    // Check specific IP
    const { data: ipData } = await supabase
      .from('ip_whitelist')
      .select('*')
      .eq('ip_address', ipAddress)
      .single();

    const allowed = !!ipData;

    await addLog('CHECK', ipAddress, allowed ? 'ALLOWED' : 'BLOCKED');

    res.json({ 
      allowed,
      ip: ipAddress,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking IP:', error);
    res.status(500).json({ 
      allowed: false, 
      message: 'Internal server error' 
    });
  }
}
