"use client";

import { useState, useEffect } from "react";
import { backendInstance } from "@/utils/axiosInstance";
import { Profile, Button, ButtonCreatePayload, ButtonConfig } from "@/utils/types";

export default function DockPilotPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [buttons, setButtons] = useState<Button[]>([]);
  const [buttonTypes, setButtonTypes] = useState<string[]>([]);
  const [newButtonLabel, setNewButtonLabel] = useState("");
  const [newButtonType, setNewButtonType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [triggeringButtonId, setTriggeringButtonId] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<{ success: boolean; message: string } | null>(null);

  // Config modal state
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [currentButton, setCurrentButton] = useState<Button | null>(null);
  const [config, setConfig] = useState<ButtonConfig>({
    url: "",
    method: "POST",
    headers: {},
    body: undefined,
  });
  const [configBodyInput, setConfigBodyInput] = useState("");
  const [headerKey, setHeaderKey] = useState("");
  const [headerValue, setHeaderValue] = useState("");

  // Load profiles
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const res = await backendInstance.get<Profile[]>("/profiles");
        setProfiles(res.data);

        const defaultProfile =
          res.data.find((p) => p.is_default === 1) ??
          res.data.find((p) => p.name === "Default") ??
          res.data[0] ??
          null;

        setSelectedProfile(defaultProfile);
      } catch {
        setError("Failed to load profiles");
      }
    };

    loadProfiles();
  }, []);

  // Load button types
  useEffect(() => {
    const loadButtonTypes = async () => {
      try {
        const res = await backendInstance.get<{ types: string[] }>("/buttons/button-types");
        setButtonTypes(res.data.types);
        if (res.data.types.length > 0) {
          setNewButtonType(res.data.types[0]); // default to first
        }
      } catch {
        setError("Failed to load button types");
        setButtonTypes(["trigger_api"]); // fallback
      }
    };

    loadButtonTypes();
  }, []);

  // Load buttons when profile changes
  useEffect(() => {
    if (!selectedProfile) {
      setButtons([]);
      return;
    }

    backendInstance
      .get<Button[]>(`/buttons/${selectedProfile.profile_id}`)
      .then((res) => setButtons(res.data))
      .catch(() => setError("Failed to load buttons"));
  }, [selectedProfile]);

  // Create button
  const createButton = async () => {
    if (!selectedProfile || !newButtonLabel.trim() || !newButtonType) return;

    const payload: ButtonCreatePayload = {
      profile_id: selectedProfile.profile_id,
      label: newButtonLabel.trim(),
      type: newButtonType,
    };

    try {
      await backendInstance.post("/buttons/", payload);
      setNewButtonLabel("");
      await reloadButtons();
    } catch {
      setError("Failed to create button");
    }
  };

  // Reload buttons
  const reloadButtons = async () => {
    if (!selectedProfile) return;
    try {
      const res = await backendInstance.get<Button[]>(
        `/buttons/${selectedProfile.profile_id}`
      );
      setButtons(res.data);
    } catch {
      setError("Failed to reload buttons");
    }
  };

  // Parse config safely
  const getConfigObject = (cfg: string | Record<string, any> | null): Record<string, any> => {
    if (!cfg) return {};
    if (typeof cfg === "string") {
      try {
        return cfg ? JSON.parse(cfg) : {};
      } catch {
        return {};
      }
    }
    return cfg;
  };

  // Open config modal
  const openConfigModal = async (button: Button) => {
    setCurrentButton(button);
    setError(null);
    setTestResult(null);

    try {
      const res = await backendInstance.get<{ config: ButtonConfig }>(
        `/buttons/${button.button_id}/config`
      );
      const loaded = res.data.config || {};

      setConfig({
        url: loaded.url || "",
        method: (loaded.method as ButtonConfig["method"]) || "POST",
        headers: loaded.headers || {},
        body: loaded.body,
      });

      setConfigBodyInput(
        loaded.body !== undefined ? JSON.stringify(loaded.body, null, 2) : ""
      );
    } catch (err: any) {
      if (err.response?.status !== 404 && err.response?.status !== 405) {
        setError("Failed to load config from server");
      }

      const fallback = getConfigObject(button.config);
      setConfig({
        url: fallback.url || "",
        method: (fallback.method as ButtonConfig["method"]) || "POST",
        headers: fallback.headers || {},
        body: fallback.body,
      });

      setConfigBodyInput(
        fallback.body !== undefined ? JSON.stringify(fallback.body, null, 2) : ""
      );
    }

    setConfigModalOpen(true);
  };

  // Save config
  const saveConfig = async () => {
    if (!currentButton) return;

    let bodyParsed: any = undefined;
    if (configBodyInput.trim()) {
      try {
        bodyParsed = JSON.parse(configBodyInput);
      } catch {
        setError("Invalid JSON in request body");
        return;
      }
    }

    const innerConfig: ButtonConfig = {
      url: config.url.trim(),
      method: config.method,
      headers: config.headers,
      body: bodyParsed,
    };

    if (!innerConfig.url) {
      setError("URL is required");
      return;
    }
    if (!innerConfig.url.startsWith("http://") && !innerConfig.url.startsWith("https://")) {
      setError("URL must start with http:// or https://");
      return;
    }

    const payload = { config: innerConfig };

    try {
      await backendInstance.put(
        `/buttons/${currentButton.button_id}/config`,
        payload
      );
      setError(null);
      setTestResult(null);
      setConfigModalOpen(false);
      await reloadButtons();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        const messages = detail.map((d: any) => d.msg || d.message).join("; ");
        setError(messages || "Validation error");
      } else {
        setError(detail || "Failed to save configuration");
      }
    }
  };

  // Test webhook in modal
  const testWebhook = async () => {
    if (!config.url) {
      setTestResult({ success: false, message: "URL is required" });
      return;
    }

    setTesting(true);
    setTestResult(null);

    let bodyParsed: any = undefined;
    if (configBodyInput.trim()) {
      try {
        bodyParsed = JSON.parse(configBodyInput);
      } catch {
        setTestResult({ success: false, message: "Invalid JSON in body" });
        setTesting(false);
        return;
      }
    }

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          "Content-Type": "application/json",
          ...config.headers,
        },
        body: ["POST", "PUT", "PATCH"].includes(config.method) && bodyParsed !== undefined
          ? JSON.stringify(bodyParsed)
          : undefined,
      });

      const text = await response.text();
      const message = response.ok
        ? `Success! Status: ${response.status}`
        : `Failed: ${response.status} ${response.statusText}${text ? `\n${text.slice(0, 300)}` : ""}`;

      setTestResult({ success: response.ok, message });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Network error" });
    } finally {
      setTesting(false);
    }
  };

  // Trigger button from card
  const triggerButton = async (button: Button) => {
    const cfg = getConfigObject(button.config);
    if (!cfg.url) {
      setTriggerResult({ success: false, message: "Button not configured yet" });
      return;
    }

    setTriggeringButtonId(button.button_id);
    setTriggerResult(null);

    let bodyParsed: any = undefined;
    if (cfg.body) {
      bodyParsed = cfg.body; // already parsed
    }

    try {
      const response = await fetch(cfg.url, {
        method: cfg.method || "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cfg.headers || {}),
        },
        body: ["POST", "PUT", "PATCH"].includes(cfg.method || "POST") && bodyParsed !== undefined
          ? JSON.stringify(bodyParsed)
          : undefined,
      });

      const text = await response.text();
      const message = response.ok
        ? `Triggered successfully! (${response.status})`
        : `Trigger failed: ${response.status} ${text.slice(0, 200)}`;

      setTriggerResult({ success: response.ok, message });
    } catch (err: any) {
      setTriggerResult({ success: false, message: err.message || "Network error" });
    } finally {
      setTriggeringButtonId(null);
      setTimeout(() => setTriggerResult(null), 5000); // auto-clear after 5s
    }
  };

  // Header management
  const addHeader = () => {
    if (headerKey.trim() && headerValue.trim()) {
      setConfig({
        ...config,
        headers: { ...config.headers, [headerKey.trim()]: headerValue.trim() },
      });
      setHeaderKey("");
      setHeaderValue("");
    }
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...config.headers };
    delete newHeaders[key];
    setConfig({ ...config, headers: newHeaders });
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">DockPilot</h1>

      {error && (
        <div className="mb-6 text-red-600 border border-red-300 p-4 rounded bg-red-50 flex justify-between items-center">
          <span>{error}</span>
          <button className="text-sm underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {triggerResult && (
        <div className={`mb-6 p-4 rounded border ${triggerResult.success ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          <strong>{triggerResult.success ? "Success!" : "Failed"}</strong>: {triggerResult.message}
        </div>
      )}

      {/* Profiles */}
      <div className="mb-10">
        <h2 className="font-semibold mb-4 text-xl">Profiles</h2>
        {profiles.length === 0 ? (
          <p className="text-gray-500">No profiles available</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {profiles.map((p) => (
              <button
                key={p.profile_id}
                className={`px-5 py-3 border rounded-lg transition-colors ${
                  selectedProfile?.profile_id === p.profile_id
                    ? "bg-blue-600 text-white"
                    : "bg-white hover:bg-gray-100"
                }`}
                onClick={() => setSelectedProfile(p)}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedProfile && (
        <>
          {/* Buttons Grid */}
          <div className="mb-10">
            <h2 className="font-semibold mb-6 text-xl">
              Buttons for {selectedProfile.name}
            </h2>

            {buttons.length === 0 ? (
              <p className="text-gray-500">No buttons yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buttons.map((b) => {
                  const configObj = getConfigObject(b.config);
                  const isConfigured = Object.keys(configObj).length > 0;
                  const isTriggering = triggeringButtonId === b.button_id;

                  return (
                    <div
                      key={b.button_id}
                      className="border rounded-xl p-6 bg-white shadow hover:shadow-lg transition-shadow flex flex-col"
                    >
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">{b.label}</h3>
                        <p className="text-sm text-gray-600 mb-4">Type: {b.type}</p>
                        <span className={`inline-block px-3 py-1 text-xs rounded-full mb-4 ${
                          isConfigured
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {isConfigured ? "Configured" : "Not configured"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-3 mt-4">
                        <button
                          onClick={() => triggerButton(b)}
                          disabled={!isConfigured || isTriggering}
                          className={`py-3 px-6 rounded-lg font-medium transition-colors ${
                            isConfigured
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          } ${isTriggering ? "opacity-70" : ""}`}
                        >
                          {isTriggering ? "Triggering..." : "Trigger"}
                        </button>

                        <button
                          onClick={() => openConfigModal(b)}
                          className="py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          {isConfigured ? "Edit Config" : "Configure"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create New Button */}
          <div className="border-t pt-10">
            <h2 className="font-semibold mb-6 text-xl">Create New Button</h2>
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
              <input
                type="text"
                placeholder="Button label (e.g. Notify Team)"
                value={newButtonLabel}
                onChange={(e) => setNewButtonLabel(e.target.value)}
                className="border p-4 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newButtonType}
                onChange={(e) => setNewButtonType(e.target.value)}
                className="border p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {buttonTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ").charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <button
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={!newButtonLabel.trim() || !newButtonType}
                onClick={createButton}
              >
                Create Button
              </button>
            </div>
          </div>
        </>
      )}

      {/* Configuration Modal */}
      {configModalOpen && currentButton && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h3 className="text-2xl font-bold mb-8">
              Configure: {currentButton.label}
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">URL *</label>
                <input
                  type="url"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full border p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Method</label>
                <select
                  value={config.method}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      method: e.target.value as ButtonConfig["method"],
                    })
                  }
                  className="w-full border p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Headers</label>
                <div className="space-y-2 mb-4">
                  {Object.entries(config.headers || {}).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-3 bg-gray-50 p-3 rounded">
                      <code className="flex-1 font-mono text-sm">{k}: {v}</code>
                      <button
                        onClick={() => removeHeader(k)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Key"
                    value={headerKey}
                    onChange={(e) => setHeaderKey(e.target.value)}
                    className="border p-3 rounded flex-1 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={headerValue}
                    onChange={(e) => setHeaderValue(e.target.value)}
                    className="border p-3 rounded flex-1 text-sm"
                  />
                  <button
                    onClick={addHeader}
                    className="px-5 py-3 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Request Body (JSON)
                </label>
                <textarea
                  value={configBodyInput}
                  onChange={(e) => setConfigBodyInput(e.target.value)}
                  placeholder='{ "content": "Button triggered!" }'
                  rows={10}
                  className="w-full border p-4 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {testResult && (
                <div className={`p-5 rounded-lg border ${testResult.success ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
                  <strong>{testResult.success ? "Test Success!" : "Test Failed"}</strong>
                  <pre className="text-xs mt-2 whitespace-pre-wrap">{testResult.message}</pre>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-4 mt-10">
              <button
                onClick={testWebhook}
                disabled={testing || !config.url}
                className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {testing ? "Testing..." : "Test Webhook"}
              </button>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setConfigModalOpen(false);
                    setError(null);
                    setTestResult(null);
                  }}
                  className="px-6 py-4 border rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={saveConfig}
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}