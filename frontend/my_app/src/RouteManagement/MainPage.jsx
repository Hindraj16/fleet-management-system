import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getVehicles,
  getAllRoutes,
  assignRouteToVehicle,
  updateAssignedRoute,
  deleteAssignedRoute,
} from "../api/fleetApi";
import { kml } from "@tmcw/togeojson";

import AssignRoute from "./AssignRoute";
import UploadKmlTab from "./UploadKml";
import EditKMLFile from "./EditKMLFile";

export default function MainPage() {
  const [activeTab, setActiveTab] = useState("assign");

  const [vehiclesList, setVehiclesList] = useState([]);
  const [allSavedRoutes, setAllSavedRoutes] = useState([]);

  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedDefaultRouteId, setSelectedDefaultRouteId] = useState("");

  // Custom user edits/uploads state
  const [customRouteName, setCustomRouteName] = useState("");
  const [customCoordinates, setCustomCoordinates] = useState(null);

  const POINTS_PER_SECTION = 50;
  const [expandedSection, setExpandedSection] = useState(0);

  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Memoized fetch function to safely re-use after CRUD operations
  const fetchBackendData = useCallback(async () => {
    try {
      const [vData, rData] = await Promise.all([
        getVehicles().catch(() => []),
        getAllRoutes().catch(() => []),
      ]);

      if (Array.isArray(vData)) setVehiclesList(vData);
      if (Array.isArray(rData)) setAllSavedRoutes(rData);
      return { vData, rData };
    } catch (err) {
      console.error("Backend fetch error:", err);
    }
  }, []);

  // Hydrate initial list data safely on mount
  useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const [vData, rData] = await Promise.all([
          getVehicles().catch(() => []),
          getAllRoutes().catch(() => []),
        ]);

        if (ignore) return;

        if (Array.isArray(vData) && vData.length > 0) {
          setVehiclesList(vData);
        }

        if (Array.isArray(rData) && rData.length > 0) {
          setAllSavedRoutes(rData);
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, []);

  // Derive route selection reactively without synchronous useEffect setState calls
  const selectedRouteMatch = useMemo(() => {
    if (!selectedRouteId || allSavedRoutes.length === 0) return null;
    return (
      allSavedRoutes.find(
        (r) => r.id.toString() === selectedRouteId.toString()
      ) || null
    );
  }, [selectedRouteId, allSavedRoutes]);

  // Priority: Custom edited/uploaded data > Saved database route data > Defaults
  const routeName = customRouteName || selectedRouteMatch?.route_name || "";
  const routeCoordinates =
    customCoordinates !== null
      ? customCoordinates
      : selectedRouteMatch?.coordinates || [];

  // Chunk route points into manageable sections for UI rendering
  const routeSections = useMemo(() => {
    const sections = [];
    if (!Array.isArray(routeCoordinates)) return sections;
    for (let i = 0; i < routeCoordinates.length; i += POINTS_PER_SECTION) {
      sections.push(routeCoordinates.slice(i, i + POINTS_PER_SECTION));
    }
    return sections;
  }, [routeCoordinates]);

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".kml")) {
      setStatusMessage("Error: Please upload a valid .kml file.");
      return;
    }

    setCustomRouteName(file.name.replace(/\.[^/.]+$/, ""));

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const domParser = new DOMParser();
        const kmlDom = domParser.parseFromString(e.target.result, "text/xml");
        const geoJsonData = kml(kmlDom);

        const extractedCoords = [];
        geoJsonData.features?.forEach((feature) => {
          if (
            feature.geometry &&
            (feature.geometry.type === "LineString" ||
              feature.geometry.type === "MultiLineString")
          ) {
            const coords =
              feature.geometry.type === "LineString"
                ? feature.geometry.coordinates
                : feature.geometry.coordinates.flat();

            coords.forEach(([lng, lat]) => {
              if (lat && lng) extractedCoords.push([lat, lng]);
            });
          }
        });

        if (extractedCoords.length === 0) {
          setStatusMessage("Error: No coordinates found in KML file.");
          return;
        }

        setCustomCoordinates(extractedCoords);
        setExpandedSection(0);
        setStatusMessage(
          `Loaded KML "${file.name}". Split into ${Math.ceil(
            extractedCoords.length / POINTS_PER_SECTION
          )} Section(s).`
        );
      } catch (err) {
        console.error("KML Parse error:", err);
        setStatusMessage("Error: Failed to parse KML file.");
      }
    };

    reader.readAsText(file);
  };

  const handleAssignRoute = async () => {
    if (!selectedVehicle) {
      setStatusMessage("Error: Please select a vehicle.");
      return;
    }

    setIsLoading(true);
    const payload = {
      vehicle: parseInt(selectedVehicle, 10),
      route_name: routeName || "Assigned Route",
      coordinates: routeCoordinates,
      default_route_id: selectedDefaultRouteId || null,
    };

    try {
      await assignRouteToVehicle(payload);
      await fetchBackendData();
      setStatusMessage(`Success: Route "${routeName}" assigned!`);
    } catch (err) {
      console.error("Error assigning route:", err);
      setStatusMessage("Error: Failed to assign route.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoordinateChange = (globalIndex, fieldIndex, value) => {
    const updated = [...routeCoordinates];
    const newCoord = [...updated[globalIndex]];
    newCoord[fieldIndex] = parseFloat(value) || 0;
    updated[globalIndex] = newCoord;
    setCustomCoordinates(updated);
  };

  const handleMarkerDragEnd = (globalIndex, newLatLng) => {
    const updated = [...routeCoordinates];
    updated[globalIndex] = newLatLng;
    setCustomCoordinates(updated);
    setStatusMessage(`Point #${globalIndex + 1} updated from map.`);
  };

  const handleAddPoint = () => {
    const lastPoint = routeCoordinates[routeCoordinates.length - 1] || [
      18.5204, 73.8567,
    ];
    const newPoint = [lastPoint[0] + 0.001, lastPoint[1] + 0.001];
    const updated = [...routeCoordinates, newPoint];
    setCustomCoordinates(updated);
    setExpandedSection(Math.floor((updated.length - 1) / POINTS_PER_SECTION));
  };

  const handleRemovePoint = (globalIndex) => {
    const updated = routeCoordinates.filter((_, i) => i !== globalIndex);
    setCustomCoordinates(updated);
  };

  const handleSaveKmlToDatabase = async () => {
    if (!selectedVehicle) {
      setStatusMessage("Error: Please select a vehicle.");
      return;
    }
    if (routeCoordinates.length === 0) {
      setStatusMessage("Error: No coordinates available to save.");
      return;
    }

    setIsLoading(true);
    const payload = {
      vehicle: parseInt(selectedVehicle, 10),
      route_name: routeName || "Edited KML Route",
      coordinates: routeCoordinates,
    };

    try {
      if (selectedRouteId && activeTab === "edit") {
        await updateAssignedRoute(selectedRouteId, payload);
      } else {
        await assignRouteToVehicle(payload);
      }

      await fetchBackendData();
      setCustomCoordinates(null);
      setCustomRouteName("");
      setStatusMessage(`Success: Saved route "${routeName}" to database!`);
    } catch (err) {
      console.error("Error saving route:", err);
      setStatusMessage("Error: Failed to save route to database.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoute = async () => {
    if (!selectedRouteId) {
      setStatusMessage("Error: Please select a route to delete.");
      return;
    }

    setIsLoading(true);
    try {
      await deleteAssignedRoute(selectedRouteId);
      setCustomCoordinates(null);
      setCustomRouteName("");
      setSelectedRouteId("");
      await fetchBackendData();
      setStatusMessage("Success: Route deleted successfully.");
    } catch (err) {
      console.error("Error deleting route:", err);
      setStatusMessage("Error: Failed to delete route.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCustomCoordinates(null);
    setCustomRouteName("");
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col font-sans text-gray-800">
      <main className="flex-1 w-full px-8 py-6 flex flex-col space-y-6">
        <h3 className="text-2xl font-bold text-gray-800">
          Vehicle Route Management
        </h3>

        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 px-4 pt-2">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {["assign", "upload", "save"].map((tab) => {
              const tabLabels = {
                assign: "Assign Route",
                upload: "Upload KML File",
                save: "Edit KML File (Lat/Long)",
              };
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`py-3 px-6 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                    activeTab === tab
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {tabLabels[tab]}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "assign" && (
          <AssignRoute
            vehiclesList={vehiclesList}
            selectedVehicle={selectedVehicle}
            setSelectedVehicle={setSelectedVehicle}
            allSavedRoutes={allSavedRoutes}
            selectedRouteId={selectedRouteId}
            setSelectedRouteId={(id) => {
              setSelectedRouteId(id);
              setCustomCoordinates(null);
              setCustomRouteName("");
            }}
            selectedDefaultRouteId={selectedDefaultRouteId}
            setSelectedDefaultRouteId={setSelectedDefaultRouteId}
            handleAssignRoute={handleAssignRoute}
            handleDeleteRoute={handleDeleteRoute}
            isLoading={isLoading}
          />
        )}

        {activeTab === "upload" && (
          <UploadKmlTab
            vehiclesList={vehiclesList}
            selectedVehicle={selectedVehicle}
            setSelectedVehicle={setSelectedVehicle}
            handleFileUpload={handleFileUpload}
            routeName={routeName}
            setRouteName={setCustomRouteName}
            isLoading={isLoading}
            routeCoordinates={routeCoordinates}
          />
        )}

        {(activeTab === "save" || activeTab === "edit") && (
          <EditKMLFile
            routeSections={routeSections}
            routeCoordinates={routeCoordinates}
            POINTS_PER_SECTION={POINTS_PER_SECTION}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
            handleAddPoint={handleAddPoint}
            handleRemovePoint={handleRemovePoint}
            handleCoordinateChange={handleCoordinateChange}
            handleSaveKmlToDatabase={handleSaveKmlToDatabase}
            handleDeleteRoute={handleDeleteRoute}
            selectedRouteId={selectedRouteId}
            isLoading={isLoading}
          />
        )}

        {statusMessage && (
          <div
            className={`w-full p-4 rounded-lg border text-sm font-medium ${
              statusMessage.startsWith("Error")
                ? "bg-red-50 text-red-700 border-red-200"
                : statusMessage.startsWith("Success")
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            {statusMessage}
          </div>
        )}
      </main>
    </div>
  );
}