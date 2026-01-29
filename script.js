 
        let currentUnit = "cm";
        let uploadedImages = [];
        let isManualVolume = true;

        function toggleAutoLabour(isAuto) {
            isManualVolume = !isAuto;
            const volInput = document.getElementById('volumeVal');
            volInput.readOnly = isAuto;
            volInput.classList.toggle('bg-slate-800', isAuto);
            volInput.classList.toggle('text-slate-500', isAuto);
            if(isAuto) calculate();
        }

        function setUnit(unit) {
            const oldUnit = currentUnit;
            currentUnit = unit;
            document.getElementById('unit-mm').classList.toggle('active', unit === 'mm');
            document.getElementById('unit-cm').classList.toggle('active', unit === 'cm');
            document.querySelectorAll('.unit-label').forEach(el => el.innerText = unit);
            document.querySelectorAll('.dim-input').forEach(input => {
                let val = parseFloat(input.value) || 0;
                if (val === 0) return;
                if (oldUnit === "cm" && unit === "mm") input.value = Math.round(val * 10);
                if (oldUnit === "mm" && unit === "cm") input.value = (val / 10).toFixed(1);
            });
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
                <div class="relative w-14 h-14 group">
                    <img src="${img}" class="w-full h-full object-cover rounded-lg border border-slate-700">
                    <button onclick="removeImg(${i})" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center shadow-lg">×</button>
                </div>
            `).join('');
        }

        function removeImg(i) { uploadedImages.splice(i, 1); renderGallery(); }

        function showToast(msg) {
            const t = document.getElementById('toast');
            t.innerText = msg;
            t.style.opacity = '1';
            setTimeout(() => t.style.opacity = '0', 3000);
        }

       // script.js (Bagian fungsi processAI yang sudah dimodifikasi)
async function processAI() {
    if (uploadedImages.length === 0) return showToast("Harap upload sketsa terlebih dahulu");
    
    const btn = document.getElementById('btnAnalyze');
    const userPrompt = document.getElementById('aiPrompt').value;
    
    btn.disabled = true; 
    btn.innerText = "Menganalisis...";

    try {
        // PERUBAHAN UTAMA: Memanggil fungsi internal Netlify, bukan Google API
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            body: JSON.stringify({ 
                prompt: userPrompt || "Analisis sketsa ini menjadi daftar potong.",
                images: uploadedImages.map(img => img.split(',')[1]) // Mengirim gambar tanpa teks header base64
            })
        });

        if (!response.ok) throw new Error("Gagal menghubungi server");

        const data = await response.json();
        
        // Mengambil data dari format respon Gemini
        const rawJson = data.candidates[0].content.parts[0].text;
        const result = JSON.parse(rawJson);

        if (result.items) {
            document.getElementById('materialList').innerHTML = "";
            result.items.forEach(item => addRow(item.name, item.p, item.l, item.qty, item.hpl, item.type));
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

            // Logika Estimasi Lem & Sekrup
            // 1 blek lem kuning biasanya untuk 3-4 lembar HPL
            const qtyYellowGlue = Math.ceil(hplSheets / 3) || 0;
            // 1 bungkus lem putih untuk ~3 lembar plywood konstruksi
            const qtyWhiteGlue = Math.ceil(plySheets / 3) || 1;
            // 1 box sekrup kecil untuk 2-3 lembar HPL (pasang aksesoris)
            const qtyScrewSmall = Math.ceil(hplSheets / 2) || 1;
            // 1 box sekrup besar untuk ~2 lembar plywood (body)
            const qtyScrewLarge = Math.ceil(plySheets / 2) || 1;

            const woodCost = (plySheets * prices.ply) + (backSheets * prices.back);
            const hplCost = (hplSheets * prices.hpl) + (plySheets > 0 ? prices.edging : 0);
            const consumableCost = (qtyYellowGlue * prices.yellowGlue) + 
                                  (qtyWhiteGlue * prices.whiteGlue) + 
                                  (qtyScrewSmall * prices.screwSmall) + 
                                  (qtyScrewLarge * prices.screwLarge);
            
            // JASA TUKANG
            let volumeVal = parseFloat(document.getElementById('volumeVal').value) || 0;
            if (!isManualVolume) {
                volumeVal = parseFloat((totalBodyLengthCm / 400).toFixed(2));
                document.getElementById('volumeVal').value = volumeVal;
            }
            const totalLabourCost = volumeVal * prices.labour;

            const totalHPP = woodCost + hplCost + consumableCost + totalLabourCost;

            // UI Update
            document.getElementById('resWood').innerText = "Rp " + Math.round(woodCost).toLocaleString('id-ID');
            document.getElementById('resHplTotal').innerText = "Rp " + Math.round(hplCost).toLocaleString('id-ID');
            document.getElementById('resConsumables').innerText = "Rp " + Math.round(consumableCost).toLocaleString('id-ID');
            document.getElementById('resLabourTotal').innerText = "Rp " + Math.round(totalLabourCost).toLocaleString('id-ID');
            document.getElementById('resCost').innerText = "Rp " + Math.round(totalHPP).toLocaleString('id-ID');
            
            const multiplier = 1 + (prices.profit / 100);
            document.getElementById('resPrice').innerText = "Rp " + Math.round(totalHPP * multiplier).toLocaleString('id-ID');
        }

        function addRow(n="", p="", l="", q=1, h=1, mat="plywood", rail=false, hinge=false) {
            const div = document.createElement('div');
            div.className = "row-item grid grid-cols-12 gap-2 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50 items-center";
            div.innerHTML = `
                <div class="col-span-4">
                    <input type="text" value="${n}" class="name-in w-full text-[10px] font-bold p-2.5 rounded-xl bg-slate-900 border-none" placeholder="Komponen">
                </div>
                <div class="col-span-2">
                    <input type="number" value="${p}" oninput="calculate()" class="dim-input p-in w-full text-[11px] font-bold p-2.5 rounded-xl text-center">
                </div>
                <div class="col-span-2">
                    <input type="number" value="${l}" oninput="calculate()" class="dim-input l-in w-full text-[11px] font-bold p-2.5 rounded-xl text-center">
                </div>
                <div class="col-span-1">
                    <input type="number" value="${q}" oninput="calculate()" class="q-in w-full text-[11px] font-black p-2.5 rounded-xl text-center text-blue-400">
                </div>
                <div class="col-span-3 flex items-center gap-2">
                    <div class="flex flex-col gap-1 w-full">
                        <select onchange="calculate()" class="m-in w-full text-[9px] font-black p-1.5 rounded-lg text-blue-300 border-blue-500/30">
                            <option value="plywood" ${mat=='plywood'?'selected':''}>18MM</option>
                            <option value="backpanel" ${mat=='backpanel'?'selected':''}>BACK</option>
                        </select>
                        <select onchange="calculate()" class="h-in w-full text-[9px] font-bold p-1.5 rounded-lg">
                            <option value="0" ${h==0?'selected':''}>No HPL</option>
                            <option value="1" ${h==1?'selected':''}>1 Sisi</option>
                            <option value="2" ${h==2?'selected':''}>2 Sisi</option>
                        </select>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove(); calculate();" class="text-slate-600 hover:text-red-500 no-print">×</button>
                </div>
            `;
            document.getElementById('materialList').appendChild(div);
            calculate();
        }

        window.onload = () => {
            addRow("Body Samping", 200, 60, 2, 1);
            addRow("Body Dasar", 120, 60, 1, 1);
            addRow("Pintu", 195, 60, 2, 2);
            calculate();
        };