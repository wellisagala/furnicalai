// VARIABEL GLOBAL - Harus di paling atas agar tidak error 'not defined'
let currentUnit = "cm";
let uploadedImages = [];
let isManualVolume = true;

// 1. FUNGSI ANALISIS AI
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

        if (!response.ok) throw new Error("Gagal menghubungi server");
        const data = await response.json();
        
        // Pembersih JSON agar tidak error 'reading 0'
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

// 2. FUNGSI UPLOAD GAMBAR
function handleImageUpload(e) {
    const files = e.target.files;
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImages.push(event.target.result);
            renderGallery();
        };
        reader.readAsDataURL(file);
    });
}

function renderGallery() {
    const container = document.getElementById('imageGallery');
    if(!container) return;
    container.innerHTML = uploadedImages.map((img, i) => `
        <div class="relative w-14 h-14">
            <img src="${img}" class="w-full h-full object-cover rounded-lg border border-slate-700">
            <button onclick="removeImg(${i})" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">×</button>
        </div>
    `).join('');
}

function removeImg(i) { uploadedImages.splice(i, 1); renderGallery(); }

// 3. LOGIKA PENAMBAHAN BARIS & HITUNG
function addRow(n="", p="", l="", q=1, h=1, mat="plywood") {
    const div = document.createElement('div');
    div.className = "row-item grid grid-cols-12 gap-2 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50 items-center mb-2";
    div.innerHTML = `
        <div class="col-span-4"><input type="text" value="${n}" class="name-in w-full text-[10px] font-bold p-2.5 rounded-xl bg-slate-900 border-none"></div>
        <div class="col-span-2"><input type="number" value="${p}" oninput="calculate()" class="dim-input p-in w-full text-[11px] font-bold p-2.5 rounded-xl text-center"></div>
        <div class="col-span-2"><input type="number" value="${l}" oninput="calculate()" class="dim-input l-in w-full text-[11px] font-bold p-2.5 rounded-xl text-center"></div>
        <div class="col-span-1"><input type="number" value="${q}" oninput="calculate()" class="q-in w-full text-[11px] font-black p-2.5 rounded-xl text-center text-blue-400"></div>
        <div class="col-span-3 flex items-center gap-2">
            <div class="flex flex-col gap-1 w-full">
                <select onchange="calculate()" class="m-in w-full text-[9px] font-black p-1.5 rounded-lg">
                    <option value="plywood" ${mat=='plywood'?'selected':''}>18MM</option>
                    <option value="backpanel" ${mat=='backpanel'?'selected':''}>BACK</option>
                </select>
                <select onchange="calculate()" class="h-in w-full text-[9px] font-bold p-1.5 rounded-lg">
                    <option value="0" ${h==0?'selected':''}>No HPL</option>
                    <option value="1" ${h==1?'selected':''}>1 Sisi</option>
                    <option value="2" ${h==2?'selected':''}>2 Sisi</option>
                </select>
            </div>
            <button onclick="this.parentElement.parentElement.remove(); calculate();" class="text-slate-600 hover:text-red-500">×</button>
        </div>
    `;
    document.getElementById('materialList').appendChild(div);
}

function calculate() {
    // Logika kalkulasi harga (tetap seperti versi sebelumnya)
    // ... (sesuaikan dengan elemen UI Anda)
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if(t) {
        t.innerText = msg;
        t.style.opacity = '1';
        setTimeout(() => t.style.opacity = '0', 3000);
    } else { alert(msg); }
}

window.onload = () => { calculate(); };
