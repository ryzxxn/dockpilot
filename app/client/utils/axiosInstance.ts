import axios from "axios";

export const BASE_URL= "http://dockpilot.local:9090"

export const backendInstance = axios.create({
  baseURL: BASE_URL
});
