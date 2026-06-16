/**
 * AgriCalc - Core Application Coordinator & Dashboard Controller
 * Decoupled Frontend Version (Root level)
 */

import { CROPS, FERTILIZERS, GENERAL_METRICS } from "./db.js";
import { initPopulationModule } from "./modules/population.js";
import { initFertilizerModule } from "./modules/fertilizer.js";
import { initPesticideModule } from "./modules/pesticide.js";
import { initEconomicsModule } from "./modules/economics.js";

// ─── API Service Layer ───────────────────────────────────────
class ApiService {
  constructor() {
    this.baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:8787/api'
      : 'https://agricalc-api.agricalc.workers.dev/api';
    this.token = localStorage.getItem('agricalc_token') || null;
  }

  get headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  async request(endpoint, options = {}) {
    try {
      const resp = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: { ...this.headers, ...(options.headers || {}) }
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      return data;
    } catch (err) {
      // Network error — allow offline mode
      if (err.message === 'Failed to fetch') {
        console.warn('[API] Offline mode — using localStorage');
        return null;
      }
      throw err;
    }
  }

  // Auth
  async register(username, email, password) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    if (data && data.token) {
      this.token = data.token;
      localStorage.setItem('agricalc_token', data.token);
      localStorage.setItem('agricalc_user', JSON.stringify(data.user));
    }
    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data && data.token) {
      this.token = data.token;
      localStorage.setItem('agricalc_token', data.token);
      localStorage.setItem('agricalc_user', JSON.stringify(data.user));
    }
    return data;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('agricalc_token');
    localStorage.removeItem('agricalc_user');
  }

  getUser() {
    const cached = localStorage.getItem('agricalc_user');
    if (cached) {
      try { return JSON.parse(cached); } catch(e) { return null; }
    }
    return null;
  }

  isLoggedIn() {
    return !!this.token;
  }

  // Calculations sync
  async syncCalculations(calculations) {
    if (!this.isLoggedIn()) return null;
    return this.request('/calculations/sync', {
      method: 'POST',
      body: JSON.stringify({ calculations })
    });
  }

  async getCalculations() {
    if (!this.isLoggedIn()) return null;
    return this.request('/calculations');
  }

  async deleteCalculation(id) {
    if (!this.isLoggedIn()) return null;
    return this.request(`/calculations/${id}`, { method: 'DELETE' });
  }

  // Market prices
  async getMarketPrices(region) {
    const qs = region ? `?region=${encodeURIComponent(region)}` : '';
    return this.request(`/market/prices${qs}`);
  }
}

// ─── Main Application ───────────────────────────────────────
class AgriCalcApp {
  constructor() {
    this.api = new ApiService();

    this.state = {
      theme: "light",
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
        clearHistory: "Bersihkan Riwayat",
        login: "Masuk",
        register: "Daftar",
        logout: "Keluar",
        synced: "Tersinkronkan ☁️",
        guest: "Mode Tamu"
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
        clearHistory: "Clear History",
        login: "Login",
        register: "Register",
        logout: "Logout",
        synced: "Synced ☁️",
        guest: "Guest Mode"
      }
    };

