import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import LiveTracking from "./pages/LiveTracking";
import VehicleDetails from "./pages/VehicleDetails";
import Vehicles from "./pages/Vehicles";
import VehicleHistoryMap from "./pages/VehicleHistoryMap";


function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tracking" element={<LiveTracking />} />
        <Route path="/vehicle" element={<VehicleDetails />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/vehicle/:id" element={<VehicleDetails />} />
        <Route path="/vehiclehistorymap/:id" element={<VehicleHistoryMap />} />


        {/*<Route path="/trips" element={<Trips />} /> 
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/geofencing" element={<Geofencing />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />*/}
        
        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
