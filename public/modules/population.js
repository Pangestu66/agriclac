/**
 * AgriCalc - Plant Population Module
 */

export function initPopulationModule(container, state, db) {
  container.innerHTML = `
    <div class="module-header">
      <h2>🌱 Kalkulator Populasi & Jarak Tanam</h2>
      <p>Hitung jumlah optimal tanaman yang dapat tumbuh di lahan Anda beserta visualisasi pola tanamnya.</p>
    </div>
    
    <div class="module-grid">
      <!-- Input Panel -->
      <div class="glass-panel input-panel">
        <h3>Parameter Lahan & Tanaman</h3>
        <form id="pop-form" class="calc-form">
          <div class="form-group">
            <label for="pop-crop">Pilih Komoditas:</label>
            <select id="pop-crop" name="cropId">
              ${db.CROPS.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
            <div id="pop-crop-info" class="helper-info-box" style="margin-top: 8px;"></div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="pop-area-val">Luas Lahan:</label>
              <input type="number" id="pop-area-val" name="area" value="1000" min="1" step="any" required>
            </div>
            <div class="form-group">
              <label for="pop-area-unit">Satuan:</label>
              <select id="pop-area-unit" name="areaUnit">
                <option value="sqm">Meter Persegi (m²)</option>
                <option value="ha" selected>Hektar (ha)</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="pop-spacing-row">Jarak Antar Baris (m):</label>
              <input type="number" id="pop-spacing-row" name="spacingRow" value="0.75" min="0.05" step="0.01" required>
            </div>
            <div class="form-group">
              <label for="pop-spacing-col">Jarak Dalam Baris (m):</label>
              <input type="number" id="pop-spacing-col" name="spacingCol" value="0.20" min="0.05" step="0.01" required>
            </div>
          </div>
          
          <div class="form-group">
            <label>Pola Tanam:</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" name="pattern" value="rectangular" checked>
                <span>Persegi / Segi Empat</span>
              </label>
              <label class="radio-label">
                <input type="radio" name="pattern" value="triangular">
                <span>Segitiga Sama Sisi (Offset)</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="pop-germination">Daya Tumbuh Benih (%):</label>
            <input type="range" id="pop-germination" name="germination" min="50" max="100" value="90" step="1">
            <div class="range-value"><span id="pop-germination-label">90</span>%</div>
          </div>
          
          <div class="form-group">
            <label for="pop-seed-weight">Berat 1000 Biji (gram):</label>
            <input type="number" id="pop-seed-weight" name="seedWeight" value="25" min="0.1" step="0.1">
            <span class="help-text">Digunakan untuk estimasi berat total benih yang diperlukan (misal: jagung ~25g, padi ~27g).</span>
          </div>

          <button type="submit" class="btn btn-primary">Hitung Populasi</button>
        </form>
      </div>
      
      <!-- Output Panel -->
      <div class="glass-panel output-panel">
        <h3>Hasil Analisis Populasi</h3>
        <div id="pop-results" class="results-container">
          <div class="results-summary">
            <div class="metric-card">
              <span class="metric-label">Total Populasi Tanaman</span>
              <span class="metric-value" id="res-total-pop">0</span>
              <span class="metric-unit">tanaman</span>
            </div>
            <div class="metric-row">
              <div class="metric-subcard">
                <span class="sub-label">Kebutuhan Benih Kasar</span>
                <span class="sub-value" id="res-raw-seeds">0</span>
                <span class="sub-unit">biji</span>
              </div>
              <div class="metric-subcard">
                <span class="sub-label">Estimasi Berat Benih</span>
                <span class="sub-value" id="res-weight-seeds">0.00</span>
                <span class="sub-unit">kg</span>
              </div>
            </div>
          </div>

          <div class="canvas-container">
            <h4>Simulasi Pola Tanam (Ukuran Sampel 5m x 5m)</h4>
            <canvas id="field-canvas" width="400" height="400"></canvas>
          </div>
          
          <div class="recommendations-box" id="pop-recommendations">
            <!-- Dynamic Advice -->
          </div>

          <button id="pop-save-btn" class="btn btn-secondary" style="margin-top: 15px;">Simpan ke Riwayat</button>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector("#pop-form");
  const cropSelect = container.querySelector("#pop-crop");
  const spacingRowInput = container.querySelector("#pop-spacing-row");
  const spacingColInput = container.querySelector("#pop-spacing-col");
  const germinationRange = container.querySelector("#pop-germination");
  const germinationLabel = container.querySelector("#pop-germination-label");
  const canvas = container.querySelector("#field-canvas");
  const saveBtn = container.querySelector("#pop-save-btn");

  let currentResults = null;

  const popCropInfo = container.querySelector("#pop-crop-info");

  function updateCropSpacingInfo(crop) {
    if (!crop) return;
    const isIndo = state.language === "id";
    const patternText = crop.id === "kelapa_sawit"
      ? (isIndo ? "Segitiga (Saling Silang)" : "Triangular (Offset Grid)")
      : (isIndo ? "Persegi / Segi Empat" : "Rectangular Grid");
      
    popCropInfo.innerHTML = isIndo
      ? `💡 <strong>Rekomendasi Jarak Tanam Ideal:</strong> ${crop.defaultSpacingRow}m x ${crop.defaultSpacingCol}m (${patternText}). <br><span style="font-weight: normal; opacity: 0.85;">${crop.description}</span>`
      : `💡 <strong>Ideal Spacing Recommendation:</strong> ${crop.defaultSpacingRow}m x ${crop.defaultSpacingCol}m (${patternText}). <br><span style="font-weight: normal; opacity: 0.85;">${crop.description}</span>`;
  }

  // Handle germination range change
  germinationRange.addEventListener("input", (e) => {
    germinationLabel.textContent = e.target.value;
  });

  // Load defaults when crop changes
  cropSelect.addEventListener("change", (e) => {
    const crop = db.CROPS.find(c => c.id === e.target.value);
    if (crop) {
      spacingRowInput.value = crop.defaultSpacingRow;
      spacingColInput.value = crop.defaultSpacingCol;
      // Set default seed weights depending on crop
      const weightInput = container.querySelector("#pop-seed-weight");
      if (crop.id === "padi") weightInput.value = 27;
      else if (crop.id === "jagung") weightInput.value = 250; // Jagung berat per 1000 biji ~250-300g
      else if (crop.id === "kelapa_sawit") weightInput.value = 4000; // Sawit berat biji besar
      else weightInput.value = 20; // Default hortikultura kecil
      
      // Select appropriate spacing pattern
      const patterns = container.querySelectorAll("input[name='pattern']");
      if (crop.id === "kelapa_sawit") {
        patterns[1].checked = true; // Triangular for sawit
      } else {
        patterns[0].checked = true; // Rectangular for others
      }
      updateCropSpacingInfo(crop);
      calculatePop();
    }
  });

  // Initialize spacing info
  const initialCrop = db.CROPS.find(c => c.id === cropSelect.value);
  updateCropSpacingInfo(initialCrop);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    calculatePop();
  });

  saveBtn.addEventListener("click", () => {
    if (currentResults) {
      state.saveCalculation({
        type: "population",
        cropId: currentResults.cropId,
        title: `Kalkulasi Populasi ${currentResults.cropName} (${currentResults.patternName})`,
        inputs: currentResults.inputs,
        outputs: currentResults.outputs
      });
      alert("Kalkulasi berhasil disimpan ke riwayat!");
    }
  });

  function calculatePop() {
    const formData = new FormData(form);
    const cropId = formData.get("cropId");
    const crop = db.CROPS.find(c => c.id === cropId);
    
    let area = parseFloat(formData.get("area"));
    const areaUnit = formData.get("areaUnit");
    let areaSqm = area;
    if (areaUnit === "ha") {
      areaSqm = area * 10000;
    }

    const spacingRow = parseFloat(formData.get("spacingRow"));
    const spacingCol = parseFloat(formData.get("spacingCol"));
    const pattern = formData.get("pattern");
    const germination = parseFloat(formData.get("germination")) / 100;
    const seedWeight1000 = parseFloat(formData.get("seedWeight"));

    // Math calculation
    let plantsPerSqm = 0;
    if (pattern === "rectangular") {
      plantsPerSqm = 1 / (spacingRow * spacingCol);
    } else {
      // Triangular
      plantsPerSqm = 1 / (spacingRow * spacingCol * Math.sin(Math.PI / 3)); // sin(60deg)
    }

    let totalPopulation = Math.round(plantsPerSqm * areaSqm);
    // Rough seeds needed considering germination rate
    let rawSeedsNeeded = Math.round(totalPopulation / germination);
    // Weight of seeds in kg
    let weightSeedsKg = (rawSeedsNeeded / 1000) * (seedWeight1000 / 1000);

    // Update UI elements
    container.querySelector("#res-total-pop").textContent = totalPopulation.toLocaleString("id-ID");
    container.querySelector("#res-raw-seeds").textContent = rawSeedsNeeded.toLocaleString("id-ID");
    container.querySelector("#res-weight-seeds").textContent = weightSeedsKg.toFixed(2);

    // Draw field simulation
    drawField(spacingRow, spacingCol, pattern);

    // Dynamic Recommendations
    const recBox = container.querySelector("#pop-recommendations");
    const patternText = pattern === "rectangular" ? "Persegi" : "Segitiga";
    recBox.innerHTML = `
      <h5>💡 Rekomendasi Lapangan:</h5>
      <ul>
        <li>Pola tanam <strong>${patternText}</strong> dipilih dengan kerapatan <strong>${(plantsPerSqm).toFixed(2)} tanaman/m²</strong>.</li>
        <li>Dengan daya tumbuh <strong>${(germination * 100)}%</strong>, pastikan Anda menyiapkan benih cadangan sebanyak <strong>${(rawSeedsNeeded - totalPopulation).toLocaleString("id-ID")} butir</strong> untuk penyulaman jika ada benih yang gagal tumbuh.</li>
        ${cropId === 'kelapa_sawit' ? '<li>Kelapa sawit sebaiknya ditanam menggunakan pola segitiga (spacing 9m x 9m x 9m) untuk memaksimalkan tangkapan cahaya matahari dan ruang pelepah.</li>' : ''}
        ${cropId === 'padi' ? '<li>Untuk padi, pertimbangkan metode Jajar Legowo 2:1 atau 4:1 untuk meningkatkan efek tanaman pinggir yang berproduksi lebih tinggi.</li>' : ''}
      </ul>
    `;

    // Save calculations in current scope
    currentResults = {
      cropId,
      cropName: crop ? crop.name : "Kustom",
      patternName: pattern === "rectangular" ? "Persegi" : "Segitiga",
      inputs: {
        area,
        areaUnit,
        spacingRow,
        spacingCol,
        pattern,
        germination: germination * 100,
        seedWeight: seedWeight1000
      },
      outputs: {
        totalPopulation,
        rawSeedsNeeded,
        weightSeedsKg
      }
    };
  }

  function drawField(spacingRow, spacingCol, pattern) {
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw soil background
    ctx.fillStyle = state.theme === "dark" ? "#1e251c" : "#f1ebd9";
    ctx.fillRect(0, 0, width, height);

    // Draw grid border
    ctx.strokeStyle = state.theme === "dark" ? "#344a30" : "#d0c3ab";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    // Sample size: 5 meters x 5 meters
    const sampleSize = 5.0; // meters
    const scale = width / sampleSize; // pixels per meter

    // Plant style
    ctx.fillStyle = "#2ecc71"; // Eco green
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(46, 204, 113, 0.4)";

    let plantRadius = 6;
    if (spacingRow < 0.2 || spacingCol < 0.2) plantRadius = 3;
    else if (spacingRow > 2.0 || spacingCol > 2.0) plantRadius = 12;

    if (pattern === "rectangular") {
      for (let r = 0; r <= sampleSize; r += spacingRow) {
        for (let c = 0; c <= sampleSize; c += spacingCol) {
          const px = c * scale;
          const py = r * scale;
          
          if (px >= 0 && px <= width && py >= 0 && py <= height) {
            ctx.beginPath();
            ctx.arc(px, py, plantRadius, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    } else {
      // Triangular (Offset) Grid
      const hSpacing = spacingCol; // Column distance
      const vSpacing = spacingRow * Math.sin(Math.PI / 3); // Vertical distance of row centers

      let rowIndex = 0;
      for (let y = 0; y <= sampleSize + vSpacing; y += vSpacing) {
        const offset = (rowIndex % 2 === 0) ? 0 : hSpacing / 2;
        for (let x = -offset; x <= sampleSize + hSpacing; x += hSpacing) {
          const px = x * scale;
          const py = y * scale;
          
          if (px >= 0 && px <= width && py >= 0 && py <= height) {
            ctx.beginPath();
            ctx.arc(px, py, plantRadius, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
        rowIndex++;
      }
    }

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw Scale Text
    ctx.fillStyle = state.theme === "dark" ? "#8ca388" : "#6c5d43";
    ctx.font = "12px sans-serif";
    ctx.fillText("Sampel Lapangan: 5m x 5m", 15, 25);
  }

  // Trigger initial calculation
  calculatePop();
}
