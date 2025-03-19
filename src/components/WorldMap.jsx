import { useState } from "react";
import { MapContainer, TileLayer, Marker, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import worldGeoJSON from "../world-geo.json"; 
import L from "leaflet";
import "./WorldMap.css"; 

const WorldMap = () => {
  const [mode, setMode] = useState("city"); // "city" or "country"
  const [visitedCities, setVisitedCities] = useState([]);
  const [visitedCountries, setVisitedCountries] = useState([]);
  const [cityInput, setCityInput] = useState("");

  const handleMapClick = (e) => {
    if (mode === "city") {
      const newCity = { lat: e.latlng.lat, lng: e.latlng.lng };
      setVisitedCities([...visitedCities, newCity]);
    }
  };

  const handleCityAdd = () => {
    // Assuming you have a function to get city coordinates from the input
    const cityCoordinates = getCityCoordinates(cityInput);
    if (cityCoordinates) {
      setVisitedCities([...visitedCities, cityCoordinates]);
      setCityInput("");
    }
  };

  const getCityCoordinates = (cityName) => {
    // This function should return the coordinates of the city
    // You can use an API to get the coordinates
    // For now, let's return a dummy value
    return { lat: 0, lng: 0 }; // Replace with actual coordinates
  };

  const highlightCountry = (e) => {
    const countryName = e.target.feature.properties.name;
    if (mode === "country") {
      if (visitedCountries.includes(countryName)) {
        setVisitedCountries(visitedCountries.filter((country) => country !== countryName));
        e.target.setStyle({ fillColor: "#3388ff", fillOpacity: 0.2 });
      } else {
        setVisitedCountries([...visitedCountries, countryName]);
        e.target.setStyle({ fillColor: "#ff5733", fillOpacity: 0.7 });
      }
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>World Map Travel Tracker</h1>
        <button className="button" onClick={() => setMode(mode === "city" ? "country" : "city")}>
          Switch to {mode === "city" ? "Country Mode" : "City Mode"}
        </button>
      </div>
      {mode === "city" && (
        <div className="input-bar">
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="Enter city name"
          />
          <button onClick={handleCityAdd}>Add City</button>
        </div>
      )}
      <MapContainer center={[20, 0]} zoom={2} className="map" onClick={handleMapClick}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {mode === "city" &&
          visitedCities.map((city, index) => (
            <Marker key={index} position={[city.lat, city.lng]} />
          ))}
        {mode === "country" && (
          <GeoJSON data={worldGeoJSON} onEachFeature={(feature, layer) => {
            layer.on({ click: highlightCountry });
          }} />
        )}
      </MapContainer>
    </div>
  );
};

export default WorldMap;