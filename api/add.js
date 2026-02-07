import { supabase, addLog } from '../lib/supabase.js';

export default async function handler(req, res) {
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
      if (error.code === '23505') { // Unique violation
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
