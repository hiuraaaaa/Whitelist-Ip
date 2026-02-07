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

  const { ipAddress, adminKey, notes } = req.body;

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
      .insert([
        { 
          ip_address: ipAddress, 
          notes: notes || null,
          added_by: 'admin'
        }
      ])
      .select();

    if (error) {
      if (error.code === '23505') {
        return res.json({ 
          success: false, 
          message: 'IP already exists' 
        });
      }
      throw error;
    }

    await addLog('ADD', ipAddress, 'SUCCESS');

    res.json({ 
      success: true, 
      message: 'IP added successfully',
      data: data[0]
    });

  } catch (error) {
    console.error('Error adding IP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}
