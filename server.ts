import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { calculatePollution } from './src/utils/pollutionCalculator';
import { AiAnalysisRequest } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Shared Gemini client setup
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Air Pollution AI Calculator API' });
  });

  // Calculate Pollution Endpoint
  app.post('/api/pollution/calculate', (req, res) => {
    try {
      const { vehicles, factory, environment } = req.body;
      if (!vehicles || !factory || !environment) {
        return res.status(400).json({ error: 'Data kendaraan, pabrik, atau lingkungan tidak lengkap.' });
      }

      const result = calculatePollution(vehicles, factory, environment);
      return res.json(result);
    } catch (error: any) {
      console.error('Error calculating pollution:', error);
      return res.status(500).json({ error: 'Gagal menghitung kalkulasi polusi.' });
    }
  });

  // AI Deep Mitigation & Health Report Generator Endpoint
  app.post('/api/pollution/ai-analysis', async (req, res) => {
    try {
      const payload = req.body as AiAnalysisRequest;
      const { regionName, ispuScore, level, primaryPollutant, pollutants, vehicles, factory, environment, sources } = payload;

      const prompt = `
Anda adalah Pakar Analisis Kualitas Udara Kebijakan Publik & Kesehatan Lingkungan Berbasis AI untuk Pemerintah Daerah di Indonesia.
Analisis data polusi udara real-time berikut dan berikan rekomendasi mitigasi strategis serta analisis risiko kesehatan komprehensif:

[DATA WILAYAH & POLUSI]
- Wilayah/Kota: ${regionName || 'Wilayah Pengamatan'}
- Indeks Standar Pencemar Udara (ISPU): ${ispuScore}
- Tingkat Kategori: ${level} (AMAN / WASPADA / BERBAHAYA)
- Polutan Utama: ${primaryPollutant}
- Konsentrasi Polutan:
  * PM2.5: ${pollutants.pm25} µg/m³
  * PM10: ${pollutants.pm10} µg/m³
  * CO: ${pollutants.co} ppm
  * NO2: ${pollutants.no2} µg/m³
  * SO2: ${pollutants.so2} µg/m³
  * O3 (Ozon): ${pollutants.o3} µg/m³

[SUMBER EMISI]
- Kontribusi Kendaraan Bermotor: ${sources.vehicleSharePercent}% (Total emisi kendaraan: ${sources.vehicleEmissionsKgDay} kg/hari)
  * Sepeda Motor: ${vehicles.motorcycles} unit
  * Mobil Bensin: ${vehicles.gasolineCars} unit
  * SUV/Diesel: ${vehicles.dieselCars} unit
  * Bus: ${vehicles.buses} unit
  * Truk Kontainer Berat: ${vehicles.heavyTrucks} unit
- Kontribusi Industri/Pabrik: ${sources.factorySharePercent}% (Total emisi pabrik: ${sources.factoryEmissionsKgDay} kg/hari)
  * Jenis Industri: ${factory.industryType}
  * Jumlah Cerobong Aktif: ${factory.stackCount} cerobong
  * Bahan Bakar: ${factory.fuelType} (${factory.fuelConsumptionTonsPerDay} ton/hari)
  * Jam Operasional: ${factory.operatingHoursPerDay} jam/hari
  * Efisiensi Filter/Scrubber: ${factory.scrubberEfficiency}%

[FAKTOR METEOROLOGI]
- Kecepatan Angin: ${environment.windSpeedKmh} km/jam
- Suhu Udara: ${environment.temperatureC} °C
- Kelembaban Udara: ${environment.humidityPercent}%
- Fenomena Inversi Suhu Terdeteksi: ${environment.inversionLayer ? 'YA (Udara terperangkap)' : 'TIDAK'}

Berikan respons JSON terstruktur untuk Pejabat Pemerintah Daerah (Gubernur/Bupati/Wali Kota & Dinas Lingkungan Hidup) dengan format persis berikut:
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction: 'Anda adalah pakar lingkungan AI Pemda Indonesia. Berikan analisis tegas, profesional, berbasis data, dan mudah diimplementasikan oleh instansi pemerintah daerah.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'Ringkasan eksekutif kondisi udara saat ini untuk Kepala Daerah dalam 2-3 kalimat.',
              },
              keyDrivers: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3-4 faktor utama penyebab tingginya indeks polusi saat ini.',
              },
              healthRiskDetailed: {
                type: Type.STRING,
                description: 'Penjelasan rinci risiko kesehatan bagi masyarakat umum dan kelompok sensitif (balita, lansia, penderita ISPA/asthma).',
              },
              pemdaMitigationActionPlan: {
                type: Type.OBJECT,
                properties: {
                  immediate24h: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '3 langkah tindakan darurat Pemda dalam 24 jam ke depan.',
                  },
                  mediumTerm30d: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '3 kebijakan taktis Pemda dalam 30 hari ke depan.',
                  },
                  longTermPolicy: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '3 strategi jangka panjang pencegahan polusi daerah.',
                  },
                },
                required: ['immediate24h', 'mediumTerm30d', 'longTermPolicy'],
              },
              economicImpactEstimate: {
                type: Type.STRING,
                description: 'Estimasi dampak ekonomi dan beban pelayanan kesehatan RS jika tidak segera dimitigasi.',
              },
            },
            required: ['summary', 'keyDrivers', 'healthRiskDetailed', 'pemdaMitigationActionPlan', 'economicImpactEstimate'],
          },
        },
      });

      const jsonText = response.text ? response.text.trim() : '{}';
      const parsedData = JSON.parse(jsonText);
      return res.json(parsedData);
    } catch (error: any) {
      console.error('Error generating AI analysis:', error);
      return res.status(500).json({
        error: 'Gagal meregenerasi analisis AI Pemda. Pastikan GEMINI_API_KEY terkonfigurasi dengan benar.',
        details: error.message,
      });
    }
  });

  // Vite middleware or production static build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Air Pollution AI running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
