"use client";

import { useState, useEffect } from "react";
import { backendInstance } from "@/utils/axiosInstance";
import { Profile, Button, ButtonCreatePayload } from "@/utils/types";

// Dynamic Config Type
type DynamicConfig = Record<string, any>;

interface PluginSchema {
  type: string;
  schema: Array<{
    key: string;
    label: string;
    type: "string" | "number" | "enum" | "json";
    required?: boolean;
    values?: string[]; // for enums
    default?: any;
    placeholder?: string;
  }>;
}

export default function DockPilotPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [buttons, setButtons] = useState<Button[]>([]);
  const [pluginSchemas, setPluginSchemas] = useState<PluginSchema[]>([]);
  
  const [newButtonLabel, setNewButtonLabel] = useState("");
  const [newButtonType, setNewButtonType] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [triggeringButtonId, setTriggeringButtonId] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<{ success: boolean; message: string } | null>(null);

  // Dynamic Config Modal State
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [currentButton, setCurrentButton] = useState<Button | null>(null);
  const [config, setConfig] = useState<DynamicConfig>({});
  const [isSaving, setIsSaving] = useState(false);

  // 1. Load profiles and Plugin Schemas on mount
  useEffect(() => {
    const init = async () => {
      try {
        const [profRes, schemaRes] = await Promise.all([
          backendInstance.get<Profile[]>("/profiles"),
          backendInstance.get<{ plugins: PluginSchema[] }>("/buttons/schemas")
        ]);

        setProfiles(profRes.data);
        setPluginSchemas(schemaRes.data.plugins);

        if (schemaRes.data.plugins.length > 0) {
          setNewButtonType(schemaRes.data.plugins[0].type);
        }

        const def = profRes.data.find((p) => p.is_default === 1) || profRes.data[0];
        setSelectedProfile(def || null);
      } catch (err) {
        setError("Failed to initialize app");
      }
    };
    init();
  }, []);

  // 2. Load buttons when profile changes
  useEffect(() => {
    if (selectedProfile) {
      backendInstance
        .get<Button[]>(`/buttons/${selectedProfile.profile_id}`)
        .then((res) => setButtons(res.data))
        .catch(() => setError("Failed to load buttons"));
    }
  }, [selectedProfile]);

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
    } catch { setError("Failed to create button"); }
  };

  const reloadButtons = async () => {
    if (!selectedProfile) return;
    const res = await backendInstance.get<Button[]>(`/buttons/${selectedProfile.profile_id}`);
    setButtons(res.data);
  };

  // 3. Open Modal & Load Config
  const openConfigModal = async (button: Button) => {
    setCurrentButton(button);
    try {
      const res = await backendInstance.get(`/buttons/${button.button_id}/config`);
      setConfig(res.data.config || {});
    } catch {
      setConfig({});
    }
    setConfigModalOpen(true);
  };

  // 4. Save Config
  const saveConfig = async () => {
    if (!currentButton) return;
    setIsSaving(true);
    try {
      await backendInstance.put(`/buttons/${currentButton.button_id}/config`, { config });
      setConfigModalOpen(false);
      reloadButtons();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Save failed");
    } finally { setIsSaving(false); }
  };

  // 5. Trigger Button (Call Server to execute plugin)
  const triggerButton = async (button: Button) => {
    setTriggeringButtonId(button.button_id);
    setTriggerResult(null);
    try {
      // NOTE: You should have an endpoint in FastAPI that calls plugin.execute()
      const res = await backendInstance.post(`/buttons/${button.button_id}/trigger`);
      setTriggerResult({ success: true, message: `Success: ${JSON.stringify(res.data)}` });
    } catch (err: any) {
      setTriggerResult({ success: false, message: err.response?.data?.detail || "Trigger failed" });
    } finally {
      setTriggeringButtonId(null);
      setTimeout(() => setTriggerResult(null), 5000);
    }
  };

  const currentSchema = pluginSchemas.find(p => p.type === currentButton?.type)?.schema || [];

  return (
    <div className="p-6 max-w-5xl mx-auto font-sans">
      <h1 className="text-4xl font-black mb-8 tracking-tight">DOCKPILOT</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex justify-between">
          <p>{error}</p>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {triggerResult && (
        <div className={`mb-6 p-4 rounded-lg border ${triggerResult.success ? "bg-green-50 border-green-500 text-green-800" : "bg-red-50 border-red-500 text-red-800"}`}>
          {triggerResult.message}
        </div>
      )}

      {/* Profiles Selection */}
      <section className="mb-12">
        <h2 className="text-sm font-uppercase tracking-widest text-gray-500 mb-4">ACTIVE PROFILE</h2>
        <div className="flex gap-2">
          {profiles.map((p) => (
            <button
              key={p.profile_id}
              onClick={() => setSelectedProfile(p)}
              className={`px-4 py-2 rounded-md font-medium transition ${
                selectedProfile?.profile_id === p.profile_id ? "bg-black text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      {/* Buttons Grid */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {buttons.map((b) => (
            <div key={b.button_id} className="border rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-xl">{b.label}</h3>
                  <span className="text-[10px] bg-gray-100 px-2 py-1 rounded uppercase font-bold text-gray-500">{b.type}</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => triggerButton(b)}
                  disabled={triggeringButtonId === b.button_id}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition disabled:opacity-50"
                >
                  {triggeringButtonId === b.button_id ? "Running..." : "Trigger"}
                </button>
                <button
                  onClick={() => openConfigModal(b)}
                  className="w-full py-2 text-sm text-gray-500 hover:text-black transition"
                >
                  Configure Settings
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Create Section */}
      <section className="bg-gray-50 p-8 rounded-3xl">
        <h2 className="font-bold text-xl mb-4">Add New Action</h2>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Action Name..."
            value={newButtonLabel}
            onChange={(e) => setNewButtonLabel(e.target.value)}
            className="flex-1 p-4 border rounded-xl"
          />
          <select
            value={newButtonType}
            onChange={(e) => setNewButtonType(e.target.value)}
            className="p-4 border rounded-xl bg-white"
          >
            {pluginSchemas.map(p => (
              <option key={p.type} value={p.type}>{p.type}</option>
            ))}
          </select>
          <button
            onClick={createButton}
            className="px-8 py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800"
          >
            Create
          </button>
        </div>
      </section>

      {/* DYNAMIC CONFIG MODAL */}
      {configModalOpen && currentButton && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-black mb-1">Settings</h3>
            <p className="text-gray-500 mb-8 uppercase text-xs font-bold tracking-widest">{currentButton.label} ({currentButton.type})</p>

            <div className="space-y-6">
              {currentSchema.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-bold mb-2 text-gray-700">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>

                  {field.type === "enum" ? (
                    <select
                      value={config[field.key] || field.default || ""}
                      onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                      className="w-full p-4 border rounded-xl"
                    >
                      <option value="" disabled>Select option...</option>
                      {field.values?.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  ) : field.type === "json" ? (
                    <textarea
                      value={typeof config[field.key] === 'object' ? JSON.stringify(config[field.key], null, 2) : config[field.key] || ""}
                      onChange={(e) => {
                        try {
                          const val = JSON.parse(e.target.value);
                          setConfig({ ...config, [field.key]: val });
                        } catch {
                          setConfig({ ...config, [field.key]: e.target.value });
                        }
                      }}
                      rows={5}
                      className="w-full p-4 border rounded-xl font-mono text-sm"
                      placeholder='{ "key": "value" }'
                    />
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={config[field.key] || ""}
                      onChange={(e) => setConfig({ ...config, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full p-4 border rounded-xl"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-10">
              <button
                onClick={() => setConfigModalOpen(false)}
                className="flex-1 py-4 font-bold text-gray-500 hover:text-black transition"
              >
                Cancel
              </button>
              <button
                onClick={saveConfig}
                disabled={isSaving}
                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}