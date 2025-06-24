const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(bodyParser.json());

// Load from Render environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Endpoint TTN uses to send uplinks
app.post('/ttn', async (req, res) => {
  try {
    const uplink = req.body.uplink_message;
    const decoded = uplink.decoded_payload;
    const device = req.body.end_device_ids.device_id;

    const { data, error } = await supabase
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

    res.status(200).send({ success: true });
  } catch (err) {
    console.error(' Error receiving TTN uplink:', err.message);
    res.status(500).send({ error: err.message });
  }
});

// Public endpoint for latest sensor status
app.get('/device/:device/status', async (req, res) => {
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` API server running on port ${PORT}`);
});
