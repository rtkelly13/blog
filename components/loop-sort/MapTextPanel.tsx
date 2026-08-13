import {
  AlertCircle,
  Check,
  Download,
  FileText,
  RefreshCw,
  Upload,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { parseMapText, stringifyMap } from '../../lib/loop-sort/parser';
import { PRESET_MAPS, shuffleMapColors } from '../../lib/loop-sort/presets';
import type { LoopSortMap } from '../../lib/loop-sort/types';

interface MapTextPanelProps {
  currentMap: LoopSortMap;
  onMapChange: (map: LoopSortMap) => void;
}

export const MapTextPanel: React.FC<MapTextPanelProps> = ({
  currentMap,
  onMapChange,
}) => {
  const [textValue, setTextValue] = useState<string>(() =>
    stringifyMap(currentMap),
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleApplyText = () => {
    try {
      const parsed = parseMapText(textValue);
      onMapChange(parsed);
      setErrorMsg(null);
      setSuccessMsg('Map loaded successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to parse map text file.');
      setSuccessMsg(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setTextValue(content);
        try {
          const parsed = parseMapText(content);
          onMapChange(parsed);
          setErrorMsg(null);
          setSuccessMsg(`File "${file.name}" imported successfully!`);
          setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: any) {
          setErrorMsg(`Error in "${file.name}": ${err.message}`);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    const blob = new Blob([textValue], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentMap.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_map.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShuffleColors = () => {
    const shuffled = shuffleMapColors(currentMap);
    onMapChange(shuffled);
    const newText = stringifyMap(shuffled);
    setTextValue(newText);
    setSuccessMsg('Colors randomized! Layout structure preserved.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSelectPreset = (preset: LoopSortMap) => {
    onMapChange(preset);
    const newText = stringifyMap(preset);
    setTextValue(newText);
    setErrorMsg(null);
    setSuccessMsg(`Loaded preset: ${preset.name}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="border-2 border-white bg-zinc-900 p-4 space-y-4">
      {/* Title & Presets Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-zinc-700 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-brutalist-cyan" />
          <h3 className="font-display font-bold text-lg text-white uppercase">
            [ MAP_STRUCTURED_FILE ]
          </h3>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-zinc-400">PRESETS:</span>
          {PRESET_MAPS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`px-3 py-1 font-mono text-xs uppercase border-2 transition-all ${
                currentMap.level === preset.level
                  ? 'border-brutalist-cyan bg-zinc-800 text-brutalist-cyan font-bold'
                  : 'border-zinc-700 bg-black text-zinc-300 hover:border-white'
              }`}
            >
              Lvl {preset.level}
            </button>
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* File Upload */}
          <label className="cursor-pointer px-3 py-1.5 bg-black border-2 border-white text-white hover:border-brutalist-cyan font-mono text-xs uppercase flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5">
            <Upload className="w-4 h-4 text-brutalist-cyan" />
            <span>Upload Text File</span>
            <input
              type="file"
              accept=".txt,.json,.yaml,.yml"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* File Download */}
          <button
            type="button"
            onClick={handleDownload}
            className="px-3 py-1.5 bg-black border-2 border-white text-white hover:border-brutalist-yellow font-mono text-xs uppercase flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
          >
            <Download className="w-4 h-4 text-brutalist-yellow" />
            <span>Download .TXT</span>
          </button>

          {/* Shuffle Colors */}
          <button
            type="button"
            onClick={handleShuffleColors}
            className="px-3 py-1.5 bg-black border-2 border-brutalist-pink text-brutalist-pink hover:bg-zinc-800 font-mono text-xs uppercase flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
            title="Keep map layout and positions consistent, but switch block & box colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Switch Colors</span>
          </button>
        </div>

        {/* Apply Editor Text Button */}
        <button
          type="button"
          onClick={handleApplyText}
          className="px-4 py-1.5 bg-brutalist-cyan text-black font-mono font-bold text-xs uppercase border-2 border-white hover:bg-cyan-300 active:translate-x-0.5 active:translate-y-0.5"
        >
          Apply Map Text
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3 bg-red-950/80 border-2 border-red-500 text-red-200 font-mono text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border-2 border-emerald-500 text-emerald-200 font-mono text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Editor Text Area */}
      <div className="relative">
        <textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          rows={12}
          className="w-full bg-black border-2 border-white text-emerald-400 font-mono text-xs p-3 focus:outline-none focus:border-brutalist-cyan shadow-inner leading-relaxed resize-y"
          placeholder="Paste or edit structured map definition here..."
        />
        <div className="absolute bottom-3 right-3 text-[10px] font-mono text-zinc-600 pointer-events-none">
          STRUCTURED TEXT FORMAT (KEY: VAL)
        </div>
      </div>
    </div>
  );
};
