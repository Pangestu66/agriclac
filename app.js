/**
 * AgriCalc - Core Application Coordinator & Dashboard Controller
 */

import { CROPS, FERTILIZERS, GENERAL_METRICS } from "./db.js";
import { initPopulationModule } from "./modules/population.js";
import { initFertilizerModule } from "./modules/fertilizer.js";
import { initPesticideModule } from "./modules/pesticide.js";
import { initEconomicsModule } from "./modules/economics.js";

class AgriCalcApp {
  constructor() {
    this.state = {
      theme: "dark",
      language: "id", // "id" or "en"
      activeTab: "dashboard",
      history: [],
      saveCalculation: (calcObj) => this.saveCalculation(calcObj),
      deleteCalculation: (id) => this.deleteCalculation(id)
    };

    this.translations = {
      id: {
        appTitle: "AgriCalc",
        tagline: "Kalkulator Pertanian Modern",
        dashboard: "Dashboard",
        population: "Populasi Lahan",
        fertilizer: "Nutrisi NPK",
        pesticide: "Kalibrasi Semprot",
        economics: "Ekonomi Usaha",
        recentLogs: "Riwayat Kalkulasi Terbaru",
        noLogs: "Belum ada kalkulasi tersimpan.",
        weatherTitle: "Telemetri Cuaca Lapangan",
        temp: "Suhu",
        humidity: "Kelembaban",
        rainProb: "Peluang Hujan",
        optimumTime: "Waktu Semprot Optimum",
        optimumValue: "Pagi (06:00 - 08:30)",
        clearHistory: "Bersihkan Riwayat"
      },
      en: {
        appTitle: "AgriCalc",
        tagline: "Modern Agricultural Calculator",
        dashboard: "Dashboard",
        population: "Plant Spacing",
        fertilizer: "NPK Nutrition",
        pesticide: "Spray Calibration",
        economics: "Farm Economics",
        recentLogs: "Recent Calculations History",
        noLogs: "No saved calculations yet.",
        weatherTitle: "Field Weather Telemetry",
        temp: "Temperature",
        humidity: "Humidity",
        rainProb: "Rain Probability",
        optimumTime: "Optimum Spray Time",
        optimumValue: "Morning (06:00 - 08:30)",
        clearHistory: "Clear History"
      }
    };

    this.db = { CROPS, FERTILIZERS, GENERAL_METRICS };
  }

  init() {
    // Load local storage preferences
    this.loadState();
    
    // Bind global header switches
    this.bindGlobalEvents();

    // Render navigation sidebar items
    this.renderNavigation();

    // Load active tab
    this.switchTab(this.state.activeTab);
  }

  loadState() {
    const cachedPrefs = localStorage.getItem("agricalc_preferences");
    if (cachedPrefs) {
      try {
        const parsed = JSON.parse(cachedPrefs);
        this.state.theme = parsed.theme || "dark";
        this.state.language = parsed.language || "id";
        this.state.activeTab = parsed.activeTab || "dashboard";
      } catch (e) {
        console.error("Failed parsing preferences", e);
      }
    }

    const cachedHistory = localStorage.getItem("agricalc_history");
    if (cachedHistory) {
      try {
        this.state.history = JSON.parse(cachedHistory);
      } catch (e) {
        console.error("Failed parsing history", e);
      }
    }

    // Apply active theme to document body
    document.body.setAttribute("data-theme", this.state.theme);
    document.getElementById("theme-toggle").checked = this.state.theme === "light";
    document.getElementById("lang-select").value = this.state.language;
  }

  saveState() {
    localStorage.setItem("agricalc_preferences", JSON.stringify({
      theme: this.state.theme,
      language: this.state.language,
      activeTab: this.state.activeTab
    }));
    localStorage.setItem("agricalc_history", JSON.stringify(this.state.history));
  }

  bindGlobalEvents() {
    // Theme Toggler
    const themeCheckbox = document.getElementById("theme-toggle");
    themeCheckbox.addEventListener("change", (e) => {
      this.state.theme = e.target.checked ? "light" : "dark";
      document.body.setAttribute("data-theme", this.state.theme);
      this.saveState();
      
      // If we are currently in a tab that has a canvas (e.g. population) or SVG chart (economics), 
      // trigger a redraw by re-initializing that tab.
      if (this.state.activeTab !== "dashboard") {
        this.switchTab(this.state.activeTab);
      }
    });

    // Language Selector
    const langSelect = document.getElementById("lang-select");
    langSelect.addEventListener("change", (e) => {
      this.state.language = e.target.value;
      this.saveState();
      
      // Refresh UI elements
      this.updateGlobalTexts();
      this.renderNavigation();
      
      if (this.state.activeTab === "dashboard") {
        this.renderDashboard();
      } else {
        this.switchTab(this.state.activeTab);
      }
    });
  }

  updateGlobalTexts() {
    const dict = this.translations[this.state.language];
    document.getElementById("app-title").textContent = dict.appTitle;
    document.getElementById("app-tagline").textContent = dict.tagline;
  }

