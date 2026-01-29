const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Hanya boleh POST" };
  }

  try {
    const { prompt, images } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    // Menyusun data untuk dikirim ke Gemini (Teks + Gambar)
    const contents = [{
      parts: [
        { text: prompt },
        ...images.map(img => ({
          inline_data: { mime_type: "image/jpeg", data: img }
        }))
      ]
    }];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: err.toString() };
  }
};
