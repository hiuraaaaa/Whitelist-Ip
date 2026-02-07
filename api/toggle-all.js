import { supabase, addLog } from '../lib/supabase.js';

export default async function handler(req, res) {
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
