import axios from "axios";

// Base API Endpoint configured to point to Django REST Framework backend
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://192.168.17.1:8000/api";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

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

/**
 * Helper to resolve or create a vehicle record by string or ID
 */
export const resolveVehicleId = async (vehicleInput) => {
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
      return match.id;
    }

    // 3. Create vehicle with required fields
    const newVehiclePayload = {
      vehicle_number: cleanInput,
      name: cleanInput,
      device_id: `DEV-${cleanInput.replace(/\s+/g, "_")}`,
    };

    const newVehicleResponse = await apiClient.post("/vehicles/", newVehiclePayload);
    return newVehicleResponse.data.id;
  } catch (err) {
    console.error("Failed to resolve or create vehicle record:", err.response?.data || err);
    throw err;
  }
};

/**
 * Upload KML File to backend and save in database
 */
  export const uploadKmlFile = async (routeName, file, coordinatesPayload = []) => {
    try {
      const formData = new FormData();

      const fallbackName = file?.name ? file.name.replace(/\.[^/.]+$/, "") : "Unnamed Route";
      formData.append("route_name", routeName || fallbackName);

      if (file) {
        formData.append("file", file);
      }

      if (Array.isArray(coordinatesPayload) && coordinatesPayload.length > 0) {
        formData.append("coordinates", JSON.stringify(coordinatesPayload));
      }

      const response = await apiClient.post("/upload-route/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error saving KML file to database:", error.response?.data || error);
      throw error;
    }
  };

/**
 * Fetch route by specific Route ID
 */
export const getRouteById = async (routeId) => {
  try {
    const response = await apiClient.get(`/upload-route/${routeId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching route ID ${routeId}:`, error);
    throw error;
  }
};

/**
 * Fetch route filtered by route_name
 */
export const getRouteByName = async (routeName) => {
  try {
    const response = await apiClient.get(`/upload-route/?route_name=${encodeURIComponent(routeName)}`);
    if (Array.isArray(response.data)) {
      return response.data[0] || null;
    }
    return response.data;
  } catch (error) {
    console.error(`Error fetching route by name ${routeName}:`, error);
    throw error;
  }
};

/**
 * Fetch list of all uploaded routes
 */
export const getRoutesList = async () => {
  try {
    const response = await apiClient.get("/upload-route/");
    return response.data;
  } catch (error) {
    console.error("Error fetching routes list:", error);
    throw error;
  }
};

export const assignRouteToVehicle = async (payloadOrVehicleId, routeId) => {
  try {
    // Standardize payload object
    let payload = {};
    if (typeof payloadOrVehicleId === "object" && payloadOrVehicleId !== null) {
      payload = payloadOrVehicleId;
    } else {
      payload = {
        vehicle: payloadOrVehicleId,
        route: routeId,
      };
    }

    // Validate before making API requests
    if (!payload.vehicle || !payload.route) {
      throw new Error(
        `Payload missing required fields. Provided: vehicle=${payload.vehicle}, route=${payload.route}`
      );
    }

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
    console.error("Error in assignRouteToVehicle:",error.response?.data || error.message);
    throw error;
  }
};

/**
 * Fetch assigned route for a specific vehicle
 */
export const getAssignedRouteByVehicle = async (vehicleId) => {
  try {
    const response = await apiClient.get("/assigned-routes/", {
      params: { vehicle: vehicleId },
    });
    return Array.isArray(response.data) ? response.data[0] : response.data;
  } catch (error) {
    console.error("Error fetching assigned route:", error);
    throw error;
  }
};

/**
 * Delete route by ID from database
 */
export const deleteAssignedRoute = async (routeId) => {
  try {
    const response = await apiClient.delete(`/upload-route/${routeId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting route ${routeId}:`, error);
    throw error;
  }
};

/**
 * Fetch all assigned vehicle routes
 */
export const getAllRoutes = async () => {
  try {
    const response = await apiClient.get("/upload-route/");
    return response.data;
  } catch (error) {
    console.error("Error fetching all routes:", error);
    throw error;
  }
};

/**
 * Update assigned route by ID
 */
export const updateAssignedRoute = async (routeId, payload) => {
  try {
    const response = await apiClient.put(`/upload-route/${routeId}/`, payload);
    return response.data;
  } catch (error) {
    console.error("Error updating route:", error);
    throw error;
  }
};

export default apiClient;