// 1. Fungsi Utama Analisis
async function processAI() {
    const promptInput = document.getElementById('ai-prompt');
    const fileInput = document.getElementById('sketch-upload');
    const btn = document.getElementById('btn-analyze');

    if (!promptInput.value && fileInput.files.length === 0) {
        alert("Mohon masukkan deskripsi atau upload gambar sketsa.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = "Sedang Menganalisis...";

    try {
        let base64Image = null;
        if (fileInput.files.length > 0) {
            base64Image = await toBase64(fileInput.files[0]);
        }

        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: `Analisis furniture ini: ${promptInput.value}. Berikan output HANYA dalam format JSON array: [{"nama": "Bagian", "p": 100, "l": 50, "qty": 1, "material": "18MM"}]`,
                images: base64Image ? [base64Image.split(',')[1]] : []
            })
        });

        if (!response.ok) throw new Error("Server Netlify bermasalah (502/500)");

        const result = await response.json();

        // 2. PENYARING ERROR (Solusi Gambar 11 & 12)
        if (result && result.candidates && result.candidates[0] && result.candidates[0].content) {
            let aiText = result.candidates[0].content.parts[0].text;
            
            // Bersihkan teks jika AI memberikan format ```json ... ```
            const cleanJson = aiText.replace(/```json|```/g, "").trim();
            const cutListData = JSON.parse(cleanJson);
            
            // Panggil fungsi untuk mengisi tabel
            updateTable(cutListData);
            alert("Analisis Berhasil!");
        } else {
            throw new Error("AI tidak memberikan jawaban yang valid.");
        }

    } catch (error) {
        console.error("Detail Error:", error);
        alert("GAGAL ANALISIS AI: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = "ANALISIS KONSTRUKSI";
    }
}

// 3. Fungsi Pendukung
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function updateTable(data) {
    // Sesuaikan dengan fungsi tambah baris yang sudah ada di script Anda sebelumnya
    const tableBody = document.querySelector('#cutting-list-body'); 
    if(tableBody) tableBody.innerHTML = ''; // Bersihkan tabel lama
    
    data.forEach(item => {
        // Panggil fungsi addRow Anda di sini
        if (typeof addRow === "function") {
            addRow(item.nama, item.p, item.l, item.qty, item.material);
        }
    });
}
