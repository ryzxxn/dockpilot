"use client";

import { useState, useEffect } from "react";
import { backendInstance, BASE_URL } from "@/utils/axiosInstance";
import { Profile, Button } from "@/utils/types";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, Plus, Trash2, RotateCcw, X, Zap, 
  CheckCircle2, AlertCircle, Image as ImageIcon, ChevronRight, ChevronLeft 
} from "lucide-react";
import clsx from "clsx";

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

const BACKEND_URL = BASE_URL;
const GRID_ROWS = 3;
const GRID_COLS = 5;
const ITEMS_PER_PAGE = GRID_ROWS * GRID_COLS;

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
    idle: { scale: 1, backgroundColor: "#171717" }, // neutral-900
    hover: { scale: 1.02, backgroundColor: "#262626" }, // neutral-800
    tap: { scale: 0.95 },
    running: { borderColor: "#f59e0b", boxShadow: "0 0 20px rgba(245, 158, 11, 0.15)" },
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
      className="relative w-full h-full aspect-square"
      initial="idle"
      animate={currentState}
      whileHover={!isRunning ? "hover" : undefined}
      whileTap={!isRunning ? "tap" : undefined}
      variants={variants}
      style={{ borderRadius: "1.25rem", borderWidth: "1px", borderColor: "#262626" }}
    >
      <div 
        onClick={() => !isRunning && onTrigger(data)}
        className={clsx(
          "w-full h-full p-4 flex flex-col items-center justify-center cursor-pointer overflow-hidden rounded-[1.2rem] transition-colors relative group",
          isSuccess && "!bg-emerald-950/30",
          isError && "!bg-red-950/30"
        )}
      >
        {/* Main Content */}
        <div className="flex flex-col items-center justify-center text-center gap-2 z-10 w-full">
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
              <motion.div 
                key="content"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-3 w-full"
              >
                {data.icon ? (
                  <img 
                    src={`${BACKEND_URL}/icons/${data.icon}`} 
                    alt="icon" 
                    className="w-14 h-14 object-contain drop-shadow-lg"
                    loading="lazy" 
                  />
                ) : (
                   <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-600">
                      <Zap size={20} />
                   </div>
                )}
                <h3 className="text-sm font-bold text-neutral-200 leading-tight break-words select-none w-full truncate px-1">
                  {data.label}
                </h3>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status Text (Absolute Bottom) */}
        <div className="absolute bottom-3 w-full flex justify-center px-2">
            <AnimatePresence mode="wait">
                {result && (
                <motion.span 
                    key={result.timestamp}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={clsx("text-[9px] font-bold uppercase tracking-wider truncate max-w-full", isError ? "text-red-400" : "text-emerald-400")}
                >
                    {result.message}
                </motion.span>
                )}
            </AnimatePresence>
        </div>

        {/* Config Cog (Top Right) */}
        <button
          onClick={(e) => { e.stopPropagation(); onConfigure(data); }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-neutral-500 backdrop-blur-sm 
                     opacity-0 group-hover:opacity-100 hover:text-white hover:bg-black transition-all duration-200 z-20"
        >
          <Settings size={14} />
        </button>
      </div>
    </motion.div>
  );
};

