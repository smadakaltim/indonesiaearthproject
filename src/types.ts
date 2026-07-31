export type PollutionLevel = 'AMAN' | 'WASPADA' | 'BERBAHAYA';

export type WindDirection = 'Utara' | 'Timur Laut' | 'Timur' | 'Tenggara' | 'Selatan' | 'Barat Daya' | 'Barat' | 'Barat Laut';

export type RainfallCondition = 'Cerah / Tanpa Hujan' | 'Hujan Ringan (1-5 mm/jam)' | 'Hujan Sedang (6-15 mm/jam)' | 'Hujan Lebat / Badai (>15 mm/jam)';

export interface VehicleData {
  motorcycles: number; // Sepeda Motor
  gasolineCars: number; // Mobil Bensin
  dieselCars: number; // SUV / Mobil Diesel
  buses: number; // Bus Kota / Angkutan Umum
  lightTrucks: number; // Truk Engkel / Box
  heavyTrucks: number; // Truk Kontainer / Heavy Diesel
}

export interface FactoryData {
  industryType: 'PLTU Batubara' | 'Pabrik Semen' | 'Kimia & Petrokimia' | 'Tekstil & Boiler' | 'Manufaktur Umum';
  stackCount: number; // Jumlah Cerobong Asap Aktif
  operatingHoursPerDay: number; // Jam Operasional per hari
  fuelType: 'Batubara' | 'MFO / Minyak Berat' | 'Gas Alam' | 'Biomasa / Kayu';
  fuelConsumptionTonsPerDay: number; // Konsumsi bahan bakar (Ton/Hari)
  scrubberEfficiency: number; // Efisiensi Filter / Electrostatic Precipitator (0 - 95%)
}

export interface EnvironmentalData {
  windSpeedKmh: number; // Kecepatan Angin (km/h)
  windDirection: WindDirection; // Arah Mata Angin
  windDirectionDegrees: number; // Degree (0 - 360)
  temperatureC: number; // Suhu Udara (°C)
  humidityPercent: number; // Kelembaban (%)
  rainfallMmHr: number; // Curah hujan (mm/jam)
  rainfallCondition: RainfallCondition;
  inversionLayer: boolean; // Lapisan Inversi Suhu (Jebakan Polusi)
}

export interface PollutantBreakdown {
  pm25: number; // ug/m3
  pm10: number; // ug/m3
  co: number; // ppm or ug/m3
  no2: number; // ug/m3
  so2: number; // ug/m3
  o3: number; // ug/m3
}

export interface EmissionSourceBreakdown {
  vehicleEmissionsKgDay: number;
  factoryEmissionsKgDay: number;
  vehicleSharePercent: number;
  factorySharePercent: number;
}

export interface HealthRiskAdvisory {
  generalPublicRisk: string;
  vulnerableGroupsRisk: string; // Children, elderly, ISPA sufferers
  respiratoryRiskLevel: 'Rendah' | 'Sedang' | 'Tinggi' | 'Kritis';
  recommendedMask: string;
  outdoorActivityAdvice: string;
  indoorPurifierAdvice: string;
}

export interface PemdaMitigationPolicy {
  category: 'Transportasi' | 'Industri' | 'Lingkungan & Ruang Hijau' | 'Kebijakan Darurat & WFH';
  title: string;
  description: string;
  priority: 'Tinggi' | 'Sedang' | 'Rutin';
  expectedImpact: string;
}

export interface MapSubZone {
  id: string;
  name: string;
  ispuScoreOffset: number;
  districtType: 'Pusat Kota' | 'Kawasan Industri' | 'Pemukiman Warga' | 'Taman & RTH';
  ispuScore: number;
  level: PollutionLevel;
}

export interface RegionPreset {
  id: string;
  name: string;
  province: string;
  description: string;
  populationTotal: number; // Total Penduduk Wilayah
  cctvLocationName: string;
  cctvCameraId: string;
  cctvStreamType: 'traffic' | 'industrial' | 'highway';
  sensorDeviceId: string;
  coordinates: { lat: number; lng: number };
  subZones: MapSubZone[];
  vehicles: VehicleData;
  factory: FactoryData;
  environment: EnvironmentalData;
}

export interface PollutionCalculationResult {
  ispuScore: number; // Indeks Standar Pencemar Udara (0 - 500)
  level: PollutionLevel;
  primaryPollutant: string;
  pollutants: PollutantBreakdown;
  sources: EmissionSourceBreakdown;
  healthRisk: HealthRiskAdvisory;
  pemdaPolicies: PemdaMitigationPolicy[];
  affectedPopulationEstimate: number; // Perkiraan warga terdampak
  rainfallEffectText: string;
  calculatedAt: string;
}

export interface AiAnalysisRequest {
  regionName: string;
  populationTotal: number;
  ispuScore: number;
  level: PollutionLevel;
  primaryPollutant: string;
  pollutants: PollutantBreakdown;
  vehicles: VehicleData;
  factory: FactoryData;
  environment: EnvironmentalData;
  sources: EmissionSourceBreakdown;
}

export interface AiAnalysisResponse {
  summary: string;
  keyDrivers: string[];
  healthRiskDetailed: string;
  pemdaMitigationActionPlan: {
    immediate24h: string[];
    mediumTerm30d: string[];
    longTermPolicy: string[];
  };
  economicImpactEstimate: string;
}

