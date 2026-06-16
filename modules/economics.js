/**
 * AgriCalc - Economics & Usahatani Analysis Module
 */

export function initEconomicsModule(container, state, db) {
  container.innerHTML = `
    <div class="module-header">
      <h2>📈 Analisis Ekonomi & Kelayakan Usahatani</h2>
      <p>Analisis rincian modal produksi, estimasi pendapatan, ROI, serta titik impas (Break-Even Point) usaha tani Anda.</p>
    </div>
    
    <div class="module-grid">
      <!-- Input Panel -->
      <div class="glass-panel input-panel">
        <h3>Parameter Finansial & Hasil</h3>
        <form id="econ-form" class="calc-form">
          <div class="form-group">
            <label for="econ-crop">Pilih Komoditas:</label>
            <select id="econ-crop" name="cropId">
              ${db.CROPS.map(c => `<option value="${c.id}" ${state.selectedCropId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
            <div id="econ-crop-info" class="helper-info-box" style="margin-top: 8px;"></div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="econ-area-val">Luas Lahan:</label>
              <input type="number" id="econ-area-val" name="area" value="1" min="0.01" step="any" required>
            </div>
            <div class="form-group">
              <label for="econ-area-unit">Satuan:</label>
              <select id="econ-area-unit" name="areaUnit">
                <option value="ha" selected>Hektar (ha)</option>
                <option value="sqm">Meter Persegi (m²)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Rincian Biaya Produksi (IDR):</label>
            <div class="cost-inputs-grid">
              <div class="form-group">
                <label for="cost-land">Sewa & Olah Lahan:</label>
                <input type="number" id="cost-land" name="costLand" value="4000000" min="0" step="50000" required>
              </div>
              <div class="form-group">
                <label for="cost-seeds">Benih / Bibit:</label>
                <input type="number" id="cost-seeds" name="costSeeds" value="1500000" min="0" step="50000" required>
              </div>
              <div class="form-group">
                <label for="cost-fert">Pupuk:</label>
                <input type="number" id="cost-fert" name="costFert" value="3000000" min="0" step="50000" required>
              </div>
              <div class="form-group">
                <label for="cost-pest">Pestisida:</label>
                <input type="number" id="cost-pest" name="costPest" value="1200000" min="0" step="50000" required>
              </div>
              <div class="form-group">
                <label for="cost-labor">Tenaga Kerja (SDM):</label>
                <input type="number" id="cost-labor" name="costLabor" value="5000000" min="0" step="50000" required>
              </div>
              <div class="form-group">
                <label for="cost-other">Lainnya / Penyusutan:</label>
                <input type="number" id="cost-other" name="costOther" value="800000" min="0" step="50000" required>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="econ-yield">Estimasi Hasil Panen (kg):</label>
              <input type="number" id="econ-yield" name="expectedYield" value="6000" min="0" step="10" required>
            </div>
            <div class="form-group">
              <label for="econ-price">Harga Jual Pasar (IDR/kg):</label>
              <input type="number" id="econ-price" name="pricePerKg" value="6500" min="0" step="50" required>
            </div>
          </div>

          <button type="submit" class="btn btn-primary">Analisis Kelayakan</button>
        </form>
      </div>
      
      <!-- Output Panel -->
      <div class="glass-panel output-panel">
        <h3>Hasil Analisis Keuangan</h3>
        <div id="econ-results" class="results-container">
          <div class="results-summary econ-summary">
            <div class="metric-row">
              <div class="metric-card">
                <span class="metric-label">Keuntungan Bersih</span>
                <span class="metric-value text-success" id="res-net-profit">IDR 0</span>
                <span class="metric-unit">dari total omzet <strong id="res-gross-revenue">IDR 0</strong></span>
              </div>
              <div class="metric-card">
                <span class="metric-label">Return on Investment (ROI)</span>
                <span class="metric-value text-accent" id="res-roi">0.0%</span>
                <span class="metric-unit">B/C Ratio: <strong id="res-bc-ratio">0.00</strong></span>
              </div>
            </div>
          </div>

          <!-- Cost Chart Visualization -->
          <div class="chart-container">
            <h4>📊 Proporsi Pengeluaran Modal</h4>
            <div class="svg-chart-wrapper" id="res-chart-wrapper">
              <!-- Inline SVG Chart drawn dynamically -->
            </div>
          </div>

          <div class="bep-box">
            <h4>Threshold Titik Impas (BEP)</h4>
            <div class="metric-row">
              <div class="metric-subcard">
                <span class="sub-label">Harga BEP (IDR/kg)</span>
                <span class="sub-value" id="res-bep-price">IDR 0</span>
                <span class="sub-unit">Jika harga jual di bawah ini, rugi.</span>
              </div>
              <div class="metric-subcard">
                <span class="sub-label">Hasil BEP (kg)</span>
                <span class="sub-value" id="res-bep-yield">0 kg</span>
                <span class="sub-unit">Jika hasil panen di bawah ini, rugi.</span>
              </div>
            </div>
          </div>

          <button id="econ-save-btn" class="btn btn-secondary" style="margin-top: 15px;">Simpan ke Riwayat</button>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector("#econ-form");
  const cropSelect = container.querySelector("#econ-crop");
  const areaInput = container.querySelector("#econ-area-val");
  const areaUnitSelect = container.querySelector("#econ-area-unit");
  const yieldInput = container.querySelector("#econ-yield");
  const priceInput = container.querySelector("#econ-price");
  const saveBtn = container.querySelector("#econ-save-btn");

  // Cost Inputs
  const costLand = container.querySelector("#cost-land");
  const costSeeds = container.querySelector("#cost-seeds");
  const costFert = container.querySelector("#cost-fert");
  const costPest = container.querySelector("#cost-pest");
  const costLabor = container.querySelector("#cost-labor");
  const costOther = container.querySelector("#cost-other");

  let currentResults = null;

  const econCropInfo = container.querySelector("#econ-crop-info");

  function updateEconCropInfo(crop) {
    if (!crop) return;
    const isIndo = state.language === "id";
    const areaInputVal = parseFloat(areaInput.value) || 0;
    const areaUnitVal = areaUnitSelect.value;
    
    econCropInfo.innerHTML = isIndo
      ? `💡 <strong>Estimasi Modal Pemula (${areaInputVal} ${areaUnitVal}):</strong><br>
         Biaya produksi awal telah dihitung otomatis untuk komoditas <strong>${crop.name}</strong>. Anda dapat mengedit rincian pengeluaran di bawah sesuai kebutuhan lapangan.`
      : `💡 <strong>Beginner Capital Estimate (${areaInputVal} ${areaUnitVal}):</strong><br>
         Initial production costs have been pre-filled for <strong>${crop.name}</strong>. You can adjust the detailed values below based on your local conditions.`;
  }

  function applyEconCropDefaults(crop) {
    if (!crop) return;
    const area = parseFloat(areaInput.value);
    const areaUnit = areaUnitSelect.value;
    const areaHa = areaUnit === "ha" ? area : area / 10000;

    // Scale expected yield based on selected crop & land size
    yieldInput.value = Math.round(crop.expectedYieldPerHa * areaHa);
    priceInput.value = crop.pricePerKg;

    // Scale costs roughly as guideline
    costLand.value = Math.round(4000000 * areaHa);
    costSeeds.value = Math.round(1500000 * areaHa);
    costFert.value = Math.round(3000000 * areaHa);
    costPest.value = Math.round(1200000 * areaHa);
    costLabor.value = Math.round(5000000 * areaHa);
    costOther.value = Math.round(800000 * areaHa);

    updateEconCropInfo(crop);
    calculateEcon();
  }

  // Load crop defaults on change
  cropSelect.addEventListener("change", (e) => {
    if (state.updateCropId) state.updateCropId(e.target.value);
    const crop = db.CROPS.find(c => c.id === e.target.value);
    applyEconCropDefaults(crop);
  });

  // Re-scale when area changes
  const handleAreaChange = () => {
    const crop = db.CROPS.find(c => c.id === cropSelect.value);
    if (crop) {
      const area = parseFloat(areaInput.value);
      const areaUnit = areaUnitSelect.value;
      const areaHa = areaUnit === "ha" ? area : area / 10000;

      yieldInput.value = Math.round(crop.expectedYieldPerHa * areaHa);
      
      costLand.value = Math.round(4000000 * areaHa);
      costSeeds.value = Math.round(1500000 * areaHa);
      costFert.value = Math.round(3000000 * areaHa);
      costPest.value = Math.round(1200000 * areaHa);
      costLabor.value = Math.round(5000000 * areaHa);
      costOther.value = Math.round(800000 * areaHa);
      
      updateEconCropInfo(crop);
      calculateEcon();
    }
  };

  areaInput.addEventListener("input", handleAreaChange);
  areaUnitSelect.addEventListener("change", handleAreaChange);

  // Initialize economics defaults
  const initialCrop = db.CROPS.find(c => c.id === cropSelect.value);
  applyEconCropDefaults(initialCrop);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    calculateEcon();
  });

  saveBtn.addEventListener("click", () => {
    if (currentResults) {
      state.saveCalculation({
        type: "economics",
        cropId: currentResults.cropId,
        title: `Analisis Usahatani ${currentResults.cropName}`,
        inputs: currentResults.inputs,
        outputs: currentResults.outputs
      });
      alert("Kalkulasi berhasil disimpan ke riwayat!");
    }
  });

  function calculateEcon() {
    const formData = new FormData(form);
    const cropId = formData.get("cropId");
    const crop = db.CROPS.find(c => c.id === cropId);

    const area = parseFloat(formData.get("area"));
    const areaUnit = formData.get("areaUnit");

    // Total Costs
    const cLand = parseFloat(formData.get("costLand"));
    const cSeeds = parseFloat(formData.get("costSeeds"));
    const cFert = parseFloat(formData.get("costFert"));
    const cPest = parseFloat(formData.get("costPest"));
    const cLabor = parseFloat(formData.get("costLabor"));
    const cOther = parseFloat(formData.get("costOther"));
    const totalCost = cLand + cSeeds + cFert + cPest + cLabor + cOther;

    // Revenue
    const expectedYield = parseFloat(formData.get("expectedYield"));
    const pricePerKg = parseFloat(formData.get("pricePerKg"));
    const grossRevenue = expectedYield * pricePerKg;

    // Profit, ROI, BEP
    const netProfit = grossRevenue - totalCost;
    const roi = (netProfit / totalCost) * 100;
    const bcRatio = grossRevenue / totalCost;

    const bepPrice = totalCost / expectedYield;
    const bepYield = totalCost / pricePerKg;

    // Update UI elements
    const profitEl = container.querySelector("#res-net-profit");
    profitEl.textContent = `IDR ${Math.round(netProfit).toLocaleString("id-ID")}`;
    if (netProfit < 0) {
      profitEl.className = "metric-value text-danger";
    } else {
      profitEl.className = "metric-value text-success";
    }

    container.querySelector("#res-gross-revenue").textContent = `IDR ${Math.round(grossRevenue).toLocaleString("id-ID")}`;
    
    const roiEl = container.querySelector("#res-roi");
    roiEl.textContent = `${roi.toFixed(1)}%`;
    if (roi < 0) {
      roiEl.className = "metric-value text-danger";
    } else if (roi > 30) {
      roiEl.className = "metric-value text-accent";
    } else {
      roiEl.className = "metric-value text-success";
    }

    container.querySelector("#res-bc-ratio").textContent = bcRatio.toFixed(2);
    container.querySelector("#res-bep-price").textContent = `IDR ${Math.round(bepPrice).toLocaleString("id-ID")} / kg`;
    container.querySelector("#res-bep-yield").textContent = `${Math.round(bepYield).toLocaleString("id-ID")} kg`;

    // Draw cost proportions chart using dynamic SVG
    drawCostChart(cLand, cSeeds, cFert, cPest, cLabor, cOther, totalCost);

    currentResults = {
      cropId,
      cropName: crop ? crop.name : "Kustom",
      inputs: {
        area,
        areaUnit,
        costs: { cLand, cSeeds, cFert, cPest, cLabor, cOther },
        expectedYield,
        pricePerKg
      },
      outputs: {
        totalCost,
        grossRevenue,
        netProfit,
        roi,
        bcRatio,
        bepPrice,
        bepYield
      }
    };
  }

  function drawCostChart(land, seeds, fert, pest, labor, other, total) {
    const wrapper = container.querySelector("#res-chart-wrapper");
    if (total <= 0) {
      wrapper.innerHTML = `<p>Biaya total tidak boleh nol.</p>`;
      return;
    }

    const categories = [
      { name: "Sewa & Olah Lahan", value: land, color: "#e74c3c" },
      { name: "Benih", value: seeds, color: "#e67e22" },
      { name: "Pupuk", value: fert, color: "#f1c40f" },
      { name: "Pestisida", value: pest, color: "#3498db" },
      { name: "Tenaga Kerja", value: labor, color: "#2ecc71" },
      { name: "Lainnya", value: other, color: "#9b59b6" }
    ];

    // Filter out categories with zero value
    const filtered = categories.filter(c => c.value > 0);

    // Compute cumulative percentages for SVG Pie/Donut Chart
    let accumulatedPercent = 0;
    const donutRadius = 70;
    const center = 100;
    const strokeWidth = 30;
    const circumference = 2 * Math.PI * donutRadius;

    let pathsSvg = "";
    let legendSvg = "";

    const isIndo = state.language === 'id';
    let formattedTotal = "";
    if (total >= 1000000000) {
      formattedTotal = isIndo ? `${(total / 1000000000).toFixed(1)} M` : `${(total / 1000000000).toFixed(1)}B`;
    } else if (total >= 1000000) {
      formattedTotal = isIndo ? `${(total / 1000000).toFixed(1)} Jt` : `${(total / 1000000).toFixed(1)}M`;
    } else {
      formattedTotal = isIndo ? `${(total / 1000).toFixed(0)} Rb` : `${(total / 1000).toFixed(0)}K`;
    }

    filtered.forEach((cat, index) => {
      const percentage = (cat.value / total) * 100;
      const strokeLength = percentage;
      // Start the dash clockwise using negative offset in percent (0 to -100)
      const strokeOffset = -accumulatedPercent;
      const percentVal = percentage.toFixed(1);

      // We represent sections as overlapping stroke arcs on a circle
      pathsSvg += `
        <circle 
          cx="${center}" cy="${center}" r="${donutRadius}"
          fill="transparent"
          stroke="${cat.color}"
          stroke-width="${strokeWidth}"
          pathLength="100"
          stroke-dasharray="${strokeLength} 100"
          stroke-dashoffset="${strokeOffset}"
          transform="rotate(-90 ${center} ${center})"
        />
      `;

      legendSvg += `
        <div class="chart-legend-item">
          <span class="legend-color-box" style="background-color: ${cat.color}"></span>
          <span class="legend-label">${cat.name}: <strong>${percentVal}%</strong> (IDR ${cat.value.toLocaleString("id-ID")})</span>
        </div>
      `;

      accumulatedPercent += percentage;
    });

    wrapper.innerHTML = `
      <div class="donut-chart-box">
        <svg width="200" height="200" viewBox="0 0 200 200">
          ${pathsSvg}
          <text x="${center}" y="${center - 5}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="${state.theme === 'dark' ? '#8ca388' : '#6c5d43'}">${isIndo ? 'Total Biaya' : 'Total Cost'}</text>
          <text x="${center}" y="${center + 15}" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="13" fill="${state.theme === 'dark' ? '#ffffff' : '#141a12'}">IDR ${formattedTotal}</text>
        </svg>
        <div class="chart-legends">
          ${legendSvg}
        </div>
      </div>
    `;
  }

  // Trigger initial calculation
  calculateEcon();
}
