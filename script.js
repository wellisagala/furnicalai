async function processAI() {
    if (uploadedImages.length === 0) return showToast("Harap upload sketsa terlebih dahulu");
    
    const btn = document.getElementById('btnAnalyze');
    const userPrompt = document.getElementById('aiPrompt').value;
    
    btn.disabled = true; 
    btn.innerText = "Menganalisis...";

    try {
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: (userPrompt || "Analisis sketsa ini menjadi daftar potong.") + 
                        " Jawab HANYA dengan format JSON murni: {\"items\": [{\"name\": \"Bagian\", \"p\": 100, \"l\": 50, \"qty\": 1, \"hpl\": 1, \"type\": \"plywood\"}]}",
                images: uploadedImages.map(img => img.split(',')[1])
            })
        });

        const data = await response.json();
        
        // Validasi jika ada error dari server
        if (data.error) throw new Error(data.error);

        // MEMBERSIHKAN JAWABAN AI (Mencegah error 'reading 0')
        let rawText = data.candidates[0].content.parts[0].text;
        const cleanJson = rawText.replace(/```json|```/g, "").trim();
        const result = JSON.parse(cleanJson);

        if (result.items && Array.isArray(result.items)) {
            document.getElementById('materialList').innerHTML = "";
            result.items.forEach(item => {
                addRow(item.name || "Bagian", item.p, item.l, item.qty || 1, item.hpl || 1, item.type || "plywood");
            });
            calculate();
            showToast("Analisis Berhasil!");
        }
    } catch (err) {
        console.error("Detail Error:", err);
        showToast("Gagal: " + err.message);
    } finally {
        btn.disabled = false; 
        btn.innerText = "Analisis Konstruksi";
    }
}
