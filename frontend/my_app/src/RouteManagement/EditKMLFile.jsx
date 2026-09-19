import MapView from "../components/MapView"; // Import your reusable Map component

export default function EditKMLFile({
  selectedVehicle,
  routeName,
  routeSections,
  routeCoordinates,
  POINTS_PER_SECTION,
  expandedSection,
  setExpandedSection,
  handleEditRoute,  
  handleAddPoint,
  handleShowRoute,
  handleRemovePoint,
  handleCoordinateChange,
  handleSaveKmlToDatabase,
  handleDeleteRoute,
  selectedRouteId,
  isLoading,
}) {
  // Convert [lat, lng] arrays into objects if needed by MapView
  const mapLocations = routeCoordinates.map((coord) => ({
    latitude: coord[0],
    longitude: coord[1],
  }));

  return (
    <div className="bg-white p-5 rounded-xl shadow-md mb-6 border border-gray-100 flex flex-col space-y-6">
      {/* Route Info & Control Action Header */}
      <div>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div className="flex gap-4 text-sm font-semibold text-gray-700">
            <span>Route Sections ({routeSections.length} Sections | Total {routeCoordinates.length} Points)</span>
            <span className="text-gray-400">|</span>
            <span>Vehicle ID: {selectedVehicle || "N/A"}</span>
            <span className="text-gray-400">|</span>
            <span>Active Route: {routeName || "No Route Selected"}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShowRoute}
              className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
            >
              Show Route
            </button>
            <button
              onClick={handleEditRoute}
              className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded hover:bg-blue-100 transition"
            >
              Edit Route
            </button>
            <button
              onClick={handleSaveKmlToDatabase}
              disabled={isLoading || routeCoordinates.length === 0}
              className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 disabled:bg-gray-300 transition"
            >
              {isLoading ? "Saving..." : "Save Route"}
            </button>
            {selectedRouteId && (
              <button
                onClick={handleDeleteRoute}
                disabled={isLoading}
                className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition"
              >
                Delete Route
              </button>
            )}
          </div>
        </div>

        {/* Section Accordion List */}
        <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-3 bg-gray-50">
          {routeSections.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              No points loaded. Upload a KML file or click "+ Add Waypoint".
            </p>
          ) : (
            routeSections.map((sectionPoints, secIdx) => {
              const startIdx = secIdx * POINTS_PER_SECTION;
              const endIdx = startIdx + sectionPoints.length;
              const isExpanded = expandedSection === secIdx;

              return (
                <div
                  key={secIdx}
                  className="border border-gray-300 rounded-lg bg-white overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() =>
                      setExpandedSection(isExpanded ? null : secIdx)
                    }
                    className="w-full flex justify-between items-center px-4 py-2.5 bg-gray-100 hover:bg-gray-200 transition text-left"
                  >
                    <span className="text-xs font-bold text-gray-700">
                      Section #{secIdx + 1} (Points {startIdx + 1} - {endIdx})
                    </span>
                    <span className="text-xs font-semibold text-gray-500">
                      {isExpanded ? "▲ Hide" : "▼ Expand"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="p-3 space-y-2 bg-white">
                      {sectionPoints.map((pt, pointOffset) => {
                        const globalIdx = startIdx + pointOffset;
                        return (
                          <div
                            key={globalIdx}
                            className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-200"
                          >
                            <span className="text-xs font-bold text-gray-600 min-w-[70px]">
                              Point #{globalIdx + 1}
                            </span>

                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-400">
                                  LAT:
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  value={pt[0]}
                                  onChange={(e) =>
                                    handleCoordinateChange(
                                      globalIdx,
                                      0,
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-2 py-1 border rounded text-xs font-mono focus:ring-1 focus:ring-blue-500"
                                />
                              </div>

                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-400">
                                  LNG:
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  value={pt[1]}
                                  onChange={(e) =>
                                    handleCoordinateChange(
                                      globalIdx,
                                      1,
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-2 py-1 border rounded text-xs font-mono focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => handleRemovePoint(globalIdx)}
                              className="text-red-500 hover:text-red-700 text-xs px-2 font-bold"
                              title="Remove Point"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Embedded Map Section */}
      <div className="w-full">
        <span className="block text-sm font-semibold text-gray-700 mb-2">
          Route Preview Map
        </span>
        <MapView
          locations={mapLocations}
          height="450px"
          autoFitBounds={true}
        />
      </div>
    </div>
  );
}