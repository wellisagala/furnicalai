// Gunakan node-fetch jika menggunakan Node.js versi lama, 
// tapi untuk versi terbaru di Netlify, fetch sudah tersedia otomatis.

exports.handler = async (event, context) => {
  // 1. Izinkan akses dari browser (CORS)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Tangani preflight request dari browser
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  }

  try {
    const { prompt, images } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: "API Key belum diset di Netlify" }) 
      };
    }

    // Susun data untuk dikirim ke Google Gemini
    const contents = [{
      parts: [
        { text: prompt },
        ...(images || []).map(img => ({
          inline_data: { mime_type: "image/jpeg", data: img }
        }))
      ]
    }];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error("Error detail:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
