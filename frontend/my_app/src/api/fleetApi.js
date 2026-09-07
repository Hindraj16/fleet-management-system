import axios from "axios";

// Base API Endpoint configured to point to Django REST Framework backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Fetch all vehicles
 */
export const getVehicles = async () => {
  try {
    const response = await apiClient.get("/vehicles/");
    return response.data;
  } catch (error) {
    console.error("Error fetching vehicles list:", error);
    throw error;
  }
};

/**
 * Fetch single vehicle details by ID
 */
export const getVehicleById = async (vehicleId) => {
  try {
    const response = await apiClient.get(`/vehicles/${vehicleId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching vehicle ${vehicleId}:`, error);
    throw error;
  }
};

/**
 * Create a new vehicle record
 */
export const createVehicle = async (vehicleData) => {
  try {
    const response = await apiClient.post("/vehicles/", vehicleData);
    return response.data;
  } catch (error) {
    console.error("Error creating vehicle:", error);
    throw error;
  }
};

/**
 * Update an existing vehicle record by ID (PATCH)
 */
export const updateVehicle = async (vehicleId, vehicleData) => {
  try {
    const response = await apiClient.patch(`/vehicles/${vehicleId}/`, vehicleData);
    return response.data;
  } catch (error) {
    console.error(`Error updating vehicle ${vehicleId}:`, error);
    throw error;
  }
};

/**
 * Delete a vehicle record by ID
 */
export const deleteVehicle = async (vehicleId) => {
  try {
    const response = await apiClient.delete(`/vehicles/${vehicleId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting vehicle ${vehicleId}:`, error);
    throw error;
  }
};

/**
 * Fetch GPS location history records with optional vehicle and date filtering
 */
export const getGPSLocations = async (vehicleId, startDate, endDate) => {
  try {
    const params = {};
    if (vehicleId) params.vehicle = vehicleId;
    if (startDate) params.start_time = startDate;
    if (endDate) params.end_time = endDate;

    const response = await apiClient.get("/gps-locations/", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching GPS location telemetry:", error);
    throw error;
  }
};

/**
 * Fetch latest GPS location per vehicle for live map rendering
 */
export const getLatestGPSLocations = async () => {
  try {
    const response = await apiClient.get("/gps-locations/latest/");
    return response.data;
  } catch (error) {
    console.error("Error fetching latest GPS locations:", error);
    throw error;
  }
};

/**
 * Post a new GPS location ping manually or from a simulator endpoint
 */
export const postGPSLocation = async (locationPayload) => {
  try {
    const response = await apiClient.post("/gps-locations/", locationPayload);
    return response.data;
  } catch (error) {
    console.error("Error posting GPS location ping:", error);
    throw error;
  }
};

export default apiClient;