// server.js (Node.js/Express backend sample)
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // or native fetch if supported
const app = express();

app.use(bodyParser.json());

app.post('/api/generate', async (req, res) => {
  const prompt = req.body.prompt;
  try {
    // Adjust the URL, model name, and parameters according to deepseek‑r1 requirements.
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "deepseek-r1:latest",
        prompt,
        stream: false
      })
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: "Error calling deepseek-r1" });
    }
    const data = await response.json();
    // Assume deepseek‑r1 returns an object with a "response" field.
    res.json({ response: data.response });
  } catch (error) {
    console.error('Error generating response:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend server listening on port ${PORT}`));
