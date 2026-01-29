exports.handler = async (event) => {
  // Hanya izinkan metode POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { prompt, images } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    // Pastikan API_KEY ada
    if (!API_KEY) {
      throw new Error("API Key tidak ditemukan di Environment Variables Netlify");
    }

    // Susun isi pesan untuk Gemini (Mendukung Teks + Gambar)
    const contents = [{
      parts: [
        { text: prompt },
        ...(images || []).map(img => ({
          inline_data: { mime_type: "image/jpeg", data: img }
        }))
      ]
    }];

    // Gunakan URL endpoint versi 1.5-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error("Error di Function:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: err.message }) 
    };
  }
};