// ------------------------------------------------------------------
// COMPONENT: CONFIG MODAL (Unchanged Logic, darker style)
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md" 
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 bg-neutral-900 shrink-0">
          <div className="flex justify-between items-center mb-4">
             <div className="flex gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                {['settings', 'icon'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={clsx(
                            "px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors",
                            activeTab === tab ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                        )}
                    >
                        {tab === 'icon' ? <div className="flex items-center gap-2"><ImageIcon size={10}/> Icon</div> : "Settings"}
                    </button>
                ))}
             </div>
             <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors"><X size={20}/></button>
          </div>
          
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
                {localIcon ? <img src={`${BACKEND_URL}/icons/${localIcon}`} className="w-8 h-8 object-contain" /> : <Zap className="text-neutral-700" size={20} />}
            </div>
            <input 
                value={localLabel}
                onChange={(e) => setLocalLabel(e.target.value)}
                className="w-full bg-transparent text-2xl font-bold text-white border-none focus:ring-0 p-0 placeholder-neutral-700 focus:outline-none"
                placeholder="Button Label"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-neutral-900">
          {activeTab === "settings" && (
            <div className="space-y-5">
              {schema.length === 0 && <p className="text-neutral-600 italic text-center text-sm">No configuration needed.</p>}
              {schema.map((field: any) => {
                const value = localConfig[field.key] ?? (field.default || "");
                return (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide">{field.label}</label>
                    {field.type === "enum" ? (
                        <div className="relative">
                            <select
                                value={value}
                                onChange={(e) => setLocalConfig({ ...localConfig, [field.key]: e.target.value })}
                                className="w-full appearance-none bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:border-neutral-600 focus:outline-none"
                            >
                            {field.values?.map((v: string) => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        value={value}
                        onChange={(e) => setLocalConfig({ ...localConfig, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:border-neutral-600 focus:outline-none"
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "icon" && (
             <div className="grid grid-cols-5 gap-3">
                <button 
                    onClick={() => setLocalIcon(null)}
                    className={clsx("aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 hover:bg-neutral-800 transition", localIcon === null ? 'bg-neutral-800 border-white' : 'bg-neutral-950 border-neutral-800 text-neutral-500')}
                >
                    <X size={16} /> <span className="text-[9px] font-bold uppercase">None</span>
                </button>
                {availableIcons.map((iconName: string) => (
                    <button 
                        key={iconName}
                        onClick={() => setLocalIcon(iconName)}
                        className={clsx("aspect-square rounded-xl border p-2 flex items-center justify-center transition relative", localIcon === iconName ? 'bg-neutral-800 border-emerald-500' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600')}
                    >
                        <img src={`${BACKEND_URL}/icons/${iconName}`} className="w-full h-full object-contain pointer-events-none" loading="lazy"/>
                    </button>
                ))}
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-800 bg-neutral-900 shrink-0 flex items-center justify-between">
          <button onClick={onDelete} className="p-3 rounded-xl text-neutral-600 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-neutral-500 hover:text-white transition">Cancel</button>
            <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-white text-black rounded-xl text-sm font-bold hover:bg-neutral-200 transition-colors">
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ------------------------------------------------------------------
// ADD BUTTON MODAL
// ------------------------------------------------------------------
const AddButtonModal = ({ isOpen, onClose, schemas, onCreate }: any) => {
    const [label, setLabel] = useState("");
    const [type, setType] = useState("");

    useEffect(() => {
        if(isOpen && schemas.length > 0) setType(schemas[0].type);
        setLabel("");
    }, [isOpen, schemas]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-neutral-900 border border-neutral-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl space-y-4">
                <h2 className="text-xl font-bold text-white">Add New Button</h2>
                <input 
                    autoFocus
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white focus:border-neutral-600 focus:outline-none" 
                    placeholder="Button Name"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                />
                <select 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white focus:border-neutral-600 focus:outline-none"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                >
                    {schemas.map((p: any) => <option key={p.type} value={p.type}>{p.type}</option>)}
                </select>
                <div className="flex gap-2 pt-2">
                    <button onClick={onClose} className="flex-1 py-3 font-bold text-neutral-500 hover:text-white">Cancel</button>
                    <button 
                        onClick={() => onCreate(label, type)} 
                        disabled={!label.trim()}
                        className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-neutral-200 disabled:opacity-50"
                    >
                        Create
                    </button>
                </div>
             </motion.div>
        </div>
    )
}


// ------------------------------------------------------------------
// MAIN CONTROLLER
// ------------------------------------------------------------------
export default function DockPilotPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [buttons, setButtons] = useState<Button[]>([]);
  const [pluginSchemas, setPluginSchemas] = useState<PluginSchema[]>([]);
  const [availableIcons, setAvailableIcons] = useState<string[]>([]);
  
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [resultMap, setResultMap] = useState<Record<string, TriggerResult>>({});

  // Modals
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingButton, setEditingButton] = useState<Button | null>(null);
  const [editingConfig, setEditingConfig] = useState<DynamicConfig>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);

  // Initial Load
  useEffect(() => {
    const init = async () => {
      try {
        const [profRes, schemaRes, iconRes] = await Promise.all([
          backendInstance.get<Profile[]>("/profiles"),
          backendInstance.get<{ plugins: PluginSchema[] }>("/buttons/schemas"),
          backendInstance.get<{ icons: string[] }>("/buttons/assets/icons")
        ]);
        setProfiles(profRes.data);
        setPluginSchemas(schemaRes.data.plugins || []);
        setAvailableIcons(iconRes.data.icons || []);
        
        const def = profRes.data.find((p) => p.is_default === 1) || profRes.data[0];
        setSelectedProfile(def || null);
      } catch (err) { console.error("Init failed", err); }
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

  const handleCreate = async (label: string, type: string) => {
    if (!selectedProfile) return;
    try {
      await backendInstance.post("/buttons/", { profile_id: selectedProfile.profile_id, label, type });
      setAddModalOpen(false);
      reloadButtons();
    } catch { alert("Failed to create button"); }
  };

  const handleTrigger = async (btn: Button) => {
    setLoadingMap(prev => ({ ...prev, [btn.button_id]: true }));
    setResultMap(prev => ({ ...prev, [btn.button_id]: undefined } as any));
    try {
      const res = await backendInstance.post(`/buttons/${btn.button_id}/trigger`);
      setResultMap(prev => ({ ...prev, [btn.button_id]: { success: true, message: res.data.result.status || "Success", timestamp: Date.now() } }));
    } catch (err: any) {
      setResultMap(prev => ({ ...prev, [btn.button_id]: { success: false, message: err.response?.data?.detail || "Error", timestamp: Date.now() } }));
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
      schema.forEach(field => { if (merged[field.key] === undefined && field.default !== undefined) merged[field.key] = field.default; });
      setEditingConfig(merged);
    } catch { setEditingConfig({}); }
    setConfigModalOpen(true);
  };

  const handleSaveConfig = async (id: string, config: DynamicConfig, label: string, icon: string | null) => {
    try {
      await Promise.all([
        backendInstance.put(`/buttons/${id}/config`, { config }),
        backendInstance.patch(`/buttons/${id}`, { label, icon })
      ]);
      setConfigModalOpen(false);
      reloadButtons();
    } catch (err: any) { alert(err.response?.data?.detail || "Failed to save"); }
  };

  const handleDelete = async () => {
    if (!editingButton || !confirm("Delete this button?")) return;
    try { await backendInstance.delete(`/buttons/${editingButton.button_id}`); setConfigModalOpen(false); reloadButtons(); } catch { alert("Delete failed"); }
  };

  const handleReset = async () => {
    if (!editingButton || !confirm("Reset config?")) return;
    try { await backendInstance.delete(`/buttons/${editingButton.button_id}/config`); setEditingConfig({}); } catch { alert("Reset failed"); }
  };

  // Pagination Logic
  const totalPages = Math.ceil(buttons.length / ITEMS_PER_PAGE) || 1;
  const currentButtons = buttons.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
  const paginate = (newDirection: number) => {
    if (currentPage + newDirection >= 0 && currentPage + newDirection < totalPages) {
      setDirection(newDirection);
      setCurrentPage(currentPage + newDirection);
    }
  };

  // Swipe logic
  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const pageVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 1000 : -1000, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 1000 : -1000, opacity: 0 })
  };

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden flex flex-col items-center justify-center relative select-none">
      
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950 via-black to-neutral-950 -z-10" />

      {/* Main Grid Area */}
      <div className="w-full h-full max-w-[1400px] flex flex-col justify-center p-4 sm:p-8">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentPage}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);
              if (swipe < -swipeConfidenceThreshold) paginate(1);
              else if (swipe > swipeConfidenceThreshold) paginate(-1);
            }}
            className="w-full h-full grid grid-cols-5 grid-rows-3 gap-3 sm:gap-6"
          >
            {/* Generate placeholders to ensure grid maintains shape */}
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => {
                const button = currentButtons[index];
                return button ? (
                    <MacroButton 
                        key={button.button_id} 
                        data={button} 
                        onTrigger={handleTrigger} 
                        onConfigure={handleOpenConfig} 
                        isRunning={!!loadingMap[button.button_id]}
                        result={resultMap[button.button_id] || null}
                    />
                ) : (
                    <div key={`empty-${index}`} className="w-full h-full rounded-[1.25rem] border border-neutral-900 bg-neutral-950/20" />
                );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination Indicators */}
      {totalPages > 1 && (
        <div className="absolute bottom-6 flex gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
                <div key={i} className={clsx("w-2 h-2 rounded-full transition-colors", i === currentPage ? "bg-white" : "bg-neutral-800")} />
            ))}
        </div>
      )}
      
      {/* Floating Action Button (Add) */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setAddModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:shadow-xl shadow-white/10 z-50"
      >
        <Plus size={28} strokeWidth={2.5} />
      </motion.button>

      {/* Profile Name (Subtle Top Left) */}
      <div className="fixed top-6 left-8 z-40">
        <span className="text-neutral-600 font-bold text-xs uppercase tracking-[0.2em]">{selectedProfile?.name || "PROFILE"}</span>
      </div>

      {/* Page Navigation Arrows (Visible on Hover/Desktop) */}
      <div className="fixed inset-y-0 left-0 w-16 flex items-center justify-center group pointer-events-none">
         <button 
            onClick={() => paginate(-1)} 
            className={clsx("pointer-events-auto p-2 rounded-full text-neutral-600 hover:text-white hover:bg-neutral-900/50 transition opacity-0 group-hover:opacity-100", currentPage === 0 && "invisible")}
         >
            <ChevronLeft size={32} />
         </button>
      </div>
      <div className="fixed inset-y-0 right-0 w-16 flex items-center justify-center group pointer-events-none">
         <button 
            onClick={() => paginate(1)} 
            className={clsx("pointer-events-auto p-2 rounded-full text-neutral-600 hover:text-white hover:bg-neutral-900/50 transition opacity-0 group-hover:opacity-100", currentPage === totalPages - 1 && "invisible")}
         >
            <ChevronRight size={32} />
         </button>
      </div>

      {/* Modals */}
      <ConfigModal 
        isOpen={configModalOpen} 
        onClose={() => setConfigModalOpen(false)} 
        button={editingButton} 
        schema={pluginSchemas.find(p => p.type === editingButton?.type)?.schema || []}
        initialConfig={editingConfig}
        availableIcons={availableIcons}
        onSave={handleSaveConfig}
        onDelete={handleDelete}
        onReset={handleReset}
      />

      <AddButtonModal 
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        schemas={pluginSchemas}
        onCreate={handleCreate}
      />
    </div>
  );
}