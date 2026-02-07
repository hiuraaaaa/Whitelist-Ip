import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

  const { adminKey } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid admin key' 
    });
  }

  try {
    // Get all IPs
    const { data: ips, error: ipsError } = await supabase
      .from('ip_whitelist')
      .select('*')
      .order('added_at', { ascending: false });

    if (ipsError) throw ipsError;

    // Get allow_all setting
    const { data: settings } = await supabase
      .from('whitelist_settings')
      .select('setting_value')
      .eq('setting_key', 'allow_all')
      .single();

    // Get recent logs
    const { data: logs, error: logsError } = await supabase
      .from('ip_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (logsError) throw logsError;

    res.json({ 
      success: true,
      allowed_ips: ips.map(ip => ip.ip_address),
      ip_details: ips,
      allow_all: settings?.setting_value === 'true',
      logs: logs,
      total: ips.length
    });

  } catch (error) {
    console.error('Error listing IPs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}
