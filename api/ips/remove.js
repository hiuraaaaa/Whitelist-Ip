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

  const { ipAddress, adminKey } = req.body;

  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid admin key' 
    });
  }

  if (!ipAddress) {
    return res.status(400).json({ 
      success: false, 
      message: 'IP address required' 
    });
  }

  try {
    const { data, error } = await supabase
      .from('ip_whitelist')
      .delete()
      .eq('ip_address', ipAddress)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.json({ 
        success: false, 
        message: 'IP not found' 
      });
    }

    await addLog('REMOVE', ipAddress, 'SUCCESS');

    res.json({ 
      success: true, 
      message: 'IP removed successfully' 
    });

  } catch (error) {
    console.error('Error removing IP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}
