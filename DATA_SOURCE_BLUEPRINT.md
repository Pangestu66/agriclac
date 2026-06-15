# DATA SOURCE BLUEPRINT - AgriCalc

This document outlines the static data structures, guidelines, and LocalStorage data models used by the AgriCalc system.

## 1. Crop Data Schema (db.js)
Static data structure containing reference crop details for Indonesia.

```json
[
  {
    "id": "padi",
    "name": "Padi (Rice)",
    "category": "Pangan",
    "defaultSpacingRow": 0.25,
    "defaultSpacingCol": 0.25,
    "recommendationN": 120,
    "recommendationP": 60,
    "recommendationK": 50,
    "growthDurationDays": 115,
    "expectedYieldPerHa": 6000
  },
  {
    "id": "jagung",
    "name": "Jagung (Maize)",
    "category": "Pangan",
    "defaultSpacingRow": 0.75,
    "defaultSpacingCol": 0.20,
    "recommendationN": 150,
    "recommendationP": 75,
    "recommendationK": 50,
    "growthDurationDays": 105,
    "expectedYieldPerHa": 8000
  },
  {
    "id": "kelapa_sawit",
    "name": "Kelapa Sawit (Oil Palm)",
    "category": "Perkebunan",
    "defaultSpacingRow": 9.0,
    "defaultSpacingCol": 9.0,
    "recommendationN": 160,
    "recommendationP": 100,
    "recommendationK": 200,
    "growthDurationDays": 365,
    "expectedYieldPerHa": 22000
  },
  {
    "id": "tomat",
    "name": "Tomat (Tomato)",
    "category": "Hortikultura",
    "defaultSpacingRow": 0.60,
    "defaultSpacingCol": 0.50,
    "recommendationN": 100,
    "recommendationP": 80,
    "recommendationK": 120,
    "growthDurationDays": 85,
    "expectedYieldPerHa": 15000
  }
]
```

---

## 2. Fertilizer Profiles Schema (db.js)
Defines standard macro-nutrient concentrations and default price structures.

| ID | Name | N (%) | P2O5 (%) | K2O (%) | Default Price / Bag (50kg) |
|---|---|---|---|---|---|
| `urea` | Urea | 46% | 0% | 0% | IDR 150,000 (Subsidized) / IDR 350,000 |
| `sp36` | SP-36 | 0% | 36% | 0% | IDR 170,000 / IDR 380,000 |
| `kcl` | KCl (MOP) | 0% | 0% | 60% | IDR 450,000 |
| `npk_15` | NPK Phonska | 15% | 15% | 15% | IDR 180,000 / IDR 400,000 |
| `npk_16` | NPK Mutiara | 16% | 16% | 16% | IDR 550,000 |

---

## 3. LocalStorage Data Schema

### A. Preferences State
Stores user preferences locally.
```json
{
  "agricalc_preferences": {
    "theme": "dark", // "dark" | "light"
    "language": "id", // "id" | "en"
    "unitSystem": "metric", // "metric" | "imperial"
    "fertilizerPricing": "subsidized" // "subsidized" | "commercial"
  }
}
```

### B. Calculation History Logs
Array of saved calculations to show on the dashboard.
```json
{
  "agricalc_history": [
    {
      "id": "calc_1777524021234",
      "timestamp": "2026-06-16T00:28:00+07:00",
      "type": "population", // "population" | "fertilizer" | "pesticide" | "economics"
      "cropId": "jagung",
      "title": "Kalkulasi Populasi Jagung - Lahan A",
      "inputs": {
        "landArea": 10000,
        "spacingRow": 0.75,
        "spacingCol": 0.20,
        "pattern": "rectangular"
      },
      "outputs": {
        "totalPopulation": 66666,
        "seedWeightKg": 16.67
      }
    }
  ]
}
```