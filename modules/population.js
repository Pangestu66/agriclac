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
              ${db.CROPS.map(c => `<option value="${c.id}" ${state.selectedCropId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
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

  function applyCropDefaults(crop) {
    if (!crop) return;
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

  // Load defaults when crop changes
  cropSelect.addEventListener("change", (e) => {
    if (state.updateCropId) state.updateCropId(e.target.value);
    const crop = db.CROPS.find(c => c.id === e.target.value);
    applyCropDefaults(crop);
  });

  // Initialize spacing info
  const initialCrop = db.CROPS.find(c => c.id === cropSelect.value);
  applyCropDefaults(initialCrop);

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
    const width = 400;
    const height = 400;
    
    // Set up device pixel ratio for sharp rendering on retina screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Layout configuration
    const fieldX = 50;
    const fieldY = 30;
    const fieldW = 320;
    const fieldH = 320;
    
    const sampleSize = 5.0; // meters
    const scale = fieldW / sampleSize; // pixels per meter

    // 1. Draw soil background
    ctx.fillStyle = state.theme === "dark" ? "#1e251c" : "#f1ebd9";
    ctx.fillRect(fieldX, fieldY, fieldW, fieldH);

    // 2. Draw dotted grid lines inside the field every 1 meter
    ctx.save();
    ctx.strokeStyle = state.theme === "dark" ? "rgba(52, 74, 48, 0.4)" : "rgba(208, 195, 171, 0.5)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    for (let m = 1; m < 5; m++) {
      // Vertical grid line
      ctx.beginPath();
      ctx.moveTo(fieldX + m * scale, fieldY);
      ctx.lineTo(fieldX + m * scale, fieldY + fieldH);
      ctx.stroke();
      
      // Horizontal grid line
      ctx.beginPath();
      ctx.moveTo(fieldX, fieldY + m * scale);
      ctx.lineTo(fieldX + fieldW, fieldY + m * scale);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Draw grid border
    ctx.strokeStyle = state.theme === "dark" ? "#344a30" : "#d0c3ab";
    ctx.lineWidth = 2;
    ctx.strokeRect(fieldX, fieldY, fieldW, fieldH);

    // 4. Draw Plants
    let plantRadius = 6;
    if (spacingRow < 0.2 || spacingCol < 0.2) plantRadius = 3;
    else if (spacingRow > 2.0 || spacingCol > 2.0) plantRadius = 12;

    if (pattern === "rectangular") {
      for (let r = 0; r <= sampleSize + 0.001; r += spacingRow) {
        for (let c = 0; c <= sampleSize + 0.001; c += spacingCol) {
          const px = fieldX + c * scale;
          const py = fieldY + r * scale;
          
          if (px >= fieldX && px <= fieldX + fieldW && py >= fieldY && py <= fieldY + fieldH) {
            drawPlant(ctx, px, py, plantRadius);
          }
        }
      }
    } else {
      // Triangular (Offset) Grid
      const hSpacing = spacingCol; // Column distance
      const vSpacing = spacingRow * Math.sin(Math.PI / 3); // Vertical distance of row centers

      let rowIndex = 0;
      for (let y = 0; y <= sampleSize + vSpacing + 0.001; y += vSpacing) {
        const offset = (rowIndex % 2 === 0) ? 0 : hSpacing / 2;
        for (let x = -offset; x <= sampleSize + hSpacing + 0.001; x += hSpacing) {
          const px = fieldX + x * scale;
          const py = fieldY + y * scale;
          
          if (px >= fieldX && px <= fieldX + fieldW && py >= fieldY && py <= fieldY + fieldH) {
            drawPlant(ctx, px, py, plantRadius);
          }
        }
        rowIndex++;
      }
    }

    // 5. Draw Dimension Lines (Arrows & Spacing values)
    const px1 = fieldX;
    const py1 = fieldY;
    const px2 = fieldX + spacingCol * scale;
    const py2 = fieldY + spacingRow * scale;

    if (spacingCol * scale > 18 && px2 <= fieldX + fieldW) {
      const colLabel = `${spacingCol} m`;
      drawDimensionLine(ctx, px1, py1, px2, py1, colLabel, 20);
    }

    if (pattern === "rectangular") {
      if (spacingRow * scale > 18 && py2 <= fieldY + fieldH) {
        const rowLabel = `${spacingRow} m`;
        drawDimensionLine(ctx, px1, py1, px1, py2, rowLabel, -20);
      }
    } else {
      const vSpacing = spacingRow * Math.sin(Math.PI / 3);
      const py2Tri = fieldY + vSpacing * scale;
      if (vSpacing * scale > 18 && py2Tri <= fieldY + fieldH) {
        const rowLabel = `${spacingRow} m`;
        const diagX = px1 + (spacingCol / 2) * scale;
        if (diagX <= fieldX + fieldW) {
          drawDimensionLine(ctx, px1, py1, diagX, py2Tri, rowLabel, 15);
        } else {
          drawDimensionLine(ctx, px1, py1, px1, py2Tri, rowLabel, -20);
        }
      }
    }

    // 6. Draw Compass Rose
    drawCompass(ctx, fieldX + fieldW - 25, fieldY + 25);

    // 7. Draw Rulers around the field
    const rulerColor = state.theme === "dark" ? "#8ca388" : "#6c5d43";
    ctx.strokeStyle = rulerColor;
    ctx.fillStyle = rulerColor;
    ctx.lineWidth = 1.5;

    // Bottom horizontal ruler line
    ctx.beginPath();
    ctx.moveTo(fieldX, fieldY + fieldH + 10);
    ctx.lineTo(fieldX + fieldW, fieldY + fieldH + 10);
    ctx.stroke();

    // Left vertical ruler line
    ctx.beginPath();
    ctx.moveTo(fieldX - 10, fieldY);
    ctx.lineTo(fieldX - 10, fieldY + fieldH);
    ctx.stroke();

    // Draw ticks & labels
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let m = 0; m <= 5; m++) {
      const x = fieldX + m * scale;
      ctx.beginPath();
      ctx.moveTo(x, fieldY + fieldH + 10);
      ctx.lineTo(x, fieldY + fieldH + 15);
      ctx.stroke();
      ctx.fillText(`${m}m`, x, fieldY + fieldH + 18);
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let m = 0; m <= 5; m++) {
      const y = fieldY + fieldH - m * scale;
      ctx.beginPath();
      ctx.moveTo(fieldX - 10, y);
      ctx.lineTo(fieldX - 15, y);
      ctx.stroke();
      ctx.fillText(`${m}m`, fieldX - 18, y);
    }

    // Ruler labels
    ctx.save();
    ctx.fillStyle = rulerColor;
    ctx.font = "italic 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("← Lebar Sampel Lahan (5 Meter) →", fieldX + fieldW / 2, fieldY + fieldH + 34);
    
    ctx.translate(fieldX - 32, fieldY + fieldH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("← Panjang Sampel Lahan (5 Meter) →", 0, 0);
    ctx.restore();

    // Helper functions
    function drawPlant(ctx, x, y, radius) {
      if (spacingCol < 0.25 || spacingRow < 0.25) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#2ecc71";
        ctx.shadowBlur = 4;
        ctx.shadowColor = "rgba(46, 204, 113, 0.4)";
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        drawLeaf(ctx, x, y, radius * 1.5);
      }
    }

    function drawLeaf(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowBlur = 4;
      ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
      
      // Left leaf
      ctx.fillStyle = "#27ae60";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-size * 0.8, -size * 0.2, -size * 0.5, -size * 0.9, 0, -size);
      ctx.bezierCurveTo(size * 0.2, -size * 0.5, 0, -size * 0.2, 0, 0);
      ctx.fill();

      // Right leaf
      ctx.fillStyle = "#2ecc71";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(size * 0.8, -size * 0.2, size * 0.5, -size * 0.9, 0, -size);
      ctx.bezierCurveTo(-size * 0.2, -size * 0.5, 0, -size * 0.2, 0, 0);
      ctx.fill();
      
      // Bud
      ctx.fillStyle = "#a3e4d7";
      ctx.beginPath();
      ctx.arc(0, -size * 0.2, size * 0.15, 0, 2 * Math.PI);
      ctx.fill();

      ctx.restore();
    }

    function drawDimensionLine(ctx, x1, y1, x2, y2, text, offset) {
      ctx.save();
      ctx.strokeStyle = "#e74c3c";
      ctx.fillStyle = "#e74c3c";
      ctx.lineWidth = 1.5;
      ctx.font = "bold 10px sans-serif";

      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) {
        ctx.restore();
        return;
      }
      
      const px = -dy / len;
      const py = dx / len;

      const ox1 = x1 + px * offset;
      const oy1 = y1 + py * offset;
      const ox2 = x2 + px * offset;
      const oy2 = y2 + py * offset;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(ox1, oy1);
      ctx.moveTo(x2, y2);
      ctx.lineTo(ox2, oy2);
      ctx.strokeStyle = state.theme === "dark" ? "rgba(231, 76, 60, 0.25)" : "rgba(231, 76, 60, 0.35)";
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ox1, oy1);
      ctx.lineTo(ox2, oy2);
      ctx.strokeStyle = "#e74c3c";
      ctx.stroke();

      drawArrowhead(ctx, ox1, oy1, ox2, oy2, 5);
      drawArrowhead(ctx, ox2, oy2, ox1, oy1, 5);

      const cx = (ox1 + ox2) / 2;
      const cy = (oy1 + oy2) / 2;
      
      const textWidth = ctx.measureText(text).width + 6;
      ctx.fillStyle = state.theme === "dark" ? "#1e251c" : "#f1ebd9";
      ctx.fillRect(cx - textWidth/2, cy - 8, textWidth, 16);
      
      ctx.strokeStyle = "#e74c3c";
      ctx.strokeRect(cx - textWidth/2, cy - 8, textWidth, 16);
      
      ctx.fillStyle = "#e74c3c";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, cx, cy);
      
      ctx.restore();
    }

    function drawArrowhead(ctx, x1, y1, x2, y2, size) {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }

    function drawCompass(ctx, x, y) {
      ctx.save();
      ctx.translate(x, y);
      
      ctx.strokeStyle = state.theme === "dark" ? "#8ca388" : "#6c5d43";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(3, -3);
      ctx.lineTo(-3, -3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = state.theme === "dark" ? "#556b52" : "#a89b84";
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(3, 3);
      ctx.lineTo(-3, 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = state.theme === "dark" ? "#ffffff" : "#141a12";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("U", 0, -15);

      ctx.restore();
    }
  }

  // Trigger initial calculation
  calculatePop();
}
