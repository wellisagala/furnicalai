let currentUnit = "cm";
let uploadedImages = [];
let isManualVolume = true;

// 1. FUNGSI AI (Backend Connection)
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
                        " Jawab HANYA dengan JSON format: {\"items\": [{\"name\": \"Bagian\", \"p\": 100, \"l\": 50, \"qty\": 1, \"hpl\": 1, \"type\": \"plywood\"}]}",
                images: uploadedImages.map(img => img.split(',')[1])
            })
        });

        if (!response.ok) throw new Error("Gagal menghubungi server");

        const data = await response.json();
        
        // Membersihkan format Markdown (```json ... ```) dari AI
        let rawText = data.candidates[0].content.parts[0].text;
        const cleanJson = rawText.replace(/```json|```/g, "").trim();
        const result = JSON.parse(cleanJson);

        if (result.items && Array.isArray(result.items)) {
            // Kosongkan tabel lama sebelum isi yang baru
            document.getElementById('materialList').innerHTML = "";
            
            result.items.forEach(item => {
                addRow(
                    item.name || item.nama, 
                    item.p, 
                    item.l, 
                    item.qty || item.jumlah, 
                    item.hpl || 1, 
                    item.type || "plywood"
                );
            });
            
            calculate();
            showToast("Data Berhasil Dimuat!");
        }
    } catch (err) {
        console.error("Detail Error:", err);
        showToast("Gagal analisis AI: " + err.message);
    } finally {
        btn.disabled = false; 
        btn.innerText = "Analisis Konstruksi";
    }
}

// 2. LOGIKA PERHITUNGAN (Core Logic)
function calculate() {
    const prices = {
        ply: parseFloat(document.getElementById('plyPrice').value) || 0,
        back: parseFloat(document.getElementById('backPanelPrice').value) || 0,
        hpl: parseFloat(document.getElementById('hplPrice').value) || 0,
        edging: parseFloat(document.getElementById('edgingPrice').value) || 0,
        yellowGlue: parseFloat(document.getElementById('yellowGluePrice').value) || 0,
        whiteGlue: parseFloat(document.getElementById('whiteGluePrice').value) || 0,
        screwSmall: parseFloat(document.getElementById('screwSmallPrice').value) || 0,
        screwLarge: parseFloat(document.getElementById('screwLargePrice').value) || 0,
        labour: parseFloat(document.getElementById('labourRate').value) || 0,
        profit: parseFloat(document.getElementById('profitPercent').value) || 0
    };

    let totalAreaPly = 0, totalAreaBack = 0, totalAreaHpl = 0;
    let totalBodyLengthCm = 0; 

    document.querySelectorAll('.row-item').forEach(row => {
        let p = parseFloat(row.querySelector('.p-in').value) || 0;
        let l = parseFloat(row.querySelector('.l-in').value) || 0;
        let q = parseFloat(row.querySelector('.q-in').value) || 0;
        let hplSides = parseInt(row.querySelector('.h-in').value);
        let matType = row.querySelector('.m-in').value;
        let name = row.querySelector('.name-in').value.toLowerCase();

        let p_cm = (currentUnit === "mm") ? p / 10 : p;
        let l_cm = (currentUnit === "mm") ? l / 10 : l;
        const area = (p_cm * l_cm) * q;

        if (matType === "backpanel") {
            totalAreaBack += area;
        } else {
            totalAreaPly += area;
            if (name.includes("body") || name.includes("samping") || name.includes("dasar") || name.includes("top")) {
                totalBodyLengthCm += (p_cm * q);
            }
        }
        totalAreaHpl += (area * hplSides);
    });

    const sheetArea = 122 * 244;
    const plySheets = Math.ceil((totalAreaPly * 1.3) / sheetArea) || 0;
    const backSheets = Math.ceil((totalAreaBack * 1.1) / sheetArea) || 0;
    const hplSheets = Math.ceil((totalAreaHpl * 1.2) / sheetArea) || 0;

    const qtyYellowGlue = Math.ceil(hplSheets / 3) || 0;
    const qtyWhiteGlue = Math.ceil(plySheets / 3) || 1;
    const qtyScrewSmall = Math.ceil(hplSheets / 2) || 1;
    const qtyScrewLarge = Math.ceil(plySheets / 2) || 1;

    const woodCost = (plySheets * prices.ply) + (backSheets * prices.back);
    const hplCost = (hplSheets * prices.hpl) + (plySheets > 0 ? prices.edging : 0);
    const consumableCost = (qtyYellowGlue * prices.yellowGlue) + (qtyWhiteGlue * prices.whiteGlue) + (qtyScrewSmall * prices.screwSmall) + (qtyScrewLarge * prices.screwLarge);
    
    let volumeVal = parseFloat(document.getElementById('volumeVal').value) || 0;
    if (!isManualVolume) {
        volumeVal = parseFloat((totalBodyLengthCm / 400).toFixed(2));
        document.getElementById('volumeVal').value = volumeVal;
    }
    const totalLabourCost = volumeVal * prices.labour;
    const totalHPP = woodCost + hplCost + consumableCost + totalLabourCost;

    document.getElementById('resWood').innerText = "Rp " + Math.round(woodCost).toLocaleString('id-ID');
    document.getElementById('resHplTotal').innerText = "Rp " + Math.round(hplCost).toLocaleString('id-ID');
    document.getElementById('resConsumables').innerText = "Rp " + Math.round(consumableCost).toLocaleString('id-ID');
    document.getElementById('resLabourTotal').innerText = "Rp " + Math.round(totalLabourCost).toLocaleString('id-ID');
    document.getElementById('resCost').innerText = "Rp " + Math.round(totalHPP).toLocaleString('id-ID');
    
    const multiplier = 1 + (prices.profit / 100);
    document.getElementById('resPrice').innerText = "Rp " + Math.round(totalHPP * multiplier).toLocaleString('id-ID');
}

// 3. FUNGSI UI (Tabel & Gambar)
function addRow(n="", p="", l="", q=1, h=1, mat="plywood") {
    const div = document.createElement('div');
    div.className = "row-item grid grid-cols-12 gap-2 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50 items-center";
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
    calculate();
}

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
    container.innerHTML = uploadedImages.map((img, i) => `
        <div class="relative w-14 h-14">
            <img src="${img}" class="w-full h-full object-cover rounded-lg border border-slate-700">
            <button onclick="removeImg(${i})" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">×</button>
        </div>
    `).join('');
}

function removeImg(i) { uploadedImages.splice(i, 1); renderGallery(); }

function showToast(msg) {
    const t = document.getElementById('toast');
    if(!t) return alert(msg);
    t.innerText = msg;
    t.style.opacity = '1';
    setTimeout(() => t.style.opacity = '0', 3000);
}

function toggleAutoLabour(isAuto) {
    isManualVolume = !isAuto;
    const volInput = document.getElementById('volumeVal');
    volInput.readOnly = isAuto;
    if(isAuto) calculate();
}

window.onload = () => {
    // Baris default saat pertama buka
    addRow("Body Samping", 200, 60, 2, 1);
    addRow("Body Dasar", 120, 60, 1, 1);
    calculate();
};
