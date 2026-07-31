import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LevelBadge } from './components/LevelBadge';
import { RegionMap } from './components/RegionMap';
import { PollutionRadiusMap } from './components/PollutionRadiusMap';
import { CctvModal } from './components/CctvModal';
import { EmissionsForm } from './components/EmissionsForm';
import { PollutionCharts } from './components/PollutionCharts';
import { PemdaMitigationCard } from './components/PemdaMitigationCard';
import { HealthRiskSection } from './components/HealthRiskSection';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { REGION_PRESETS } from './data/regions';
import {
  RegionPreset,
  VehicleData,
  FactoryData,
  EnvironmentalData,
  PollutionCalculationResult,
  AiAnalysisResponse,
} from './types';
import { calculatePollution } from './utils/pollutionCalculator';
import { Sparkles, Activity, ShieldCheck, FileText, Info } from 'lucide-react';

export default function App() {
  // 1. Initial State Selection
  const [selectedRegion, setSelectedRegion] = useState<RegionPreset | null>(REGION_PRESETS[0]);
  const [vehicles, setVehicles] = useState<VehicleData>(REGION_PRESETS[0].vehicles);
  const [factory, setFactory] = useState<FactoryData>(REGION_PRESETS[0].factory);
  const [environment, setEnvironment] = useState<EnvironmentalData>(REGION_PRESETS[0].environment);

  const [activeTab, setActiveTab] = useState<'monitor' | 'calculator'>('monitor');
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  // Theme State (Dark Mode default, Light Mode toggleable)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('airpulse_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('airpulse_theme', next);
      return next;
    });
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // CCTV Modal State
  const [cctvModalOpen, setCctvModalOpen] = useState<boolean>(false);

  // 2. Calculation State
  const [calculationResult, setCalculationResult] = useState<PollutionCalculationResult>(() =>
    calculatePollution(
      REGION_PRESETS[0].vehicles,
      REGION_PRESETS[0].factory,
      REGION_PRESETS[0].environment,
      REGION_PRESETS[0].populationTotal
    )
  );

  // 3. AI Modal & State
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [aiData, setAiData] = useState<AiAnalysisResponse | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Recalculate pollution whenever parameters change
  const runCalculation = useCallback(() => {
    const popTotal = selectedRegion ? selectedRegion.populationTotal : 1500000;
    const res = calculatePollution(vehicles, factory, environment, popTotal);
    setCalculationResult(res);
    setLastUpdatedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [vehicles, factory, environment, selectedRegion]);

  useEffect(() => {
    runCalculation();
  }, [runCalculation]);


  // Handle Region Change
  const handleSelectRegion = (region: RegionPreset) => {
    setSelectedRegion(region);
    setVehicles(region.vehicles);
    setFactory(region.factory);
    setEnvironment(region.environment);
  };

  // Reset parameters to current preset defaults
  const handleResetToDefaults = () => {
    if (selectedRegion) {
      setVehicles(selectedRegion.vehicles);
      setFactory(selectedRegion.factory);
      setEnvironment(selectedRegion.environment);
    } else {
      setVehicles(REGION_PRESETS[0].vehicles);
      setFactory(REGION_PRESETS[0].factory);
      setEnvironment(REGION_PRESETS[0].environment);
    }
  };

  // Real-Time Sensor Fluctuation Simulation Loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setVehicles((prev) => {
        const delta = Math.floor((Math.random() - 0.48) * 120);
        const heavyDelta = Math.floor((Math.random() - 0.48) * 15);
        return {
          ...prev,
          motorcycles: Math.max(1000, prev.motorcycles + delta * 2),
          gasolineCars: Math.max(500, prev.gasolineCars + delta),
          heavyTrucks: Math.max(100, prev.heavyTrucks + heavyDelta),
        };
      });

      setEnvironment((prev) => {
        const windDelta = Number(((Math.random() - 0.5) * 0.4).toFixed(1));
        return {
          ...prev,
          windSpeedKmh: Math.max(1, Math.min(30, Number((prev.windSpeedKmh + windDelta).toFixed(1)))),
        };
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Call Gemini AI Endpoint
  const handleTriggerAiAnalysis = async () => {
    setIsAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch('/api/pollution/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionName: selectedRegion ? selectedRegion.name : 'Wilayah Pengamatan Custom',
          ispuScore: calculationResult.ispuScore,
          level: calculationResult.level,
          primaryPollutant: calculationResult.primaryPollutant,
          pollutants: calculationResult.pollutants,
          vehicles,
          factory,
          environment,
          sources: calculationResult.sources,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal menghubungi server AI Gemini.');
      }

      const data: AiAnalysisResponse = await response.json();
      setAiData(data);
      setAiModalOpen(true);
    } catch (err: any) {
      console.error('Error triggering AI analysis:', err);
      setAiError(err.message || 'Terjadi kesalahan sistem saat memproses rekomendasi AI.');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className={`min-h-screen font-sans antialiased flex flex-col transition-colors duration-200 ${
      theme === 'dark'
        ? 'bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950'
        : 'bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white'
    }`}>
      
      {/* App Header */}
      <Header
        selectedRegion={selectedRegion}
        onSelectRegion={handleSelectRegion}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSimulating={isSimulating}
        onToggleSimulating={() => setIsSimulating(!isSimulating)}
        lastUpdatedTime={lastUpdatedTime}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenCctv={() => setCctvModalOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Error notification banner if AI API fails */}
        {aiError && (
          <div className="p-4 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center justify-between">
            <span>{aiError}</span>
            <button onClick={() => setAiError(null)} className="text-slate-400 hover:text-white underline">
              Tutup
            </button>
          </div>
        )}

        {/* 1. Primary Status Badge (3-Level Categorization: AMAN, WASPADA, BERBAHAYA) */}
        <LevelBadge
          result={calculationResult}
          regionName={selectedRegion ? selectedRegion.name : 'Kawasan Custom (Manual Parameter)'}
        />

        {/* 2. Interactive Map & IoT Sensor Node Deployment Visualizer */}
        <RegionMap
          region={selectedRegion}
          calculationResult={calculationResult}
          onOpenCctv={() => setCctvModalOpen(true)}
        />

        {/* 3. GIS Interactive Map for Coverage Radius & User Geolocation */}
        <PollutionRadiusMap
          region={selectedRegion}
          calculationResult={calculationResult}
          onOpenCctv={() => setCctvModalOpen(true)}
          theme={theme}
        />

        {/* Tab 1: Live Monitor & Dashboard */}
        {activeTab === 'monitor' ? (
          <div className="space-y-6">
            
            {/* Visual Charts */}
            <PollutionCharts result={calculationResult} />

            {/* Health Risk & Medical Advisories */}
            <HealthRiskSection healthRisk={calculationResult.healthRisk} level={calculationResult.level} />

            {/* Local Government (Pemda) Mitigation Policies */}
            <PemdaMitigationCard
              policies={calculationResult.pemdaPolicies}
              level={calculationResult.level}
              onTriggerAiAnalysis={handleTriggerAiAnalysis}
              isAiLoading={isAiLoading}
            />

          </div>
        ) : (
          /* Tab 2: Custom Emissions Calculator & Parameter Controls */
          <div className="space-y-6">
            
            <EmissionsForm
              vehicles={vehicles}
              factory={factory}
              environment={environment}
              onChangeVehicles={setVehicles}
              onChangeFactory={setFactory}
              onChangeEnvironment={setEnvironment}
              onResetToDefaults={handleResetToDefaults}
            />

            {/* Live Output Section within Calculator Tab */}
            <div className="pt-2">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Hasil Estimasi Polusi Berdasarkan Parameter di Atas
              </h3>
              <PollutionCharts result={calculationResult} />
            </div>

            <HealthRiskSection healthRisk={calculationResult.healthRisk} level={calculationResult.level} />

            <PemdaMitigationCard
              policies={calculationResult.pemdaPolicies}
              level={calculationResult.level}
              onTriggerAiAnalysis={handleTriggerAiAnalysis}
              isAiLoading={isAiLoading}
            />

          </div>
        )}

      </main>

      {/* CCTV Camera Feed Modal */}
      <CctvModal
        isOpen={cctvModalOpen}
        onClose={() => setCctvModalOpen(false)}
        region={selectedRegion}
        ispuScore={calculationResult.ispuScore}
      />

      {/* AI Analysis Modal */}
      <AiAnalysisModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        data={aiData}
        calculation={calculationResult}
        regionName={selectedRegion ? selectedRegion.name : 'Wilayah Pengamatan Custom'}
      />


      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-12 py-6 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sistem Pemantauan AirPulse AI Pemda • Berbasis Standar KLHK RI & AI Gemini</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Level 1: AMAN (0-50)</span>
            <span>Level 2: WASPADA (51-150)</span>
            <span>Level 3: BERBAHAYA (151+)</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
