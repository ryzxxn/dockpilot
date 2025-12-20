import axios, { AxiosInstance } from 'axios';

class ApiClient {
  private instance: AxiosInstance;
  private baseURL: string = 'http://localhost:9001';

  constructor() {
    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  setBaseURL(url: string) {
    this.baseURL = url.trim().replace(/\/$/, '');
    this.instance.defaults.baseURL = this.baseURL;
  }

  getBaseURL() {
    return this.baseURL;
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try both /health and /health/ to handle FastAPI routing
      const response = await this.instance.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error: any) {
      // Log error for debugging
      console.error('Connection test failed:', {
        message: error.message,
        code: error.code,
        baseURL: this.baseURL,
      });
      return false;
    }
  }

  // API methods
  async getProfiles() {
    return this.instance.get('/profiles');
  }

  async getButtons(profileId: string) {
    return this.instance.get(`/buttons/${profileId}`);
  }

  async getPluginSchemas() {
    return this.instance.get('/buttons/schemas');
  }

  async getAvailableIcons() {
    return this.instance.get('/buttons/assets/icons');
  }

  async createButton(data: { profile_id: string; label: string; type: string }) {
    return this.instance.post('/buttons/', data);
  }

  async updateButton(buttonId: string, data: { label?: string; icon?: string | null }) {
    return this.instance.patch(`/buttons/${buttonId}`, data);
  }

  async deleteButton(buttonId: string) {
    return this.instance.delete(`/buttons/${buttonId}`);
  }

  async getButtonConfig(buttonId: string) {
    return this.instance.get(`/buttons/${buttonId}/config`);
  }

  async updateButtonConfig(buttonId: string, config: Record<string, any>) {
    return this.instance.put(`/buttons/${buttonId}/config`, { config });
  }

  async deleteButtonConfig(buttonId: string) {
    return this.instance.delete(`/buttons/${buttonId}/config`);
  }

  async triggerButton(buttonId: string) {
    return this.instance.post(`/buttons/${buttonId}/trigger`);
  }

  getIconUrl(iconName: string) {
    return `${this.baseURL}/icons/${iconName}`;
  }
}

export const apiClient = new ApiClient();

