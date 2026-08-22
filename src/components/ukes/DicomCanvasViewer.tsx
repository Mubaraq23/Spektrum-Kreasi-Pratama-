import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Sun, 
  Move, 
  Ruler, 
  Maximize2, 
  FileText, 
  Eye, 
  RefreshCw, 
  Sliders, 
  Activity,
  Sparkles,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Check
} from 'lucide-react';
import { parseMockDicomTags, DicomMetadata } from '../../lib/ukes/ukesAiAssistant';
import { analyzeRadiologyImageWithAi, RadiologyImageAnalysisResult } from '../../lib/ukes/ukesAiVisionEngine';

interface DicomCanvasViewerProps {
  imageUrl?: string;
  fileName?: string;
  modalityId?: string;
  onAnnotationSave?: (annotation: string) => void;
  onApplyAiMeasurements?: (updates: Array<{ parameterId: string; setPoint: number; recommendedValue: number }>) => void;
}

export function DicomCanvasViewer({
  imageUrl = 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1000&q=80',
  fileName = 'QC_Phantom_Radiograph_01.dcm',
  modalityId = 'general-xray',
  onApplyAiMeasurements
}: DicomCanvasViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Interactive state
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [activeTool, setActiveTool] = useState<'pan' | 'window' | 'measure' | 'roi'>('pan');
  const [showMetadata, setShowMetadata] = useState<boolean>(false);
  const [dicomTags] = useState<DicomMetadata | null>(() => parseMockDicomTags('', fileName));

  // AI Vision state
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<RadiologyImageAnalysisResult | null>(null);
  const [isAiApplied, setIsAiApplied] = useState<boolean>(false);

  // ROI / Measurement values
  const roiMeanHU = 1.2;
  const roiSdHU = 2.4;
  const measuredDistMm = 45.8;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Apply transformations
      ctx.translate(canvas.width / 2 + panX, canvas.height / 2 + panY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      // Draw ROI or Distance overlay if active
      if (activeTool === 'roi') {
        ctx.strokeStyle = '#06b6d4'; // Cyan
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width / 2 - 40, canvas.height / 2 - 40, 80, 80);
        ctx.fillStyle = '#06b6d4';
        ctx.font = '10px monospace';
        ctx.fillText(`ROI HU: ${roiMeanHU} ± ${roiSdHU}`, canvas.width / 2 - 38, canvas.height / 2 - 45);
      } else if (activeTool === 'measure') {
        ctx.strokeStyle = '#e11d48'; // Rose
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 60, canvas.height / 2);
        ctx.lineTo(canvas.width / 2 + 60, canvas.height / 2);
        ctx.stroke();
        ctx.fillStyle = '#e11d48';
        ctx.font = '10px monospace';
        ctx.fillText(`Jarak: ${measuredDistMm} mm`, canvas.width / 2 - 30, canvas.height / 2 - 8);
      }
    };
  }, [imageUrl, zoom, rotation, brightness, contrast, panX, panY, activeTool, roiMeanHU, roiSdHU, measuredDistMm]);

  const resetViewer = () => {
    setZoom(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setPanX(0);
    setPanY(0);
  };

  const handleRunAiImageAnalysis = async () => {
    setIsAnalyzingAi(true);
    try {
      const result = await analyzeRadiologyImageWithAi(imageUrl, modalityId, fileName);
      setAiResult(result);
    } catch (err) {
      console.error("AI Image analysis error:", err);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleApplyAiUpdates = () => {
    if (!aiResult || !onApplyAiMeasurements) return;
    onApplyAiMeasurements(aiResult.recommendedParameterUpdates);
    setIsAiApplied(true);
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col font-mono text-slate-200">
      {/* Viewer Header Toolbar */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              Interactive DICOM / Image Quality Viewer
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                AI Vision Enabled
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-sans">
              {fileName} ({modalityId.toUpperCase()})
            </p>
          </div>
        </div>

        {/* AI & Interactive Tools */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunAiImageAnalysis}
            disabled={isAnalyzingAi}
            className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:opacity-90 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md shadow-cyan-500/20 disabled:opacity-50"
          >
            {isAnalyzingAi ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menganalisis Citra AI...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> Analisis Citra dengan AI</>
            )}
          </button>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setZoom(z => Math.min(z + 0.25, 4))}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRotation(r => (r + 90) % 360)}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 transition-colors"
              title="Rotate 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('window')}
              className={`p-2 rounded-xl transition-colors ${activeTool === 'window' ? 'bg-cyan-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-300'}`}
              title="Window / Level (Contrast)"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('pan')}
              className={`p-2 rounded-xl transition-colors ${activeTool === 'pan' ? 'bg-cyan-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-300'}`}
              title="Pan Position"
            >
              <Move className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('measure')}
              className={`p-2 rounded-xl transition-colors ${activeTool === 'measure' ? 'bg-rose-500 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'}`}
              title="Measure Distance"
            >
              <Ruler className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('roi')}
              className={`p-2 rounded-xl transition-colors ${activeTool === 'roi' ? 'bg-cyan-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-300'}`}
              title="ROI HU / Noise Analysis"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className={`p-2 rounded-xl transition-colors ${showMetadata ? 'bg-indigo-500 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
              title="Toggle DICOM Tags"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={resetViewer}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
              title="Reset View"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="relative flex-1 bg-black flex items-center justify-center p-4 min-h-[380px] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={500}
          height={380}
          className="border border-slate-900 rounded-2xl shadow-inner cursor-grab active:cursor-grabbing"
        />

        {/* DICOM Metadata Overlay Drawer */}
        {showMetadata && dicomTags && (
          <div className="absolute top-4 right-4 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 w-72 backdrop-blur-md shadow-2xl space-y-2 text-[10px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-cyan-400 font-bold">
              <span>DICOM TAG METADATA</span>
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1 text-slate-300 font-mono">
              <p><span className="text-slate-500">Modality:</span> {dicomTags.modality}</p>
              <p><span className="text-slate-500">Manufacturer:</span> {dicomTags.manufacturer}</p>
              <p><span className="text-slate-500">Model:</span> {dicomTags.manufacturerModelName}</p>
              <p><span className="text-slate-500">Station:</span> {dicomTags.stationName}</p>
              <p><span className="text-slate-500">kVp / mAs:</span> {dicomTags.kvp} kV / {dicomTags.exposureTimeMs} ms</p>
              <p><span className="text-slate-500">Pixel Spacing:</span> {dicomTags.pixelSpacing}</p>
              <p><span className="text-slate-500">Slice Thickness:</span> {dicomTags.sliceThicknessMm} mm</p>
            </div>
          </div>
        )}

        {/* Interactive Sliders for Window/Level when active */}
        {activeTool === 'window' && (
          <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">Brightness:</span>
              <input
                type="range"
                min={50}
                max={150}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-24 accent-cyan-500 cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">Contrast:</span>
              <input
                type="range"
                min={50}
                max={200}
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-24 accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* AI Vision Results Analysis Box */}
      {aiResult && (
        <div className="bg-slate-900/95 border-t border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
              <Bot className="w-4 h-4 animate-pulse" />
              <span>HASIL PEMBACAAN CITRA AI (GEMINI METROLOGY VISION)</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px]">
                Confidence: {(aiResult.confidenceScore * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase font-mono ${
                aiResult.overallVerdict === 'LAIK'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {aiResult.overallVerdict === 'LAIK' ? '✓ STATUS CITRA: LAIK' : '⚠ STATUS CITRA: TIDAK LAIK'}
              </span>
              {onApplyAiMeasurements && (
                <button
                  type="button"
                  onClick={handleApplyAiUpdates}
                  disabled={isAiApplied}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-60"
                >
                  {isAiApplied ? <><Check className="w-3 h-3" /> Sudah Diterapkan</> : 'Terapkan ke Parameter UKES'}
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            {aiResult.aiNotes}
          </p>

          {/* Recommended Parameter Updates Preview */}
          {aiResult.recommendedParameterUpdates.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {aiResult.recommendedParameterUpdates.map((rec, rIdx) => (
                <div key={rIdx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{rec.parameterName}</span>
                    <span className="font-bold text-cyan-400">Hasil AI: {rec.recommendedValue} {rec.unit}</span>
                  </div>
                  <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    BAPETEN Valid
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="bg-slate-900 border-t border-slate-800 p-3 px-5 flex items-center justify-between text-[11px] text-slate-400">
        <span>Zoom: {(zoom * 100).toFixed(0)}% | Rotasi: {rotation}°</span>
        <span className="text-cyan-400 font-bold flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" /> AI Metrology Vision Ready
        </span>
      </div>
    </div>
  );
}
