// Fungsi utama untuk mengirim data ke AI
async function processAI() {
    const promptInput = document.getElementById('ai-prompt');
    const fileInput = document.getElementById('sketch-upload');
    const btn = document.getElementById('btn-analyze');

    if (!promptInput.value && fileInput.files.length === 0) {
        alert("Mohon masukkan deskripsi atau upload gambar sketsa.");
        return;
    }

    // Ubah status tombol
    btn.disabled = true;
    btn.innerHTML = "Sedang Menganalisis...";

    try {
        let base64Image = null;
        if (fileInput.files.length > 0) {
            base64Image = await toBase64(fileInput.files[0]);
        }

        // Memanggil Netlify Function
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: `Analisis gambar/deskripsi furniture ini: ${promptInput.value}. 
                        Berikan output HANYA dalam format JSON array seperti contoh ini: 
                        [{"nama": "Body Samping", "p": 200, "l": 60, "qty": 2, "material": "18MM"}]`,
                images: base64Image ? [base64Image.split(',')[1]] : []
            })
        });

        // --- BAGIAN YANG TADI ANDA CARI ---
        const result = await response.json();

        // Validasi respon agar tidak error "reading 0"
        if (result && result.candidates && result.candidates[0]) {
            let aiText = result.candidates[0].content.parts[0].text;
            
            // Bersihkan teks dari karakter ```json atau ```
            const cleanJson = aiText.replace(/```json|```/g, "").trim();
            const cutListData = JSON.parse(cleanJson);
            
            // Masukkan data ke tabel (Fungsi updateTable harus ada di bawah)
            updateTable(cutListData);
            alert("Analisis Berhasil!");
        } else {
            throw new Error("Respon AI tidak valid");
        }

    } catch (error) {
        console.error("Detail Error:", error);
        alert("Gagal Analisis AI: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = "ANALISIS KONSTRUKSI";
    }
}

// Fungsi pembantu untuk konversi gambar
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Fungsi untuk mengisi tabel otomatis
function updateTable(data) {
    // Pastikan fungsi ini sesuai dengan cara Anda menambah baris di tabel
    // Contoh sederhana:
    data.forEach(item => {
        addRow(item.nama, item.p, item.l, item.qty, item.material);
    });
}
