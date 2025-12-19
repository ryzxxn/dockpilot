"use client";

import { useState, useEffect } from "react";
import { backendInstance } from "@/utils/axiosInstance";
import { Profile, Button } from "@/utils/types";

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

export default function DockPilotPage() {
  // --- State ---
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [buttons, setButtons] = useState<Button[]>([]);
  const [pluginSchemas, setPluginSchemas] = useState<PluginSchema[]>([]);

  // Creation State
  const [newButtonLabel, setNewButtonLabel] = useState("");
  const [newButtonType, setNewButtonType] = useState("");

  // Feedback State
  const [error, setError] = useState<string | null>(null);
  const [triggeringButtonId, setTriggeringButtonId] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<{ success: boolean; message: string } | null>(null);

  // Modal State
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [currentButton, setCurrentButton] = useState<Button | null>(null);
  const [config, setConfig] = useState<DynamicConfig>({});
  
  // ✅ NEW: State for editing label inside modal
  const [editingLabel, setEditingLabel] = useState(""); 
  const [isSaving, setIsSaving] = useState(false);

  // --- Init ---
  useEffect(() => {
    const init = async () => {
      try {
        const [profRes, schemaRes] = await Promise.all([
          backendInstance.get<Profile[]>("/profiles"),
          backendInstance.get<{ plugins: PluginSchema[] }>("/buttons/schemas")
        ]);

        setProfiles(profRes.data);
        setPluginSchemas(schemaRes.data.plugins || []);

        // Defaults
        if (schemaRes.data.plugins.length > 0) {
          setNewButtonType(schemaRes.data.plugins[0].type);
        }
        const def = profRes.data.find((p) => p.is_default === 1) || profRes.data[0];
        setSelectedProfile(def || null);
      } catch (err) {
        setError("Failed to initialize. Is the backend running?");
      }
    };
    init();
  }, []);

  // Load buttons when profile changes
  useEffect(() => {
    if (selectedProfile) {
      backendInstance
        .get<Button[]>(`/buttons/${selectedProfile.profile_id}`)
        .then((res) => setButtons(res.data))
        .catch(() => setError("Failed to load buttons"));
    }
  }, [selectedProfile]);

  // --- Actions ---

  const createButton = async () => {
    if (!selectedProfile || !newButtonLabel.trim()) return;
    try {
      await backendInstance.post("/buttons/", {
        profile_id: selectedProfile.profile_id,
        label: newButtonLabel.trim(),
        type: newButtonType,
      });
      setNewButtonLabel("");
      reloadButtons();
    } catch {
      setError("Failed to create button");
    }
  };

  const reloadButtons = async () => {
    if (!selectedProfile) return;
    const res = await backendInstance.get<Button[]>(`/buttons/${selectedProfile.profile_id}`);
    setButtons(res.data);
  };

  // Find this function in your code and replace it
  const openConfigModal = async (button: Button) => {
    setCurrentButton(button);
    setEditingLabel(button.label); 

    // 1. Get the schema for this button type
    const schema = pluginSchemas.find(p => p.type === button.type)?.schema || [];

    try {
      const res = await backendInstance.get(`/buttons/${button.button_id}/config`);
      const dbConfig = res.data.config || {};

      // 2. MERGE: Start with DB config, fill in missing keys with Schema Defaults
      const mergedConfig = { ...dbConfig };
      
      schema.forEach(field => {
        // If the DB doesn't have a value, but the schema has a default...
        if (mergedConfig[field.key] === undefined && field.default !== undefined) {
            mergedConfig[field.key] = field.default;
        }
      });

      setConfig(mergedConfig);
    } catch {
      // Fallback: If DB fails, just load defaults
      const defaults: DynamicConfig = {};
      schema.forEach(field => {
         if (field.default !== undefined) defaults[field.key] = field.default;
      });
      setConfig(defaults);
    }
    setConfigModalOpen(true);
  };

  // ✅ NEW: Delete Button Logic
  const deleteButton = async () => {
    if (!currentButton) return;
    if (!confirm(`Are you sure you want to delete "${currentButton.label}"? This cannot be undone.`)) return;

    try {
        await backendInstance.delete(`/buttons/${currentButton.button_id}`);
        setConfigModalOpen(false);
        reloadButtons(); // Refresh grid
    } catch (err) {
        setError("Failed to delete button");
    }
  };

  // Reset Config Logic
  const resetConfig = async () => {
    if (!currentButton) return;
    if (!confirm("Reset configuration to defaults?")) return;
    try {
        await backendInstance.delete(`/buttons/${currentButton.button_id}/config`);
        setConfig({});
        reloadButtons();
    } catch { setError("Failed to reset config"); }
  };

  // ✅ UPDATED: Save Config AND Label
  const saveAllSettings = async () => {
    if (!currentButton) return;
    setIsSaving(true);
    try {
        // Run both updates in parallel for better UX
        const promises = [
            backendInstance.put(`/buttons/${currentButton.button_id}/config`, { config }),
        ];

        // Only send rename request if changed
        if (editingLabel.trim() !== currentButton.label) {
            promises.push(backendInstance.patch(`/buttons/${currentButton.button_id}`, { label: editingLabel }));
        }

        await Promise.all(promises);
        
        setConfigModalOpen(false);
        reloadButtons();
        setError(null);
    } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to save settings");
    } finally {
        setIsSaving(false);
    }
  };

  const triggerButton = async (button: Button) => {
    setTriggeringButtonId(button.button_id);
    setTriggerResult(null);
    try {
      const res = await backendInstance.post(`/buttons/${button.button_id}/trigger`);
      const resultData = res.data.result;
      // Format message based on result
      const msg = resultData.status 
        ? `Status: ${resultData.status}` 
        : JSON.stringify(resultData).slice(0, 50);
      setTriggerResult({ success: true, message: `Success! ${msg}` });
    } catch (err: any) {
      setTriggerResult({ success: false, message: err.response?.data?.detail || "Trigger failed" });
    } finally {
      setTriggeringButtonId(null);
      setTimeout(() => setTriggerResult(null), 3000);
    }
  };

  const currentSchema = (pluginSchemas || []).find(p => p.type === currentButton?.type)?.schema || [];

  return (
    <div className="p-6 max-w-5xl mx-auto font-sans text-gray-900">
      <h1 className="text-4xl font-black mb-8 tracking-tight">DOCKPILOT</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold">✕</button>
        </div>
      )}

      {triggerResult && (
        <div className={`mb-6 p-4 rounded-lg font-medium border ${triggerResult.success ? "bg-green-50 border-green-400 text-green-800" : "bg-red-50 border-red-400 text-red-800"}`}>
          {triggerResult.message}
        </div>
      )}

      {/* Profiles */}
      <section className="mb-10">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Profile</h2>
        <div className="flex gap-2 flex-wrap">
          {profiles.map((p) => (
            <button
              key={p.profile_id}
              onClick={() => setSelectedProfile(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedProfile?.profile_id === p.profile_id
                  ? "bg-black text-white shadow-md"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      {/* Buttons Grid */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {buttons.map((b) => (
            <div key={b.button_id} className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-48">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-xl truncate pr-2">{b.label}</h3>
                  <span className="text-[10px] bg-gray-100 px-2 py-1 rounded uppercase font-bold text-gray-500 tracking-wide">{b.type}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-auto">
                <button
                  onClick={() => triggerButton(b)}
                  disabled={triggeringButtonId === b.button_id}
                  className={`w-full py-2.5 rounded-xl font-bold text-white transition-all active:scale-95 ${
                    triggeringButtonId === b.button_id ? "bg-blue-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200 shadow-lg"
                  }`}
                >
                  {triggeringButtonId === b.button_id ? "Running..." : "Trigger Action"}
                </button>
                <button
                  onClick={() => openConfigModal(b)}
                  className="w-full py-2 text-xs font-medium text-gray-500 hover:text-black hover:bg-gray-50 rounded-lg transition"
                >
                  Configure & Settings
                </button>
              </div>
            </div>
          ))}
          
          {/* Create New - Inline Card */}
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col justify-center items-center bg-gray-50/50 hover:bg-gray-50 transition">
             <div className="w-full space-y-3">
                <input 
                    className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-black focus:outline-none" 
                    placeholder="New Button Name..."
                    value={newButtonLabel}
                    onChange={(e) => setNewButtonLabel(e.target.value)}
                />
                <select 
                    className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-black focus:outline-none"
                    value={newButtonType}
                    onChange={(e) => setNewButtonType(e.target.value)}
                >
                    {pluginSchemas.map(p => <option key={p.type} value={p.type}>{p.type}</option>)}
                </select>
                <button 
                    onClick={createButton}
                    disabled={!newButtonLabel.trim()}
                    className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    + Create Button
                </button>
             </div>
          </div>
        </div>
      </section>

      {/* ✅ CONFIG MODAL */}
      {configModalOpen && currentButton && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header / Rename Section */}
            <div className="p-6 border-b border-gray-100">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Button Nickname</label>
                <input 
                    type="text" 
                    value={editingLabel} 
                    onChange={(e) => setEditingLabel(e.target.value)}
                    className="w-full text-2xl font-black mt-1 p-2 -ml-2 rounded-lg border border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 focus:outline-none transition"
                />
                <div className="flex justify-between items-center mt-2">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-mono">{currentButton.type}</span>
                    <button onClick={resetConfig} className="text-xs text-orange-600 hover:text-orange-800 font-medium">Reset Config</button>
                </div>
            </div>

            {/* Scrollable Config Form */}
            <div className="p-6 overflow-y-auto space-y-5">
              {currentSchema.length === 0 && <p className="text-gray-400 italic">No configuration required for this plugin.</p>}

              {currentSchema.map((field) => {
                const value = config[field.key] !== undefined ? config[field.key] : (field.default || "");
                return (
                  <div key={field.key}>
                    <label className="block text-sm font-bold mb-1.5 text-gray-800">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>

                    {field.type === "enum" ? (
                      <select
                        value={value}
                        onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                      >
                        {field.values?.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    ) : field.type === "json" ? (
                      <textarea
                        value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                        onChange={(e) => {
                          try {
                            const val = JSON.parse(e.target.value);
                            setConfig({ ...config, [field.key]: val });
                          } catch {
                            setConfig({ ...config, [field.key]: e.target.value });
                          }
                        }}
                        rows={4}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
                        placeholder={field.placeholder || "{}"}
                      />
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        value={value}
                        onChange={(e) => setConfig({ ...config, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value })}
                        placeholder={field.placeholder || ""}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer / Actions */}
            <div className="p-6 border-t border-gray-100 flex items-center justify-between gap-4 bg-gray-50 rounded-b-3xl">
              <button 
                onClick={deleteButton}
                className="text-red-500 hover:bg-red-50 px-4 py-3 rounded-xl transition font-medium text-sm"
                title="Delete Button"
              >
                Delete
              </button>

              <div className="flex gap-3">
                <button 
                    onClick={() => setConfigModalOpen(false)} 
                    className="px-6 py-3 font-bold text-gray-500 hover:text-black transition"
                >
                    Cancel
                </button>
                <button 
                    onClick={saveAllSettings} 
                    disabled={isSaving}
                    className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 shadow-lg"
                >
                    {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}