  renderNavigation() {
    const dict = this.translations[this.state.language];
    const navItems = [
      { id: "dashboard", label: dict.dashboard, icon: "🏠" },
      { id: "population", label: dict.population, icon: "🌱" },
      { id: "fertilizer", label: dict.fertilizer, icon: "🧪" },
      { id: "pesticide", label: dict.pesticide, icon: "💧" },
      { id: "economics", label: dict.economics, icon: "📈" }
    ];

    const navList = document.getElementById("nav-list");
    navList.innerHTML = navItems.map(item => `
      <li class="nav-item ${this.state.activeTab === item.id ? 'active' : ''}" data-tab="${item.id}">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
      </li>
    `).join("");

    // Bind tab switching
    navList.querySelectorAll(".nav-item").forEach(el => {
      el.addEventListener("click", () => {
        const tabId = el.getAttribute("data-tab");
        this.switchTab(tabId);
      });
    });
  }

  switchTab(tabId) {
    this.state.activeTab = tabId;
    this.saveState();

    // Re-render navigation class
    document.querySelectorAll("#nav-list .nav-item").forEach(el => {
      if (el.getAttribute("data-tab") === tabId) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });

    // Populate main workspace area
    const contentArea = document.getElementById("main-content");
    contentArea.className = `content-area tab-view-${tabId}`;

    if (tabId === "dashboard") {
      this.renderDashboard();
    } else if (tabId === "population") {
      initPopulationModule(contentArea, this.state, this.db);
    } else if (tabId === "fertilizer") {
      initFertilizerModule(contentArea, this.state, this.db);
    } else if (tabId === "pesticide") {
      initPesticideModule(contentArea, this.state, this.db);
    } else if (tabId === "economics") {
      initEconomicsModule(contentArea, this.state, this.db);
    }
  }

  saveCalculation(calcObj) {
    const newEntry = {
      id: "calc_" + Date.now(),
      timestamp: new Date().toISOString(),
      ...calcObj
    };
    this.state.history.unshift(newEntry);
    // Limit to 20 history entries
    if (this.state.history.length > 20) {
      this.state.history.pop();
    }
    this.saveState();
  }

  deleteCalculation(id) {
    this.state.history = this.state.history.filter(c => c.id !== id);
    this.saveState();
    if (this.state.activeTab === "dashboard") {
      this.renderDashboard();
    }
  }

  clearHistory() {
    if (confirm(this.state.language === "id" ? "Apakah Anda yakin ingin menghapus seluruh riwayat?" : "Are you sure you want to clear all history?")) {
      this.state.history = [];
      this.saveState();
      if (this.state.activeTab === "dashboard") {
        this.renderDashboard();
      }
    }
  }

