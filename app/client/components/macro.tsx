"use client";

import { useState, useEffect } from "react";
import { backendInstance, BASE_URL } from "@/utils/axiosInstance";
import { Profile, Button } from "@/utils/types";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, Plus, Trash2, RotateCcw, X, Zap, 
  CheckCircle2, AlertCircle, Terminal, Cpu, Image as ImageIcon 
} from "lucide-react";

// --- Types ---
type DynamicConfig = Record<string, any>;

interface PluginSchema {
  type: string;
  schema: Array<{
    key: string;
    label: string;
    type: "string" | "number" | "enum" | "json";
    required?: boolean;
    values?: string[];
    default?: any;
    placeholder?: string;
  }>;
}

interface TriggerResult {
  success: boolean;
  message: string;
  timestamp: number;
}

// Ensure your Button type includes icon (utils/types.ts)
// export interface Button { ... icon?: string | null; ... }

// Constants
const BACKEND_URL = BASE_URL // Adjust to your actual backend URL

// ------------------------------------------------------------------
// COMPONENT: MACRO BUTTON
// ------------------------------------------------------------------
interface MacroButtonProps {
  data: Button;
  onTrigger: (b: Button) => void;
  onConfigure: (b: Button) => void;
  isRunning: boolean;
  result: TriggerResult | null;
}

const MacroButton = ({ data, onTrigger, onConfigure, isRunning, result }: MacroButtonProps) => {
  const isSuccess = result?.success === true;
  const isError = result?.success === false;

  const variants = {
    idle: { scale: 1, borderColor: "#262626" },
    hover: { scale: 1.02, borderColor: "#525252" },
    tap: { scale: 0.95 },
    running: { borderColor: "#f59e0b", boxShadow: "0 0 15px rgba(245, 158, 11, 0.2)" },
    success: { borderColor: "#10b981", backgroundColor: "#064e3b" },
    error: { borderColor: "#ef4444", backgroundColor: "#450a0a" }
  };

  let currentState = "idle";
  if (isSuccess) currentState = "success";
  else if (isError) currentState = "error";
  else if (isRunning) currentState = "running";

  return (
    <motion.div
      layout
      className="relative w-full h-full min-h-[180px]"
      initial="idle"
      animate={currentState}
      whileHover={!isRunning ? "hover" : undefined}
      whileTap={!isRunning ? "tap" : undefined}
      variants={variants}
      style={{ borderRadius: "1.5rem", borderWidth: "1px" }}
    >
      <div 
        onClick={() => !isRunning && onTrigger(data)}
        className={`
          w-full h-full p-6 flex flex-col justify-between cursor-pointer overflow-hidden
          bg-neutral-900 transition-colors duration-500 rounded-3xl group
          ${isSuccess ? "!bg-emerald-950/30" : ""}
          ${isError ? "!bg-red-950/30" : ""}
        `}
      >
        {/* Header: Type & Status Dot */}
        <div className="flex justify-between items-start w-full">
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 bg-neutral-950 px-2 py-1 rounded border border-neutral-800">
            {data.type}
          </span>
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
            isRunning ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" :
            isSuccess ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" :
            isError ? "bg-red-500 shadow-[0_0_8px_#ef4444]" :
            "bg-neutral-800"
          }`} />
        </div>

        {/* Center: Icon/Label */}
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 z-10">
          <AnimatePresence mode="wait">
            {isRunning ? (
              <motion.div 
                key="running"
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              >
                <Zap className="w-8 h-8 text-amber-500 animate-pulse" />
              </motion.div>
            ) : isSuccess ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </motion.div>
            ) : isError ? (
              <motion.div 
                key="error"
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              >
                <AlertCircle className="w-8 h-8 text-red-500" />
              </motion.div>
            ) : (
              // ✅ CUSTOM ICON RENDERING
              <motion.div 
                key="content"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-2"
              >
                {data.icon ? (
                  <img 
                    src={`${BACKEND_URL}/icons/${data.icon}`} 
                    alt="icon" 
                    className="w-12 h-12 object-contain mb-1 drop-shadow-md"
                    loading="lazy" 
                  />
                ) : (
                   // Placeholder if no icon
                   <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-600 mb-1">
                      <Zap size={20} />
                   </div>
                )}
                <h3 className="text-lg font-bold text-neutral-200 leading-tight break-words select-none px-2">
                  {data.label}
                </h3>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer: Result Message */}
        <div className="h-5 w-full flex items-end justify-center">
          <AnimatePresence mode="wait">
            {result && (
              <motion.span 
                key={result.timestamp}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`text-[10px] font-medium truncate max-w-full ${
                  isError ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {result.message}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Settings Trigger */}
        <button
          onClick={(e) => { e.stopPropagation(); onConfigure(data); }}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-950 text-neutral-500 border border-neutral-800 
                     opacity-0 group-hover:opacity-100 hover:text-white hover:border-neutral-600 transition-all duration-200 z-20"
        >
          <Settings size={14} />
        </button>
      </div>
    </motion.div>
  );
};

