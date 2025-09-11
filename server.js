const express = require('express');
const OpenAI = require('openai');

const app = express();
app.use(express.json({ limit: '10mb' }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/parseScreenshot', async (req, res) => {
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: 'Create the following JSON, based on the image:\n{ ... }' },
            { type: 'input_image', image_base64: req.body.image }
          ]
        }
      ]
    });
    res.json(JSON.parse(response.choices[0].message.content));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to parse screenshot' });
  }
});

app.use(express.static('.'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));

