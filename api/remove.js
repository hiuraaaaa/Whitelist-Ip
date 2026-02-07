import { supabase, addLog } from '../lib/supabase.js';

export default async function handler(req, res) {
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
