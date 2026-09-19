import axios from "axios";

// Base API Endpoint configured to point to Django REST Framework backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://192.168.17.1:8000/api";

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

const resolveVehicleId = async (vehicleInput) => {
  if (!vehicleInput) return null;

  const cleanInput = vehicleInput.toString().trim();
  const digitsOnly = cleanInput.replace(/\D/g, "");
  const numericId = digitsOnly ? parseInt(digitsOnly, 10) : null;

  try {
    // 1. Fetch current list of vehicles
    const response = await apiClient.get("/vehicles/");
    const vehicles = Array.isArray(response.data) ? response.data : response.data.results || [];

    // 2. Search for existing match by ID, vehicle_number, or name
    const match = vehicles.find(
      (v) =>
        v.id === numericId ||
        v.vehicle_number?.toString().toLowerCase() === cleanInput.toLowerCase() ||
        v.name?.toString().toLowerCase() === cleanInput.toLowerCase() ||
        v.device_id?.toString().toLowerCase() === cleanInput.toLowerCase()
    );

    if (match) {
      return match.id; // Found existing vehicle ID
    }

    // 3. Create vehicle with ALL required fields (including device_id)
    const newVehiclePayload = {
      vehicle_number: cleanInput,
      name: cleanInput,
      device_id: `DEV-${cleanInput.replace(/\s+/g, "_")}`, // Generates fallback device ID e.g. DEV-33
    };

    const newVehicleResponse = await apiClient.post("/vehicles/", newVehiclePayload);
    return newVehicleResponse.data.id;
  } catch (err) {
    console.error("Failed to resolve or create vehicle record:", err.response?.data || err);
    throw err;
  }
};

/**
 * EXPORT 1: uploadKmlFile
 */
export const uploadKmlFile = async (vehicleInput, routeName, file, coordinatesPayload = []) => {
  try {
    const vehicleId = await resolveVehicleId(vehicleInput);
    console.log("Resolved Vehicle ID to submit:", vehicleId, typeof vehicleId);

    const formData = new FormData();
    formData.append("vehicle", vehicleId);
    
    // Safely fallback using optional chaining or default name
    const fallbackName = file?.name || "Unnamed Route";
    formData.append("route_name", routeName || fallbackName);
    if (file) {
      formData.append("kml_file", file);
    }
    if (coordinatesPayload && coordinatesPayload.length > 0) {
      formData.append("coordinates", JSON.stringify(coordinatesPayload));
    }
    
    const response = await apiClient.post("/assigned-routes/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading KML file:", error.response?.data || error);
    throw error;
  }
};

// Fetch route by its specific Route ID
export const getRouteById = async (routeId) => {
  const response = await apiClient.get(`/assigned-routes/${routeId}/`);
  return response.data;
};

// Fetch routes filtered by name or list all
export const getRouteByName = async (routeName) => {
  const response = await apiClient.get(`/assigned-routes/?route_name=${encodeURIComponent(routeName)}`);
  if (Array.isArray(response.data)) {
    return response.data[0] || null;
  }
  return response.data;
};

// Add and export getRoutesList
export const getRoutesList = async () => {
  try {
    const response = await apiClient.get("/assigned-routes/");
    return response.data;
  } catch (error) {
    console.error("Error fetching routes list:", error);
    throw error;
  }
};

export const assignRouteToVehicle = async (payload) => {
  try {
    const vehicleId = payload.vehicle;

    // 1. Fetch existing assigned routes for this vehicle
    const existingRoutesResponse = await apiClient.get("/assigned-routes/", {
      params: { vehicle: vehicleId },
    });

    const existingRoutes = existingRoutesResponse.data;

    // 2. If a route already exists for this vehicle, update it (PUT)
    if (Array.isArray(existingRoutes) && existingRoutes.length > 0) {
      const existingRouteId = existingRoutes[0].id;
      const updateResponse = await apiClient.put(
        `/assigned-routes/${existingRouteId}/`,
        payload
      );
      return updateResponse.data;
    }

    // 3. Otherwise, create a new route assignment (POST)
    const createResponse = await apiClient.post("/assigned-routes/", payload);
    return createResponse.data;
  } catch (error) {
    console.error("Error in assignRouteToVehicle:", error.response?.data || error);
    throw error;
  }
};

export const getAssignedRouteByVehicle = async (vehicleId) => {
  try {
    const response = await apiClient.get("/assigned-routes/", {
      params: { vehicle: vehicleId },
    });
    // Return single route record if present
    return Array.isArray(response.data) ? response.data[0] : response.data;
  } catch (error) {
    console.error("Error fetching assigned route:", error);
    throw error;
  }
};


export const deleteAssignedRoute = async (routeId) => {
  try {
    const response = await apiClient.delete(`/assigned-routes/${routeId}/`);
    return response.data;
  } catch (error) {
    console.error("Error deleting assigned route:", error);
    throw error;
  }
};

export const getAllRoutes = async () => {
  try {
    const response = await apiClient.get("/assigned-routes/");
    return response.data;
  } catch (error) {
    console.error("Error fetching all routes:", error);
    throw error;
  }
};

export const updateAssignedRoute = async (routeId, payload) => {
  try {
    const response = await apiClient.put(`/assigned-routes/${routeId}/`, payload);
    return response.data;
  } catch (error) {
    console.error("Error updating route:", error);
    throw error;
  }
};

export default apiClient;