  renderDashboard() {
    const dict = this.translations[this.state.language];
    const isIndo = this.state.language === "id";

    // Standard static telemetry coordinates representing Kediri / Malang horticultural basins
    const locationName = isIndo ? "Kediri, Jawa Timur" : "Kediri, East Java";

    const contentArea = document.getElementById("main-content");
    contentArea.innerHTML = `
      <div class="dashboard-header">
        <h2>👋 Selamat Datang di AgriCalc</h2>
        <p>Gunakan navigasi untuk mulai menghitung kebutuhan operasional pertanian Anda secara presisi.</p>
      </div>

      <div class="dashboard-layout">
        <!-- Main Panel: Recent Logs & Short Guide -->
        <div class="dash-column-main">
          <div class="glass-panel logs-panel">
            <div class="panel-header">
              <h3>${dict.recentLogs}</h3>
              ${this.state.history.length > 0 ? `<button id="clear-hist-btn" class="btn-clear">${dict.clearHistory}</button>` : ""}
            </div>
            
            <div class="history-list" id="dashboard-history">
              ${this.renderHistoryList()}
            </div>
          </div>

          <!-- Feature Cards Quick Link -->
          <div class="quick-links-grid">
            <div class="quick-card" data-tab="population">
              <div class="quick-card-icon">🌱</div>
              <h4>${dict.population}</h4>
              <p>${isIndo ? "Hitung populasi tanaman per baris & model grid." : "Calculate row density and grid representation."}</p>
            </div>
            <div class="quick-card" data-tab="fertilizer">
              <div class="quick-card-icon">🧪</div>
              <h4>${dict.fertilizer}</h4>
              <p>${isIndo ? "Atur dosis hara N-P-K makro & karung pupuk." : "Manage soil N-P-K nutrient split guidelines."}</p>
            </div>
            <div class="quick-card" data-tab="pesticide">
              <div class="quick-card-icon">💧</div>
              <h4>${dict.pesticide}</h4>
              <p>${isIndo ? "Kalibrasi kecepatan semprot & debit tangki." : "Calibrate tank capacity and nozzle speed."}</p>
            </div>
            <div class="quick-card" data-tab="economics">
              <div class="quick-card-icon">📈</div>
              <h4>${dict.economics}</h4>
              <p>${isIndo ? "Proyeksi modal, BEP produksi, dan rasio ROI." : "Analyze cost structure, BEPs, and ROI ratio."}</p>
            </div>
          </div>
        </div>

        <!-- Sidebar Panel: Weather telemetry & Quick Stats -->
        <div class="dash-column-side">
          <div class="glass-panel weather-panel">
            <h3>☀️ ${dict.weatherTitle}</h3>
            <div class="weather-location">📍 ${locationName}</div>
            
            <div class="weather-grid">
              <div class="weather-item">
                <span class="w-label">${dict.temp}</span>
                <span class="w-val">28°C</span>
              </div>
              <div class="weather-item">
                <span class="w-label">${dict.humidity}</span>
                <span class="w-val">82%</span>
              </div>
              <div class="weather-item">
                <span class="w-label">${dict.rainProb}</span>
                <span class="w-val">15%</span>
              </div>
            </div>
            
            <div class="weather-advice">
              <h5>🎯 ${dict.optimumTime}</h5>
              <p>${dict.optimumValue}</p>
              <span class="weather-tag">Sangat Baik (Good)</span>
            </div>
          </div>

          <div class="glass-panel stats-panel">
            <h3>📊 Ringkasan Statistik</h3>
            <div class="stat-item">
              <span class="stat-lbl">Kalkulasi Tersimpan</span>
              <span class="stat-val">${this.state.history.length}</span>
            </div>
            <div class="stat-item">
              <span class="stat-lbl">Lahan Terakhir Mapped</span>
              <span class="stat-val">${this.getLastMappedArea()}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind dashboard quick cards navigation clicks
    contentArea.querySelectorAll(".quick-card").forEach(card => {
      card.addEventListener("click", () => {
        const tab = card.getAttribute("data-tab");
        this.switchTab(tab);
      });
    });

    // Bind clear history button
    const clearBtn = contentArea.querySelector("#clear-hist-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearHistory());
    }

    // Bind individual history deletion items
    contentArea.querySelectorAll(".btn-delete-log").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const calcId = btn.getAttribute("data-id");
        this.deleteCalculation(calcId);
      });
    });
  }

  getLastMappedArea() {
    const lastPop = this.state.history.find(h => h.inputs && h.inputs.area);
    if (lastPop) {
      return `${lastPop.inputs.area} ${lastPop.inputs.areaUnit === "ha" ? "ha" : "m²"}`;
    }
    return "-";
  }

  renderHistoryList() {
    const dict = this.translations[this.state.language];
    const isIndo = this.state.language === "id";

    if (this.state.history.length === 0) {
      return `<div class="empty-history-text">${dict.noLogs}</div>`;
    }

    const typeIcons = {
      population: "🌱",
      fertilizer: "🧪",
      pesticide: "💧",
      economics: "📈"
    };

    return this.state.history.map(item => {
      const dateStr = new Date(item.timestamp).toLocaleString(isIndo ? "id-ID" : "en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      let subtext = "";
      if (item.type === "population" && item.outputs) {
        subtext = isIndo 
          ? `Populasi: ${item.outputs.totalPopulation.toLocaleString("id-ID")} tanaman` 
          : `Population: ${item.outputs.totalPopulation.toLocaleString("en-US")} plants`;
      } else if (item.type === "fertilizer" && item.outputs) {
        subtext = isIndo 
          ? `Biaya Pupuk: IDR ${Math.round(item.outputs.totalCost).toLocaleString("id-ID")}` 
          : `Fertilizer Cost: IDR ${Math.round(item.outputs.totalCost).toLocaleString("en-US")}`;
      } else if (item.type === "pesticide" && item.outputs) {
        subtext = isIndo 
          ? `Vol Semprot: ${Math.round(item.outputs.sprayVolumePerHa)} L/ha` 
          : `Spray Volume: ${Math.round(item.outputs.sprayVolumePerHa)} L/ha`;
      } else if (item.type === "economics" && item.outputs) {
        subtext = isIndo 
          ? `ROI: ${item.outputs.roi.toFixed(1)}% | Profit: IDR ${Math.round(item.outputs.netProfit).toLocaleString("id-ID")}` 
          : `ROI: ${item.outputs.roi.toFixed(1)}% | Profit: IDR ${Math.round(item.outputs.netProfit).toLocaleString("en-US")}`;
      }

      return `
        <div class="history-item">
          <div class="hist-icon-box">${typeIcons[item.type] || "🚜"}</div>
          <div class="hist-details">
            <span class="hist-title">${item.title}</span>
            <span class="hist-sub">${subtext} &bull; ${dateStr}</span>
          </div>
          <button class="btn-delete-log" data-id="${item.id}" title="${isIndo ? 'Hapus' : 'Delete'}">&times;</button>
        </div>
      `;
    }).join("");
  }
}

// Instantiate and start app when loaded
document.addEventListener("DOMContentLoaded", () => {
  const app = new AgriCalcApp();
  app.init();
});
