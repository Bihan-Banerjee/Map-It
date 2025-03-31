import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import WorldMap from "./components/WorldMap";
import Loader from "./components/Loader";

function App() {
  const [loading, setLoading] = useState(true);
  const isAuthenticated = !!localStorage.getItem("token");

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 4000); 
  }, []);

  return (
    <Router>
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/world-map" /> : <Navigate to="/register" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/world-map"
        element={isAuthenticated ? (loading ? <Loader /> : <WorldMap />):<Navigate to="/register" />}
      />
    </Routes>
  </Router>
  );
}

export default App;