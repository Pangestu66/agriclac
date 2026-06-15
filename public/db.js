/**
 * AgriCalc Static Database
 * Standard reference data for Indonesian crop spacing, NPK nutrient demand, 
 * and fertilizer concentrations.
 */

export const CROPS = [
  {
    id: "padi",
    name: "Padi Sawah (Rice)",
    category: "Pangan",
    defaultSpacingRow: 0.25, // meters (e.g. 25x25 cm Jajar Legowo baseline)
    defaultSpacingCol: 0.25,
    recommendationN: 120, // kg/ha N
    recommendationP: 60,  // kg/ha P2O5
    recommendationK: 50,  // kg/ha K2O
    growthDurationDays: 115,
    expectedYieldPerHa: 6000, // kg/ha
    pricePerKg: 6500, // IDR per kg GKP
    description: "Tanaman pangan utama. Memerlukan penggenangan air berkala dan pemupukan N nitrogen tinggi."
  },
  {
    id: "jagung",
    name: "Jagung Hibrida (Hybrid Maize)",
    category: "Pangan",
    defaultSpacingRow: 0.75, // meters
    defaultSpacingCol: 0.20,
    recommendationN: 150,
    recommendationP: 75,
    recommendationK: 50,
    growthDurationDays: 105,
    expectedYieldPerHa: 8000,
    pricePerKg: 4800,
    description: "Tanaman semusim yang sangat responsif terhadap pupuk nitrogen. Jarak tanam optimal menentukan populasi tongkol."
  },
  {
    id: "kelapa_sawit",
    name: "Kelapa Sawit (Oil Palm)",
    category: "Perkebunan",
    defaultSpacingRow: 9.0, // meters (segitiga sama sisi spacing)
    defaultSpacingCol: 9.0,
    recommendationN: 160,
    recommendationP: 100,
    recommendationK: 220,
    growthDurationDays: 365,
    expectedYieldPerHa: 22000,
    pricePerKg: 2400, // TBS per kg
    description: "Tanaman keras tahunan. Menggunakan pola segitiga sama sisi (hexagonal spacing) untuk penetrasi cahaya matahari maksimal."
  },
  {
    id: "tomat",
    name: "Tomat Hortikultura (Tomato)",
    category: "Hortikultura",
    defaultSpacingRow: 0.60,
    defaultSpacingCol: 0.50,
    recommendationN: 100,
    recommendationP: 80,
    recommendationK: 120,
    growthDurationDays: 85,
    expectedYieldPerHa: 15000,
    pricePerKg: 9000,
    description: "Tanaman hortikultura bernilai tinggi. Membutuhkan kalium (K) tinggi untuk pembentukan buah berkualitas."
  },
  {
    id: "cabai",
    name: "Cabai Merah (Red Chili)",
    category: "Hortikultura",
    defaultSpacingRow: 0.60,
    defaultSpacingCol: 0.50,
    recommendationN: 120,
    recommendationP: 100,
    recommendationK: 100,
    growthDurationDays: 120,
    expectedYieldPerHa: 12000,
    pricePerKg: 25000,
    description: "Tanaman hortikultura dengan fluktuasi harga tinggi. Memerlukan mulsa plastik dan pemupukan berimbang."
  },
  {
    id: "kedelai",
    name: "Kedelai (Soybean)",
    category: "Pangan",
    defaultSpacingRow: 0.40,
    defaultSpacingCol: 0.20,
    recommendationN: 50, // Rendah karena simbiosis Rhizobium ikat N
    recommendationP: 60,
    recommendationK: 50,
    growthDurationDays: 90,
    expectedYieldPerHa: 2500,
    pricePerKg: 11000,
    description: "Tanaman legum penambat nitrogen bebas dari udara. Memerlukan inokulan Rhizobium dan fosfat cukup."
  }
];

export const FERTILIZERS = [
  {
    id: "urea",
    name: "Urea",
    n: 46,
    p: 0,
    k: 0,
    subsidizedPrice: 112500, // IDR per 50kg bag (subsidized)
    commercialPrice: 350000, // IDR per 50kg bag (commercial/non-subsidized)
    color: "hsl(150, 40%, 45%)"
  },
  {
    id: "sp36",
    name: "SP-36",
    n: 0,
    p: 36,
    k: 0,
    subsidizedPrice: 120000,
    commercialPrice: 380000,
    color: "hsl(200, 40%, 45%)"
  },
  {
    id: "kcl",
    name: "KCl (MOP)",
    n: 0,
    p: 0,
    k: 60,
    subsidizedPrice: 400000, // Jarang disubsidi penuh
    commercialPrice: 480000,
    color: "hsl(10, 50%, 45%)"
  },
  {
    id: "npk_15",
    name: "NPK Phonska (15-15-15)",
    n: 15,
    p: 15,
    k: 15,
    subsidizedPrice: 115000,
    commercialPrice: 390000,
    color: "hsl(280, 40%, 45%)"
  },
  {
    id: "npk_16",
    name: "NPK Mutiara (16-16-16)",
    n: 16,
    p: 16,
    k: 16,
    subsidizedPrice: 550000, // Non-subsidi premium
    commercialPrice: 550000,
    color: "hsl(220, 60%, 45%)"
  }
];

export const GENERAL_METRICS = {
  bagWeightKg: 50,
  defaultWaterTankLiters: 16 // Kapasitas tangki punggung sprayer elektrik standar
};
