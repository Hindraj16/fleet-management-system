import { useEffect, useState, useRef } from "react";
import {
  uploadKmlFile,
  assignRouteToVehicle, 
  getRouteById,
  deleteAssignedRoute,
  getVehicles,
  getRoutesList,
  getRouteByName,
} from "../api/fleetApi";
import MapView from "../components/MapView";

export default function UploadKml() {
  const [vehiclesList, setVehiclesList] = useState([]);
  const [existingRoutes, setExistingRoutes] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  // Search/Autosuggest State (empty on load to display placeholder)
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [routeNameInput, setRouteNameInput] = useState("");
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const [parsedLocations, setParsedLocations] = useState([]);

  // Fetch initial database records on mount
  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        const [vehiclesData, routesData] = await Promise.allSettled([
          getVehicles(),
          getRoutesList ? getRoutesList() : Promise.resolve([]),
        ]);

        if (!ignore) {
          if (vehiclesData.status === "fulfilled" && Array.isArray(vehiclesData.value)) {
            setVehiclesList(vehiclesData.value);
            if (vehiclesData.value.length > 0) {
              setSelectedVehicleId(vehiclesData.value[0].id.toString());
            }
          }

          if (routesData.status === "fulfilled" && Array.isArray(routesData.value)) {
            setExistingRoutes(routesData.value);
          }
        }
      } catch (err) {
        console.warn("Could not fetch database records:", err);
      }
    }

    loadInitialData();
    return () => {
      ignore = true;
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter existing database routes for autosuggest list
  const filteredRoutes = existingRoutes.filter((r) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase().trim();
    const name = (r.route_name || r.name || "").toString().toLowerCase();
    const id = (r.id || "").toString().toLowerCase();
    return name.includes(query) || id.includes(query);
  });

  // Handle Autosuggest selection
  const handleSelectRoute = async (route) => {
    const name = route.route_name || route.name || "";
    setSearchTerm(name);
    setRouteNameInput(name);
    setIsDropdownOpen(false);
    if (!route.id) return;
    setActiveRouteId(route.id);
    setIsLoading(true);
    try {
      const routeData = await getRouteById(route.id);
      const formattedCoords = normalizeCoordinates(
        routeData.coordinates
      );
      setParsedLocations(formattedCoords);
      setRouteNameInput(
        routeData.route_name || name
      );
      setStatusMessage({
        type: "success",
        text: `Loaded route "${routeData.route_name || name}" onto map preview!`,
      });
    } catch (error) {
      console.error("Load Route Error:", error);
      setStatusMessage({
        type: "error",
        text: "Failed to load route coordinates.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Parse KML into coordinate segments
  const parseKmlCoordinates = (kmlText) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(kmlText, "text/xml");
      const coordNodes = xmlDoc.getElementsByTagName("coordinates");
      const allPoints = [];

      for (let i = 0; i < coordNodes.length; i++) {
        const rawCoords = coordNodes[i].textContent.trim().split(/\s+/);

        rawCoords.forEach((coordStr) => {
          const parts = coordStr.split(",");
          if (parts.length >= 2) {
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              allPoints.push({ latitude: lat, longitude: lng });
            }
          }
        });
      }

      setParsedLocations(allPoints);
      return allPoints;
    } catch (err) {
      console.warn("Failed to parse KML coordinates for preview:", err);
      setParsedLocations([]);
      return [];
    }
  };

  // Handle KML File Selection
  const handleFileUpload = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith(".kml")) {
        setStatusMessage({
          type: "error",
          text: "Invalid file type. Please select a .kml file.",
        });
        return;
      }

      setFile(selectedFile);
      setStatusMessage({ type: "", text: "" });

      if (!routeNameInput) {
        setRouteNameInput(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          parseKmlCoordinates(event.target.result);
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  // Save Route with Duplicate Name Check
  const handleSaveRoute = async (e) => {
    e?.preventDefault();

    const routeName = routeNameInput.trim() || searchTerm.trim();

    if (!routeName) {
      setStatusMessage({ type: "error", text: "Please enter a route name." });
      return;
    }

    if (!file && parsedLocations.length === 0) {
      setStatusMessage({ type: "error", text: "Please select a KML file." });
      return;
    }

    // Check if route name already exists in database
    const isDuplicate = existingRoutes.some(
      (r) => (r.route_name || r.name || "").toLowerCase() === routeName.toLowerCase()
    );

    if (isDuplicate) {
      setStatusMessage({
        type: "error",
        text: `Error: Route name "${routeName}" already exists in database. Please use a unique name.`,
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const responseData = await uploadKmlFile(
        selectedVehicleId,
        routeName,
        file,
        parsedLocations
      );

      if (responseData?.id) {
        setActiveRouteId(responseData.id);
      }

      // Refresh route list after saving
      if (getRoutesList) {
        const updatedRoutes = await getRoutesList();
        setExistingRoutes(updatedRoutes);
      }

      setStatusMessage({
        type: "success",
        text: `Success: Route "${routeName}" saved to database successfully!`,
      });
    } catch (error) {
      console.error("Upload API Error:", error);
      setStatusMessage({
        type: "error",
        text: error.response?.data?.detail || error.message || "Error saving route.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to recursively flatten any nested coordinate array
  const flattenCoordinates = (rawCoords) => {
    if (!rawCoords) return [];
    
    let items = rawCoords;
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch (e) {
        console.error("JSON parse error for coordinates:", e);
        return [];
      }
    }

    // Recursively extract all objects containing lat/lng or latitude/longitude
    const flattened = [];
    const extract = (arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((item) => {
        if (Array.isArray(item)) {
          extract(item);
        } else if (item && typeof item === "object") {
          const lat = parseFloat(item.latitude ?? item.lat);
          const lng = parseFloat(item.longitude ?? item.lng);
          if (!isNaN(lat) && !isNaN(lng)) {
            flattened.push({ latitude: lat, longitude: lng });
          }
        }
      });
    };

    extract(items);
    return flattened;
  };

  // Normalize coordinates from different backend/KML formats
  const normalizeCoordinates = (coords) => {
    if (!coords) return [];

    // Convert JSON string to object
    if (typeof coords === "string") {
      try {
        coords = JSON.parse(coords);
      } catch (error) {
        console.error("Invalid coordinates JSON:", error);
        return [];
      }
    }

    if (!Array.isArray(coords)) return [];
    if (
      coords.length > 0 &&
      Array.isArray(coords[0]) &&
      typeof coords[0][0] === "number"
    ) {
      return coords.map(([lat, lng]) => ({
        latitude: Number(lat),
        longitude: Number(lng),
        lat: Number(lat),
        lng: Number(lng),
      }));
    }
    if (
      coords.length > 0 &&
      !Array.isArray(coords[0]) &&
      typeof coords[0] === "object"
    ) {
      return coords
        .map((point) => {
          const lat = Number(
            point.latitude ?? point.lat
          );
          const lng = Number(
            point.longitude ?? point.lng
          );
          if (Number.isNaN(lat) || Number.isNaN(lng)) {
            return null;
          }
          return {
            latitude: lat,
            longitude: lng,
            lat: lat,
            lng: lng,
          };
        })
        .filter(Boolean);
    }
    if (
      coords.length > 0 &&
      Array.isArray(coords[0]) &&
      Array.isArray(coords[0][0])
    ) {
      return coords
        .flat()
        .filter(
          (point) =>
            Array.isArray(point) &&
            point.length >= 2
        )
        .map(([lat, lng]) => ({
          latitude: Number(lat),
          longitude: Number(lng),
          lat: Number(lat),
          lng: Number(lng),
        }));
    }
    return [];
  };

  // Show Route (Fetch from Database and render on fleet map)
  const handleShowRoute = async () => {
    const targetRouteName =
      routeNameInput.trim() || searchTerm.trim();

    if (!activeRouteId && !targetRouteName) {
      setStatusMessage({
        type: "error",
        text: "Please enter or select a Route Name to show.",
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      let routeData = null;

      // Get route by ID
      if (activeRouteId) {
        routeData = await getRouteById(activeRouteId);
      }
      // Otherwise get route by name
      else if (targetRouteName) {
        routeData = await getRouteByName(targetRouteName);
      }

      if (!routeData) {
        setStatusMessage({
          type: "error",
          text: "Route not found in database.",
        });
        return;
      }

      console.log("Route returned from backend:", routeData);
      console.log("Coordinates returned:", routeData.coordinates);

      // Set route information
      setRouteNameInput(
        routeData.route_name || targetRouteName
      );

      setActiveRouteId(routeData.id || null);

      // Convert coordinates
      const formattedCoords = normalizeCoordinates(
        routeData.coordinates
      );

      console.log(
        "Formatted coordinates:",
        formattedCoords
      );

      if (formattedCoords.length === 0) {
        setParsedLocations([]);

        setStatusMessage({
          type: "error",
          text: "Route was found, but no valid coordinates were found.",
        });

        return;
      }

      // Send coordinates to MapView
      setParsedLocations(formattedCoords);

      setStatusMessage({
        type: "success",
        text: `Loaded route "${routeData.route_name}" onto map preview!`,
      });

    } catch (error) {
      console.error("Fetch Route Error:", error);

      setStatusMessage({
        type: "error",
        text:
          error.response?.data?.detail ||
          "Failed to fetch route from database.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update Route Details
  const handleUpdateRoute = async () => {
    if (!selectedVehicleId) {
      setStatusMessage({ type: "error", text: "Please select a vehicle." });
      return;
    }

    setIsLoading(true);

    try {
      await assignRouteToVehicle({
        vehicle: selectedVehicleId,
        route_name: routeNameInput || searchTerm,
      });

      setStatusMessage({
        type: "success",
        text: "Route updated in database!",
      });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error.response?.data?.detail || "Failed to update route.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Route
  const handleDeleteRoute = async () => {
    if (!activeRouteId && !selectedVehicleId) {
      setStatusMessage({ type: "error", text: "Please select a route or vehicle to delete." });
      return;
    }

    setIsLoading(true);

    try {
      await deleteAssignedRoute(activeRouteId || selectedVehicleId);

      setFile(null);
      setRouteNameInput("");
      setSearchTerm("");
      setActiveRouteId(null);
      setParsedLocations([]);

      setStatusMessage({
        type: "success",
        text: "Route deleted successfully.",
      });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error.response?.data?.detail || "Failed to delete route.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Control Action Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-6">
        
        {/* Route Name Input with Database Autosuggest */}
        <div className="relative flex flex-col flex-1 min-w-[220px]" ref={dropdownRef}>
          <label className="text-xs font-semibold text-gray-600 mb-1">
            Route Name
          </label>
          <input
            type="text"
            placeholder="Edit Route Name"
            value={routeNameInput || searchTerm}
            onChange={(e) => {
              setRouteNameInput(e.target.value);
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            className="p-2 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Database Autosuggest Dropdown */}
          {isDropdownOpen && (
            <ul className="absolute left-0 top-full z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg">
              {filteredRoutes.length > 0 ? (
                filteredRoutes.map((r, index) => (
                  <li
                    key={r.id || index}
                    onClick={() => handleSelectRoute(r)}
                    className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer border-b border-gray-100 last:border-0 flex justify-between items-center"
                  >
                    <span className="font-medium">{r.route_name || r.name}</span>
                    {r.id && <span className="text-xs text-gray-400">ID: {r.id}</span>}
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-gray-400">
                  No matching routes found
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Upload KML File Input */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1">
            Upload KML File
          </label>
          <input
            type="file"
            accept=".kml"
            onChange={handleFileUpload}
            className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>

        {/* Action Buttons */}
        <div>
          <button
            type="button"
            onClick={handleSaveRoute}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md shadow-sm transition disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save Route"}
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={handleShowRoute}
            disabled={isLoading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md shadow-sm transition disabled:opacity-50"
          >
            Show Route
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={handleUpdateRoute}
            disabled={isLoading}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-md shadow-sm transition disabled:opacity-50"
          >
            Update Route
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={handleDeleteRoute}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-md shadow-sm transition disabled:opacity-50"
          >
            {isLoading ? "Deleting..." : "Delete Route"}
          </button>
        </div>
      </div>

      {/* Backend Status Message Banner */}
      {statusMessage.text && (
        <div
          className={`p-3 rounded-lg text-sm font-medium border ${
            statusMessage.type === "error"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-green-50 text-green-700 border-green-200"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Map Preview Section */}
      <div className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">
          Route Preview {parsedLocations.length > 0 && `(${parsedLocations.length} points)`}
        </h2>
        <MapView
          key={JSON.stringify(parsedLocations)}
          locations={parsedLocations}
          height="500px"
          autoFitBounds={true}
        />
      </div>
    </div>
  );
}