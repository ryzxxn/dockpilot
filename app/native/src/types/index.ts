export type Profile = {
  profile_id: string;
  name: string;
  is_default: number;
  created_at: string;
};

export interface Button {
  button_id: string;
  profile_id: string;
  type: string;
  label: string;
  icon?: string | null;
  config: Record<string, any>;
  created_at: string;
}

export interface PluginSchema {
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

export interface TriggerResult {
  success: boolean;
  message: string;
  timestamp: number;
}

export interface ServerConfig {
  url: string;
  isConnected: boolean;
  lastChecked: number | null;
}