    this.db = { CROPS, FERTILIZERS, GENERAL_METRICS };
  }

  init() {
    // Load local storage preferences
    this.loadState();
    
    // Check if query parameters specify a tab (e.g. from landing page quick links)
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['dashboard', 'population', 'fertilizer', 'pesticide', 'economics'].includes(tabParam)) {
      this.state.activeTab = tabParam;
    }
    
    // Bind global header switches
    this.bindGlobalEvents();

    // Setup auth UI
    this.bindAuthEvents();
    this.updateAuthUI();

    // Render navigation sidebar items
    this.renderNavigation();

    // Load active tab
    this.switchTab(this.state.activeTab);

    // If logged in, sync from server
    if (this.api.isLoggedIn()) {
      this.pullFromServer();
    }
  }

  loadState() {
    const cachedPrefs = localStorage.getItem("agricalc_preferences");
    if (cachedPrefs) {
      try {
        const parsed = JSON.parse(cachedPrefs);
        this.state.theme = parsed.theme || "light";
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
      
      if (this.state.activeTab !== "dashboard") {
        this.switchTab(this.state.activeTab);
      }
    });

    // Language Selector
    const langSelect = document.getElementById("lang-select");
    langSelect.addEventListener("change", (e) => {
      this.state.language = e.target.value;
      this.saveState();
      
      this.updateGlobalTexts();
      this.renderNavigation();
      this.updateAuthUI();
      
      if (this.state.activeTab === "dashboard") {
        this.renderDashboard();
      } else {
        this.switchTab(this.state.activeTab);
      }
    });
  }

  // ─── Auth Events ──────────────────────────────────────────
  bindAuthEvents() {
    const modal = document.getElementById('auth-modal');
    const loginBtn = document.getElementById('btn-login');
    const closeBtn = document.getElementById('auth-modal-close');
    const guestBtn = document.getElementById('btn-guest');
    const form = document.getElementById('auth-form');
    const tabs = modal.querySelectorAll('.modal-tab');

    this.authMode = 'login';

    // Open modal
    loginBtn?.addEventListener('click', () => {
      modal.style.display = 'flex';
    });

    // Close modal
    closeBtn?.addEventListener('click', () => {
      modal.style.display = 'none';
      this.clearAuthError();
    });

    // Click outside to close
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        this.clearAuthError();
      }
    });

    // Guest mode
    guestBtn?.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Tab switching (login/register)
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.getAttribute('data-mode');
        this.authMode = mode;
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const usernameGroup = document.getElementById('fg-username');
        const submitBtn = document.getElementById('auth-submit');
        const isIndo = this.state.language === 'id';

        if (mode === 'register') {
          usernameGroup.style.display = 'flex';
          submitBtn.querySelector('.btn-text').textContent = isIndo ? 'Daftar' : 'Register';
        } else {
          usernameGroup.style.display = 'none';
          submitBtn.querySelector('.btn-text').textContent = isIndo ? 'Masuk' : 'Login';
        }
        this.clearAuthError();
      });
    });

    // Form submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleAuthSubmit();
    });
  }

  async handleAuthSubmit() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username').value.trim();
    const submitBtn = document.getElementById('auth-submit');
    const spinner = submitBtn.querySelector('.btn-spinner');
    const btnText = submitBtn.querySelector('.btn-text');

    // Show loading
    spinner.style.display = 'inline-block';
    btnText.style.display = 'none';
    submitBtn.disabled = true;

    try {
      let result;
      if (this.authMode === 'register') {
        if (!username || username.length < 3) {
          throw new Error(this.state.language === 'id' ? 'Username minimal 3 karakter' : 'Username must be at least 3 characters');
        }
        result = await this.api.register(username, email, password);
      } else {
        result = await this.api.login(email, password);
      }

      if (result) {
        // Success — close modal & update UI
        document.getElementById('auth-modal').style.display = 'none';
        this.updateAuthUI();
        this.showSyncIndicator('success', this.state.language === 'id' ? '✅ Berhasil masuk!' : '✅ Login successful!');

        // Sync local history to server
        if (this.state.history.length > 0) {
          await this.pushToServer();
        }
        // Then pull server history
        await this.pullFromServer();
      }
    } catch (err) {
      this.showAuthError(err.message);
    } finally {
      spinner.style.display = 'none';
      btnText.style.display = 'inline';
      submitBtn.disabled = false;
    }
  }

  showAuthError(msg) {
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }

  clearAuthError() {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }
  }

  updateAuthUI() {
    const authSection = document.getElementById('auth-section');
    const dict = this.translations[this.state.language];

    if (this.api.isLoggedIn()) {
      const user = this.api.getUser();
      const initial = (user?.username || 'U').charAt(0).toUpperCase();
      authSection.innerHTML = `
        <div class="user-badge">
          <div class="user-avatar">${initial}</div>
          <div class="user-info">
            <span class="user-name">${user?.username || 'User'}</span>
            <span class="user-sync-status">${dict.synced}</span>
          </div>
          <button class="btn-logout" id="btn-logout-action" title="${dict.logout}">${dict.logout}</button>
        </div>
      `;

      // Bind logout
      document.getElementById('btn-logout-action')?.addEventListener('click', () => {
        this.api.logout();
        this.updateAuthUI();
        this.showSyncIndicator('success', this.state.language === 'id' ? '👋 Berhasil keluar' : '👋 Logged out');
      });
    } else {
      authSection.innerHTML = `
        <button class="btn-auth" id="btn-login" title="${dict.login}">
          <span class="auth-icon">👤</span>
          <span class="auth-label">${dict.login}</span>
        </button>
      `;
      // Re-bind login button
      document.getElementById('btn-login')?.addEventListener('click', () => {
        document.getElementById('auth-modal').style.display = 'flex';
      });
    }
  }

  // ─── Sync Operations ─────────────────────────────────────
  async pushToServer() {
    if (!this.api.isLoggedIn() || this.state.history.length === 0) return;

    this.showSyncIndicator('syncing', this.state.language === 'id' ? '🔄 Menyinkronkan...' : '🔄 Syncing...');

    try {
      await this.api.syncCalculations(this.state.history);
      this.showSyncIndicator('success', this.state.language === 'id' ? '✅ Tersinkronkan' : '✅ Synced');
    } catch (err) {
      console.error('[Sync Push Error]', err);
      this.showSyncIndicator('error', this.state.language === 'id' ? '❌ Gagal sinkronisasi' : '❌ Sync failed');
    }
  }

  async pullFromServer() {
    if (!this.api.isLoggedIn()) return;

    try {
      const data = await this.api.getCalculations();
      if (data && data.calculations && data.calculations.length > 0) {
        // Merge server calculations with local (dedup by id)
        const localIds = new Set(this.state.history.map(h => h.id));
        const serverNew = data.calculations.filter(c => !localIds.has(c.id));
        if (serverNew.length > 0) {
          this.state.history = [...this.state.history, ...serverNew]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 20);
          this.saveState();
          if (this.state.activeTab === 'dashboard') {
            this.renderDashboard();
          }
        }
      }
    } catch (err) {
      console.error('[Sync Pull Error]', err);
    }
  }

  showSyncIndicator(type, text) {
    const indicator = document.getElementById('sync-indicator');
    indicator.className = `sync-indicator ${type}`;
    indicator.innerHTML = `
      <span class="sync-icon">${type === 'syncing' ? '🔄' : type === 'success' ? '✅' : '❌'}</span>
      <span class="sync-text">${text}</span>
    `;
    indicator.style.display = 'flex';
    
    if (type !== 'syncing') {
      setTimeout(() => {
        indicator.style.display = 'none';
      }, 3000);
    }
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

    // Push to server if logged in
    if (this.api.isLoggedIn()) {
      this.pushToServer();
    }
  }

  deleteCalculation(id) {
    this.state.history = this.state.history.filter(c => c.id !== id);
    this.saveState();

    // Delete from server too
    if (this.api.isLoggedIn()) {
      this.api.deleteCalculation(id).catch(err => {
        console.error('[Delete Server Error]', err);
      });
    }

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
            <div class="stat-item">
              <span class="stat-lbl">Status Akun</span>
              <span class="stat-val">${this.api.isLoggedIn() ? (dict.synced) : (dict.guest)}</span>
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
