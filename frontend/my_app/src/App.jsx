import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layout Component
import Navbar from "./components/Navbar";

// Page Components
import Dashboard from "./pages/Dashboard";
import LiveTracking from "./pages/LiveTracking";
import HistoryPlayback from "./pages/HistoryPlayback";
import VehicleDetails from "./pages/VehicleDetails";

function App() {
  return (
    <BrowserRouter>
      {/* Top Navigation Bar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <Routes>
          {/* Main Dashboard */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Tracking & Playback Views */}
          <Route path="/tracking" element={<LiveTracking />} />
          <Route path="/live" element={<LiveTracking />} />
          <Route path="/history" element={<HistoryPlayback />} />
          <Route
            path="/vehiclehistorymap/:id"
            element={<HistoryPlayback />}
          />

          {/* Vehicle Details */}
          <Route path="/vehicledetails" element={<VehicleDetails />} />
          <Route path="/vehicle/:id" element={<VehicleDetails />} />

          {/* Catch-all redirect to Dashboard */}
          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;