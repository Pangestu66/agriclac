/**
 * AgriCalc - Pesticide Calibration Module
 */

export function initPesticideModule(container, state, db) {
  container.innerHTML = `
    <div class="module-header">
      <h2>💧 Kalibrasi Semprot & Dosis Pestisida</h2>
      <p>Lakukan kalibrasi tangki semprot (knapsack sprayer) Anda secara presisi untuk menghindari pemborosan bahan kimia dan pencemaran lingkungan.</p>
    </div>
    
    <div class="module-grid">
      <!-- Input Panel -->
      <div class="glass-panel input-panel">
        <h3>Parameter Penyemprotan</h3>
        <div class="helper-info-box" style="margin-bottom: 15px;">
          💡 <strong>Panduan Pemula:</strong> Bingung dengan spesifikasi alat Anda? Klik tombol di bawah untuk memuat setelan standar penyemprot punggung elektrik (knapsack sprayer) di Indonesia.
          <br>
          <button type="button" id="pest-preset-btn" class="btn-preset">Gunakan Setelan Standar</button>
        </div>
        
        <form id="pest-form" class="calc-form">
          <div class="form-row">
            <div class="form-group">
              <label for="pest-area-val">Luas Lahan:</label>
              <input type="number" id="pest-area-val" name="area" value="1" min="0.01" step="any" required>
            </div>
            <div class="form-group">
              <label for="pest-area-unit">Satuan:</label>
              <select id="pest-area-unit" name="areaUnit">
                <option value="ha" selected>Hektar (ha)</option>
                <option value="sqm">Meter Persegi (m²)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="pest-nozzle-flow">Debit Aliran Nozel (liter/menit):</label>
            <input type="number" id="pest-nozzle-flow" name="nozzleFlow" value="1.2" min="0.1" step="0.1" required>
            <span class="help-text">Umumnya berkisar antara 0.8 s.d 1.5 L/menit tergantung jenis nozel dan tekanan pompa.</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="pest-speed">Kecepatan Jalan (km/jam):</label>
              <input type="number" id="pest-speed" name="speed" value="4.0" min="0.5" step="0.1" required>
            </div>
            <div class="form-group">
              <label for="pest-width">Lebar Semprotan (meter):</label>
              <input type="number" id="pest-width" name="width" value="1.5" min="0.2" step="0.1" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="pest-tank-cap">Kapasitas Tangki (liter):</label>
              <input type="number" id="pest-tank-cap" name="tankCapacity" value="16" min="1" step="1" required>
            </div>
            <div class="form-group">
              <label for="pest-dose">Konsentrasi Dosis (ml/L atau g/L):</label>
              <input type="number" id="pest-dose" name="dose" value="2.0" min="0.1" step="0.1" required>
            </div>
          </div>

          <button type="submit" class="btn btn-primary">Kalibrasi Semprotan</button>
        </form>
      </div>
      
      <!-- Output Panel -->
      <div class="glass-panel output-panel">
        <h3>Hasil Kalibrasi Alat</h3>
        <div id="pest-results" class="results-container">
          <div class="results-summary">
            <div class="metric-card">
              <span class="metric-label">Volume Semprot per Hektar</span>
              <span class="metric-value" id="res-spray-vol">0</span>
              <span class="metric-unit">L/ha</span>
            </div>
            <div class="metric-row">
              <div class="metric-subcard">
                <span class="sub-label">Dosis Pestisida per Tangki</span>
                <span class="sub-value" id="res-pest-per-tank">0.0</span>
                <span class="sub-unit">ml atau gram</span>
              </div>
              <div class="metric-subcard">
                <span class="sub-label">Jumlah Tangki Total</span>
                <span class="sub-value" id="res-total-tanks">0.0</span>
                <span class="sub-unit">tangki</span>
              </div>
            </div>
          </div>

          <div class="bulletins-container">
            <h4>📊 Kebutuhan Total Operasional</h4>
            <div class="bullet-list">
              <div class="bullet-item">
                <span class="bullet-lbl">Total Air yang Dibutuhkan:</span>
                <span class="bullet-val" id="res-total-water">0 liter</span>
              </div>
              <div class="bullet-item">
                <span class="bullet-lbl">Total Konsentrat Pestisida:</span>
                <span class="bullet-val" id="res-total-chemical">0 ml / gram</span>
              </div>
            </div>
          </div>

          <div class="recommendations-box">
            <h5>💡 Petunjuk Keselamatan & Aplikasi:</h5>
            <ul>
              <li>Lakukan kalibrasi ulang dengan air bersih saja jika jenis nozel atau operator penyemprot berubah.</li>
              <li>Selalu gunakan alat pelindung diri (masker, kacamata, sarung tangan) saat menuang pestisida ke dalam tangki.</li>
              <li>Lakukan penyemprotan pada pagi hari (pukul 06.00-09.00) atau sore hari ketika kecepatan angin rendah demi meminimalkan terjadinya penyimpangan arah semprot (drift).</li>
            </ul>
          </div>

          <button id="pest-save-btn" class="btn btn-secondary" style="margin-top: 15px;">Simpan ke Riwayat</button>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector("#pest-form");
  const saveBtn = container.querySelector("#pest-save-btn");
  const presetBtn = container.querySelector("#pest-preset-btn");

  let currentResults = null;

  presetBtn.addEventListener("click", () => {
    container.querySelector("#pest-nozzle-flow").value = "1.2";
    container.querySelector("#pest-speed").value = "4.0";
    container.querySelector("#pest-width").value = "1.5";
    container.querySelector("#pest-tank-cap").value = "16";
    container.querySelector("#pest-dose").value = "2.0";
    calculatePest();
    alert("Setelan penyemprotan standar dimuat!");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    calculatePest();
  });

  saveBtn.addEventListener("click", () => {
    if (currentResults) {
      state.saveCalculation({
        type: "pesticide",
        cropId: "kustom",
        title: `Kalibrasi Semprotan (${currentResults.inputs.area} ${currentResults.inputs.areaUnit})`,
        inputs: currentResults.inputs,
        outputs: currentResults.outputs
      });
      alert("Kalkulasi berhasil disimpan ke riwayat!");
    }
  });

  function calculatePest() {
    const formData = new FormData(form);
    const area = parseFloat(formData.get("area"));
    const areaUnit = formData.get("areaUnit");
    const areaHa = areaUnit === "ha" ? area : area / 10000;

    const nozzleFlow = parseFloat(formData.get("nozzleFlow"));
    const speed = parseFloat(formData.get("speed"));
    const width = parseFloat(formData.get("width"));
    const tankCapacity = parseFloat(formData.get("tankCapacity"));
    const dose = parseFloat(formData.get("dose"));

    // Math calibration
    // Formula: V = (600 * Flow rate L/min) / (Speed km/h * Width m)
    const sprayVolumePerHa = (600 * nozzleFlow) / (speed * width);
    const totalWaterLiters = sprayVolumePerHa * areaHa;
    const totalTanks = totalWaterLiters / tankCapacity;
    const dosePerTank = tankCapacity * dose;
    const totalPesticideNeeded = totalWaterLiters * dose;

    // Update UI elements
    container.querySelector("#res-spray-vol").textContent = Math.round(sprayVolumePerHa).toLocaleString("id-ID");
    container.querySelector("#res-pest-per-tank").textContent = dosePerTank.toFixed(1);
    container.querySelector("#res-total-tanks").textContent = totalTanks.toFixed(1);
    container.querySelector("#res-total-water").textContent = `${Math.round(totalWaterLiters).toLocaleString("id-ID")} liter`;
    container.querySelector("#res-total-chemical").textContent = `${Math.round(totalPesticideNeeded).toLocaleString("id-ID")} ml / gram`;

    currentResults = {
      inputs: {
        area,
        areaUnit,
        nozzleFlow,
        speed,
        width,
        tankCapacity,
        dose
      },
      outputs: {
        sprayVolumePerHa,
        totalWaterLiters,
        totalTanks,
        dosePerTank,
        totalPesticideNeeded
      }
    };
  }

  // Trigger initial calculation
  calculatePest();
}
