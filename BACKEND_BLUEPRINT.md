# BACKEND BLUEPRINT - AgriCalc

While AgriCalc runs fully clientside as a responsive SPA using LocalStorage, this document outlines the roadmap and API contracts for eventual backend synchronization, user profiles, and crowd-sourced crop prices.

## 1. Offline-First Sync Architecture
- **Local Cache**: Calculations are immediately committed to browser LocalStorage.
- **Sync Queue**: An offline queue retains items until network connectivity is verified.
- **Conflict Resolution**: Last-write-wins based on UTC timestamp.

---

## 2. API Specifications (REST/JSON)

### A. Authentication
- **Service**: OAuth2 or JWT bearer tokens.
- **Endpoint**: `/api/auth/login` (Standard login) or `/api/auth/register`.

### B. Calculations Synchronization
Synchronize cached local calculations with the cloud.
- **Endpoint**: `POST /api/calculations/sync`
- **Payload**:
  ```json
  {
    "device_uuid": "d3b07384-d113-4422-9f3b-ee56cdffc222",
    "calculations": [
      {
        "id": "calc_1777524021234",
        "timestamp": "2026-06-16T00:28:00Z",
        "type": "population",
        "cropId": "jagung",
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

### C. Live Reference Feeds (Market Prices)
Allows the frontend to fetch real-time crop commodity prices and fertilizer costs.
- **Endpoint**: `GET /api/market/prices?region=Jawa_Timur`
- **Response**:
  ```json
  {
    "updatedAt": "2026-06-16T00:00:00Z",
    "crops": {
      "padi": { "price_per_kg": 6500, "currency": "IDR" },
      "jagung": { "price_per_kg": 4800, "currency": "IDR" }
    },
    "fertilizers": {
      "urea_non_subsidy": { "price_per_50kg": 345000, "currency": "IDR" },
      "kcl": { "price_per_50kg": 460000, "currency": "IDR" }
    }
  }
  ```