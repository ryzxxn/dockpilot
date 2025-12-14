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
  config: Record<string, any>;
  created_at: string;
}


export interface ButtonCreatePayload {
  profile_id: string;
  type: string;
  label: string;
}

export type ButtonConfig = {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
};
