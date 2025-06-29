const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(bodyParser.json());

// Supabase credentials from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const API_TOKEN = process.env.API_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Middleware to authenticate API token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token === API_TOKEN) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Endpoint TTN calls
app.post('/ttn', async (req, res) => {
  try {
    const uplink = req.body.uplink_message;
    const decoded = uplink.decoded_payload;
    const device = req.body.end_device_ids.device_id;

    const { error } = await supabase
      .from('sensor_data')
      .insert({
        device_id: device,
        battery_main: decoded.battery_main,
        battery_node: decoded.battery_node,
        period_in: decoded.period_in,
        period_out: decoded.period_out,
        total_in: decoded.total_in,
        total_out: decoded.total_out
      });

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Protected endpoint
app.get('/device/:device/status', authenticateToken, async (req, res) => {
  const device = req.params.device;

  const { data, error } = await supabase
    .from('sensor_data')
    .select()
    .eq('device_id', device)
    .order('id', { ascending: false })
    .limit(1);

  if (error) return res.status(500).send({ error: error.message });
  if (!data.length) return res.status(404).send({ error: 'No data found' });

  res.json(data[0]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
