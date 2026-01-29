exports.handler = async (event) => {
  // Hanya menerima request POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Hanya boleh POST" };
  }

  const { prompt } = JSON.parse(event.body);
  const API_KEY = process.env.GEMINI_API_KEY; // Diambil aman dari server Netlify

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });