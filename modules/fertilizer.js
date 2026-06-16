/**
 * AgriCalc - Fertilizer Calculation Module
 */

export function initFertilizerModule(container, state, db) {
  container.innerHTML = `
    <div class="module-header">
      <h2>🧪 Kalkulator Kebutuhan Pupuk (Hara NPK)</h2>
      <p>Hitung kebutuhan dosis pupuk tunggal atau majemuk berdasarkan anjuran hara makro tanaman secara presisi.</p>
    </div>
    
    <div class="module-grid">
      <!-- Input Panel -->
      <div class="glass-panel input-panel">
        <h3>Input Kebutuhan Nutrisi</h3>
        <form id="fert-form" class="calc-form">
          <div class="form-group">
            <label for="fert-crop">Pilih Komoditas:</label>
            <select id="fert-crop" name="cropId">
              ${db.CROPS.map(c => `<option value="${c.id}" ${state.selectedCropId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
            <div id="fert-crop-info" class="helper-info-box" style="margin-top: 8px;"></div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="fert-area-val">Luas Lahan:</label>
              <input type="number" id="fert-area-val" name="area" value="1" min="0.01" step="any" required>
            </div>
            <div class="form-group">
              <label for="fert-area-unit">Satuan:</label>
              <select id="fert-area-unit" name="areaUnit">
                <option value="ha" selected>Hektar (ha)</option>
                <option value="sqm">Meter Persegi (m²)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Rekomendasi Kebutuhan Unsur Hara (kg/ha):</label>
            <div class="form-row text-inputs">
              <div class="form-group">
                <label for="fert-req-n" class="sub-label-in">N (Nitrogen):</label>
                <input type="number" id="fert-req-n" name="reqN" value="120" min="0" required>
              </div>
              <div class="form-group">
                <label for="fert-req-p" class="sub-label-in">P₂O₅ (Fosfat):</label>
                <input type="number" id="fert-req-p" name="reqP" value="60" min="0" required>
              </div>
              <div class="form-group">
                <label for="fert-req-k" class="sub-label-in">K₂O (Kalium):</label>
                <input type="number" id="fert-req-k" name="reqK" value="50" min="0" required>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label for="fert-strategy">Strategi Pemupukan:</label>
            <select id="fert-strategy" name="strategy">
              <option value="single" selected>Pupuk Tunggal (Urea + SP36 + KCl)</option>
              <option value="compound_15">NPK Phonska 15-15-15 + Tambahan Tunggal</option>
              <option value="compound_16">NPK Mutiara 16-16-16 + Tambahan Tunggal</option>
            </select>
          </div>

          <div class="form-group">
            <label>Tipe Harga Pupuk:</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" name="priceType" value="subsidized" checked>
                <span>Subsidi Pemerintah</span>
              </label>
              <label class="radio-label">
                <input type="radio" name="priceType" value="commercial">
                <span>Non-Subsidi (Komersil)</span>
              </label>
            </div>
          </div>

          <button type="submit" class="btn btn-primary">Hitung Kebutuhan Pupuk</button>
        </form>
      </div>
      
      <!-- Output Panel -->
      <div class="glass-panel output-panel">
        <h3>Hasil Rekomendasi Pemupukan</h3>
        <div id="fert-results" class="results-container">
          <div class="results-summary">
            <div class="metric-card">
              <span class="metric-label">Total Estimasi Biaya Pupuk</span>
              <span class="metric-value" id="res-fert-cost">IDR 0</span>
              <span class="metric-unit">termasuk kemasan karung 50kg</span>
            </div>
          </div>

          <table class="table-results" id="fert-table">
            <thead>
              <tr>
                <th>Jenis Pupuk</th>
                <th>Kandungan (N-P-K)</th>
                <th>Kebutuhan (kg)</th>
                <th>Jumlah Karung (50kg)</th>
                <th>Estimasi Biaya</th>
              </tr>
            </thead>
            <tbody id="res-fert-rows">
              <!-- Dynamic Rows -->
            </tbody>
          </table>

          <div class="timeline-container">
            <h4>📅 Jadwal & Dosis Aplikasi Lapangan</h4>
            <div class="timeline" id="res-fert-schedule">
              <!-- Dynamic Schedule -->
            </div>
          </div>

          <button id="fert-save-btn" class="btn btn-secondary" style="margin-top: 15px;">Simpan ke Riwayat</button>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector("#fert-form");
  const cropSelect = container.querySelector("#fert-crop");
  const reqNInput = container.querySelector("#fert-req-n");
  const reqPInput = container.querySelector("#fert-req-p");
  const reqKInput = container.querySelector("#fert-req-k");
  const saveBtn = container.querySelector("#fert-save-btn");

  let currentResults = null;

  const fertCropInfo = container.querySelector("#fert-crop-info");
  const areaValInput = container.querySelector("#fert-area-val");
  const areaUnitSelect = container.querySelector("#fert-area-unit");

  function updateFertCropInfo(crop) {
    if (!crop) return;
    const isIndo = state.language === "id";
    const areaInputVal = parseFloat(areaValInput.value) || 0;
    const areaUnitVal = areaUnitSelect.value;
    const areaHa = areaUnitVal === "ha" ? areaInputVal : areaInputVal / 10000;
    
    const totalN = Math.round(crop.recommendationN * areaHa);
    const totalP = Math.round(crop.recommendationP * areaHa);
    const totalK = Math.round(crop.recommendationK * areaHa);

    fertCropInfo.innerHTML = isIndo
      ? `💡 <strong>Rekomendasi Hara Lahan (${areaInputVal} ${areaUnitVal}):</strong><br>
         Nitrogen (N): <strong>${totalN} kg</strong> &bull; Fosfat (P₂O₅): <strong>${totalP} kg</strong> &bull; Kalium (K₂O): <strong>${totalK} kg</strong>.<br>
         <span style="font-weight: normal; opacity: 0.85;">(Dosis anjuran dasar: ${crop.recommendationN}-${crop.recommendationP}-${crop.recommendationK} kg/ha). Parameter di bawah telah disesuaikan otomatis.</span>`
      : `💡 <strong>Recommended Nutrient Demand (${areaInputVal} ${areaUnitVal}):</strong><br>
         Nitrogen (N): <strong>${totalN} kg</strong> &bull; Phosphate (P₂O₅): <strong>${totalP} kg</strong> &bull; Potash (K₂O): <strong>${totalK} kg</strong>.<br>
         <span style="font-weight: normal; opacity: 0.85;">(Base recommendation: ${crop.recommendationN}-${crop.recommendationP}-${crop.recommendationK} kg/ha). Parameters below adjusted automatically.</span>`;
  }

  function applyFertCropDefaults(crop) {
    if (!crop) return;
    reqNInput.value = crop.recommendationN;
    reqPInput.value = crop.recommendationP;
    reqKInput.value = crop.recommendationK;
    updateFertCropInfo(crop);
    calculateFert();
  }

  // Load crop defaults on change
  cropSelect.addEventListener("change", (e) => {
    if (state.updateCropId) state.updateCropId(e.target.value);
    const crop = db.CROPS.find(c => c.id === e.target.value);
    applyFertCropDefaults(crop);
  });

  // Re-calculate recommended summary on area change
  const triggerUpdateInfo = () => {
    const crop = db.CROPS.find(c => c.id === cropSelect.value);
    if (crop) {
      updateFertCropInfo(crop);
    }
  };
  areaValInput.addEventListener("input", triggerUpdateInfo);
  areaUnitSelect.addEventListener("change", triggerUpdateInfo);

  // Initialize recommendation banner & defaults
  const initialCrop = db.CROPS.find(c => c.id === cropSelect.value);
  applyFertCropDefaults(initialCrop);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    calculateFert();
  });

  saveBtn.addEventListener("click", () => {
    if (currentResults) {
      state.saveCalculation({
        type: "fertilizer",
        cropId: currentResults.cropId,
        title: `Rekomendasi Pupuk ${currentResults.cropName}`,
        inputs: currentResults.inputs,
        outputs: currentResults.outputs
      });
      alert("Kalkulasi berhasil disimpan ke riwayat!");
    }
  });

  function calculateFert() {
    const formData = new FormData(form);
    const cropId = formData.get("cropId");
    const crop = db.CROPS.find(c => c.id === cropId);

    const area = parseFloat(formData.get("area"));
    const areaUnit = formData.get("areaUnit");
    const areaHa = areaUnit === "ha" ? area : area / 10000;

    const reqN = parseFloat(formData.get("reqN"));
    const reqP = parseFloat(formData.get("reqP"));
    const reqK = parseFloat(formData.get("reqK"));
    const strategy = formData.get("strategy");
    const priceType = formData.get("priceType");

    // Total target element in kg for the entire land
    const targetN = reqN * areaHa;
    const targetP = reqP * areaHa;
    const targetK = reqK * areaHa;

    // Get fertilizer specifications
    const urea = db.FERTILIZERS.find(f => f.id === "urea");
    const sp36 = db.FERTILIZERS.find(f => f.id === "sp36");
    const kcl = db.FERTILIZERS.find(f => f.id === "kcl");
    const npk15 = db.FERTILIZERS.find(f => f.id === "npk_15");
    const npk16 = db.FERTILIZERS.find(f => f.id === "npk_16");

    let ureaNeeded = 0;
    let sp36Needed = 0;
    let kclNeeded = 0;
    let npkNeeded = 0;
    let npkUsed = null;

    if (strategy === "single") {
      // 100% Tunggal
      ureaNeeded = targetN / (urea.n / 100);
      sp36Needed = targetP / (sp36.p / 100);
      kclNeeded = targetK / (kcl.k / 100);
    } else {
      // Majemuk (Compound)
      npkUsed = strategy === "compound_15" ? npk15 : npk16;
      const npkRatio = npkUsed.n / 100; // e.g. 0.15 or 0.16

      // Use NPK to satisfy either P or K, whichever is lower, or based on a balanced formula.
      // Standard practical agronomy formula:
      // NPK dosage is calculated to satisfy the P demand (since P is generally less than N and K).
      // Any remaining N is supplemented by Urea. Remaining K is supplemented by KCl.
      
      // Target elements: targetN, targetP, targetK
      npkNeeded = targetP / npkRatio; // Base compound on entire P requirement
      
      // Calculate how much N and K are provided by this amount of NPK
      const nProvided = npkNeeded * npkRatio;
      const kProvided = npkNeeded * npkRatio;

      // Deficits
      const nDeficit = Math.max(0, targetN - nProvided);
      const kDeficit = Math.max(0, targetK - kProvided);

      ureaNeeded = nDeficit / (urea.n / 100);
      kclNeeded = kDeficit / (kcl.k / 100);
      sp36Needed = 0; // Met entirely by NPK
    }

    // Format output data structure
    const resultsData = [];
    let totalCost = 0;

    const addFertResult = (fertObj, qty) => {
      if (qty <= 0) return;
      const pricePerKg = (priceType === "subsidized" ? fertObj.subsidizedPrice : fertObj.commercialPrice) / 50;
      const cost = qty * pricePerKg;
      totalCost += cost;
      
      resultsData.push({
        name: fertObj.name,
        formula: `${fertObj.n}-${fertObj.p}-${fertObj.k}`,
        qtyKg: qty,
        bags: qty / 50,
        cost: Math.round(cost)
      });
    };

    if (strategy === "single") {
      addFertResult(urea, ureaNeeded);
      addFertResult(sp36, sp36Needed);
      addFertResult(kcl, kclNeeded);
    } else {
      addFertResult(npkUsed, npkNeeded);
      addFertResult(urea, ureaNeeded);
      addFertResult(kcl, kclNeeded);
    }

    // Update UI elements
    container.querySelector("#res-fert-cost").textContent = `IDR ${Math.round(totalCost).toLocaleString("id-ID")}`;

    const tbody = container.querySelector("#res-fert-rows");
    tbody.innerHTML = resultsData.map(r => `
      <tr>
        <td><strong>${r.name}</strong></td>
        <td>${r.formula}</td>
        <td>${r.qtyKg.toFixed(1)} kg</td>
        <td>${r.bags.toFixed(2)} Karung</td>
        <td>IDR ${r.cost.toLocaleString("id-ID")}</td>
      </tr>
    `).join("");

    // Create a dynamic, professional timeline application schedule
    const scheduleBox = container.querySelector("#res-fert-schedule");
    
    // We split into:
    // Phase 1: Pemupukan Dasar (0-7 HST / Days After Planting) - All SP-36 + 30% Urea/NPK
    // Phase 2: Pemupukan Susulan I (21-25 HST) - 40% Urea + 30% NPK/KCl
    // Phase 3: Pemupukan Susulan II (40-45 HST) - 30% Urea + 30% KCl/NPK
    
    const steps = [];
    if (strategy === "single") {
      steps.push({
        phase: "Dasar (0-7 Hari Setelah Tanam)",
        icon: "🌱",
        description: `Sebarkan seluruh <strong>SP-36 (${sp36Needed.toFixed(1)} kg)</strong> sebagai pupuk dasar. Tambahkan 30% dari dosis <strong>Urea (${(ureaNeeded * 0.3).toFixed(1)} kg)</strong> dan <strong>KCl (${(kclNeeded * 0.3).toFixed(1)} kg)</strong> untuk memacu akar awal.`
      });
      steps.push({
        phase: "Susulan I (21-25 HST)",
        icon: "🌿",
        description: `Aplikasikan 40% dari dosis <strong>Urea (${(ureaNeeded * 0.4).toFixed(1)} kg)</strong> dan 30% dari <strong>KCl (${(kclNeeded * 0.3).toFixed(1)} kg)</strong> guna mendukung pertumbuhan vegetatif tanaman.`
      });
      steps.push({
        phase: "Susulan II (40-45 HST)",
        icon: "🌾",
        description: `Berikan sisa 30% dosis <strong>Urea (${(ureaNeeded * 0.3).toFixed(1)} kg)</strong> serta 40% dari <strong>KCl (${(kclNeeded * 0.4).toFixed(1)} kg)</strong> saat mulai memasuki fase primordia (pembungaan) untuk memaksimalkan buah/tongkol.`
      });
    } else {
      // Compound
      steps.push({
        phase: "Dasar (0-7 Hari Setelah Tanam)",
        icon: "🌱",
        description: `Aplikasikan 50% pupuk <strong>${npkUsed.name} (${(npkNeeded * 0.5).toFixed(1)} kg)</strong> sebagai pupuk dasar sebelum/sesaat setelah tanam.`
      });
      steps.push({
        phase: "Susulan I (21-25 HST)",
        icon: "🌿",
        description: `Berikan sisa 50% <strong>${npkUsed.name} (${(npkNeeded * 0.5).toFixed(1)} kg)</strong> ditambah 50% dosis <strong>Urea (${(ureaNeeded * 0.5).toFixed(1)} kg)</strong> untuk mempercepat pertumbuhan batang dan anakan.`
      });
      if (kclNeeded > 0 || ureaNeeded > 0) {
        steps.push({
          phase: "Susulan II (40-45 HST)",
          icon: "🌾",
          description: `Tebarkan sisa 50% <strong>Urea (${(ureaNeeded * 0.5).toFixed(1)} kg)</strong> dan seluruh <strong>KCl (${kclNeeded.toFixed(1)} kg)</strong> demi memperkuat pengisian bulir/buah.`
        });
      }
    }

    scheduleBox.innerHTML = steps.map(s => `
      <div class="timeline-item">
        <div class="timeline-icon">${s.icon}</div>
        <div class="timeline-content">
          <h5>${s.phase}</h5>
          <p>${s.description}</p>
        </div>
      </div>
    `).join("");

    currentResults = {
      cropId,
      cropName: crop ? crop.name : "Kustom",
      inputs: {
        area,
        areaUnit,
        reqN,
        reqP,
        reqK,
        strategy,
        priceType
      },
      outputs: {
        totalCost,
        details: resultsData
      }
    };
  }

  // Trigger initial calculation
  calculateFert();
}