// ------------------------------------------------------------------
// COMPONENT: CONFIG MODAL
// ------------------------------------------------------------------
const ConfigModal = ({ isOpen, onClose, button, schema, initialConfig, availableIcons, onSave, onDelete, onReset }: any) => {
  const [localConfig, setLocalConfig] = useState<DynamicConfig>({});
  const [localLabel, setLocalLabel] = useState("");
  const [localIcon, setLocalIcon] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"settings" | "icon">("settings");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && button) {
      setLocalConfig(initialConfig);
      setLocalLabel(button.label);
      setLocalIcon(button.icon || null);
      setActiveTab("settings");
    }
  }, [isOpen, button, initialConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(button.button_id, localConfig, localLabel, localIcon);
    setIsSaving(false);
  };

  if (!isOpen || !button) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 bg-neutral-900 shrink-0">
          <div className="flex justify-between items-center mb-6">
             <div className="flex gap-2 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                <button 
                    onClick={() => setActiveTab("settings")}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${activeTab === 'settings' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    Settings
                </button>
                <button 
                    onClick={() => setActiveTab("icon")}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-colors flex items-center gap-2 ${activeTab === 'icon' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    <ImageIcon size={12}/> Icon
                </button>
             </div>
             <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
               <X size={20}/>
             </button>
          </div>
          
          <div className="flex gap-4 items-center">
            {/* Mini Icon Preview */}
            <div className="w-16 h-16 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
                {localIcon ? (
                    <img src={`${BACKEND_URL}/icons/${localIcon}`} className="w-10 h-10 object-contain" />
                ) : (
                    <Zap className="text-neutral-700" />
                )}
            </div>
            <div className="w-full">
                <input 
                    value={localLabel}
                    onChange={(e) => setLocalLabel(e.target.value)}
                    className="w-full bg-transparent text-3xl font-black text-white border-none focus:ring-0 p-0 placeholder-neutral-700 focus:outline-none"
                    placeholder="Button Label"
                />
                <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 font-mono">
                    <span className="bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">{button.type}</span>
                </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-neutral-900">
          
          {/* TAB: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              {schema.length === 0 && (
                <div className="text-neutral-600 italic text-center py-8 border border-dashed border-neutral-800 rounded-xl">
                  No specific configuration required for this plugin.
                </div>
              )}
              {schema.map((field: any) => {
                const value = localConfig[field.key] ?? (field.default || "");
                return (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-bold text-neutral-300 flex items-center gap-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === "enum" ? (
                        <div className="relative">
                            <select
                                value={value}
                                onChange={(e) => setLocalConfig({ ...localConfig, [field.key]: e.target.value })}
                                className="w-full appearance-none bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-neutral-500 focus:outline-none transition-colors"
                            >
                            {field.values?.map((v: string) => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        value={value}
                        onChange={(e) => setLocalConfig({ ...localConfig, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-neutral-500 focus:outline-none transition-colors"
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: ICONS */}
          {activeTab === "icon" && (
             <div>
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
                    <button 
                        onClick={() => setLocalIcon(null)}
                        className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-2 hover:bg-neutral-800 transition ${localIcon === null ? 'bg-neutral-800 border-white' : 'bg-neutral-950 border-neutral-800 text-neutral-500'}`}
                    >
                        <X size={20} />
                        <span className="text-[10px] font-bold uppercase">None</span>
                    </button>
                    {availableIcons.map((iconName: string) => (
                        <button 
                            key={iconName}
                            onClick={() => setLocalIcon(iconName)}
                            className={`aspect-square rounded-xl border p-2 flex items-center justify-center transition relative group ${localIcon === iconName ? 'bg-neutral-800 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600'}`}
                        >
                            <img 
                                src={`${BACKEND_URL}/icons/${iconName}`} 
                                className="w-full h-full object-contain pointer-events-none" 
                                loading="lazy"
                            />
                        </button>
                    ))}
                </div>
                {availableIcons.length === 0 && (
                     <p className="text-center text-neutral-500 py-10">No icons found in /icons/ folder.</p>
                )}
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-900 shrink-0 flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={onDelete} className="p-3 rounded-xl text-neutral-500 hover:bg-red-950/30 hover:text-red-500 transition-colors">
              <Trash2 size={20} />
            </button>
            <button onClick={onReset} className="p-3 rounded-xl text-neutral-500 hover:bg-neutral-800 hover:text-white transition-colors">
              <RotateCcw size={20} />
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-3 font-bold text-neutral-500 hover:text-white transition">Cancel</button>
            <button onClick={handleSave} disabled={isSaving} className="px-8 py-3 bg-white text-black rounded-xl font-bold hover:bg-neutral-200 disabled:opacity-50 transition-colors flex items-center gap-2">
              {isSaving ? <Zap size={16} className="animate-spin"/> : "Save Changes"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ------------------------------------------------------------------
// MAIN PAGE CONTROLLER
// ------------------------------------------------------------------
export default function DockPilotPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [buttons, setButtons] = useState<Button[]>([]);
  const [pluginSchemas, setPluginSchemas] = useState<PluginSchema[]>([]);
  const [availableIcons, setAvailableIcons] = useState<string[]>([]); // ✅ State for icons
  
  const [newButtonLabel, setNewButtonLabel] = useState("");
  const [newButtonType, setNewButtonType] = useState("");
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [resultMap, setResultMap] = useState<Record<string, TriggerResult>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editingButton, setEditingButton] = useState<Button | null>(null);
  const [editingConfig, setEditingConfig] = useState<DynamicConfig>({});

  // Initial Load
  useEffect(() => {
    const init = async () => {
      try {
        const [profRes, schemaRes, iconRes] = await Promise.all([
          backendInstance.get<Profile[]>("/profiles"),
          backendInstance.get<{ plugins: PluginSchema[] }>("/buttons/schemas"),
          backendInstance.get<{ icons: string[] }>("/buttons/assets/icons") // ✅ Fetch icons
        ]);

        setProfiles(profRes.data);
        setPluginSchemas(schemaRes.data.plugins || []);
        setAvailableIcons(iconRes.data.icons || []);

        if (schemaRes.data.plugins.length > 0) setNewButtonType(schemaRes.data.plugins[0].type);
        const def = profRes.data.find((p) => p.is_default === 1) || profRes.data[0];
        setSelectedProfile(def || null);
      } catch (err) { console.error("Initialization failed", err); }
    };
    init();
  }, []);

  useEffect(() => { if (selectedProfile) reloadButtons(); }, [selectedProfile]);

  const reloadButtons = async () => {
    if (!selectedProfile) return;
    try {
      const res = await backendInstance.get<Button[]>(`/buttons/${selectedProfile.profile_id}`);
      setButtons(res.data);
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    if (!selectedProfile || !newButtonLabel.trim()) return;
    try {
      await backendInstance.post("/buttons/", {
        profile_id: selectedProfile.profile_id,
        label: newButtonLabel.trim(),
        type: newButtonType,
      });
      setNewButtonLabel("");
      reloadButtons();
    } catch (e) { alert("Failed to create button"); }
  };

  const handleTrigger = async (btn: Button) => {
    setLoadingMap(prev => ({ ...prev, [btn.button_id]: true }));
    setResultMap(prev => ({ ...prev, [btn.button_id]: undefined } as any));
    try {
      const res = await backendInstance.post(`/buttons/${btn.button_id}/trigger`);
      setResultMap(prev => ({
        ...prev,
        [btn.button_id]: { success: true, message: res.data.result.status || "Success", timestamp: Date.now() }
      }));
    } catch (err: any) {
      setResultMap(prev => ({
        ...prev,
        [btn.button_id]: { success: false, message: err.response?.data?.detail || "Error", timestamp: Date.now() }
      }));
    } finally {
      setLoadingMap(prev => ({ ...prev, [btn.button_id]: false }));
      setTimeout(() => setResultMap(prev => { const n = { ...prev }; delete n[btn.button_id]; return n; }), 3000);
    }
  };

  const handleOpenConfig = async (btn: Button) => {
    setEditingButton(btn);
    const schema = pluginSchemas.find(p => p.type === btn.type)?.schema || [];
    try {
      const res = await backendInstance.get(`/buttons/${btn.button_id}/config`);
      const dbConfig = res.data.config || {};
      const merged = { ...dbConfig };
      schema.forEach(field => {
        if (merged[field.key] === undefined && field.default !== undefined) merged[field.key] = field.default;
      });
      setEditingConfig(merged);
    } catch { setEditingConfig({}); }
    setModalOpen(true);
  };

  // ✅ Updated Save Logic to include Icon
  const handleSaveConfig = async (id: string, config: DynamicConfig, label: string, icon: string | null) => {
    try {
      await Promise.all([
        backendInstance.put(`/buttons/${id}/config`, { config }),
        backendInstance.patch(`/buttons/${id}`, { label, icon }) // Send Icon
      ]);
      setModalOpen(false);
      reloadButtons();
    } catch (err: any) { alert(err.response?.data?.detail || "Failed to save"); }
  };

  const handleDelete = async () => {
    if (!editingButton || !confirm("Delete this button?")) return;
    try { await backendInstance.delete(`/buttons/${editingButton.button_id}`); setModalOpen(false); reloadButtons(); } catch { alert("Delete failed"); }
  };

  const handleReset = async () => {
    if (!editingButton || !confirm("Reset config?")) return;
    try { await backendInstance.delete(`/buttons/${editingButton.button_id}/config`); setEditingConfig({}); } catch { alert("Reset failed"); }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-200 font-sans p-6 md:p-12 flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3"><Cpu size={32} /> DOCKPILOT</h1>
          <p className="text-neutral-500 mt-1 font-mono text-xs uppercase tracking-[0.2em]">System Controller v1.1</p>
        </div>
        <div className="flex bg-neutral-900 p-1.5 rounded-xl border border-neutral-800">
          {profiles.map((p) => (
            <button key={p.profile_id} onClick={() => setSelectedProfile(p)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${selectedProfile?.profile_id === p.profile_id ? "bg-white text-black shadow-lg" : "text-neutral-500 hover:text-white"}`}>
              {p.name}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-grow">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 auto-rows-fr h-full">
          <AnimatePresence>
            {buttons.map((b) => (
              <MacroButton 
                key={b.button_id}
                data={b}
                isRunning={!!loadingMap[b.button_id]}
                result={resultMap[b.button_id] || null}
                onTrigger={handleTrigger}
                onConfigure={handleOpenConfig}
              />
            ))}
          </AnimatePresence>
          <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-dashed border-neutral-800 rounded-[1.5rem] bg-neutral-950/50 hover:bg-neutral-900/50 transition-colors p-6 flex flex-col justify-center gap-4 min-h-[180px]">
            <div className="space-y-3">
              <input className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-white placeholder-neutral-600 focus:border-neutral-500 focus:outline-none transition-colors" placeholder="New Button Label" value={newButtonLabel} onChange={(e) => setNewButtonLabel(e.target.value)} />
              <div className="relative">
                <select className="w-full appearance-none bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-white focus:border-neutral-500 focus:outline-none transition-colors" value={newButtonType} onChange={(e) => setNewButtonType(e.target.value)}>
                  {pluginSchemas.map(p => <option key={p.type} value={p.type}>{p.type}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-600">▼</div>
              </div>
              <button onClick={handleCreate} disabled={!newButtonLabel.trim()} className="w-full py-3 bg-neutral-100 text-black rounded-xl font-bold hover:bg-white hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex justify-center items-center gap-2">
                <Plus size={18} strokeWidth={3} /> Create
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      <ConfigModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        button={editingButton}
        schema={pluginSchemas.find(p => p.type === editingButton?.type)?.schema || []}
        initialConfig={editingConfig}
        availableIcons={availableIcons}
        onSave={handleSaveConfig}
        onDelete={handleDelete}
        onReset={handleReset}
      />
    </div>
  );
}