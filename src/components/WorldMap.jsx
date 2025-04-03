import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, GeoJSON, Tooltip } from "react-leaflet";
import Autosuggest from 'react-autosuggest';
import "leaflet/dist/leaflet.css";
import worldGeoJSON from "../world-geo.json"; 
import L from "leaflet";
import "./WorldMap.css"; 
import axios from "axios";

const WorldMap = () => {
  const [mode, setMode] = useState("city"); 
  const [visitedCities, setVisitedCities] = useState([]);
  const [visitedCountries, setVisitedCountries] = useState([]);
  const [cityInput, setCityInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [statistics, setStatistics] = useState({
    numCitiesVisited: 0,
    numCountriesVisited: 0,
    percentageWorldExplored: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem("token"); 
        const response = await axios.get("http://localhost:5000/api/get-data", {
          headers: { Authorization: `Bearer ${token}` }, 
        });
        const { visitedCities, visitedCountries } = response.data;
        setVisitedCities(visitedCities || []);
        setVisitedCountries(visitedCountries || []);
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const totalCountries = worldGeoJSON.features.length;
    const percentageWorldExplored = (visitedCountries.length / totalCountries) * 100;
    setStatistics({
      numCitiesVisited: visitedCities.length,
      numCountriesVisited: visitedCountries.length,
      percentageWorldExplored: percentageWorldExplored,
    });
  }, [visitedCities, visitedCountries]);

  const handleMapClick = (e) => {
    if (mode === "city" && cityInput.trim()) {
      const newCity = {
        name: cityInput,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        visitedAt: new Date().toISOString(),
      };
      setVisitedCities([...visitedCities, newCity]);
      setCityInput("");
    }
  };

  const getCityCoordinates = async (cityName) => {
    try {
      const apiKey = import.meta.env.VITE_OPENCAGE_API_KEY;
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${cityName}&key=${apiKey}`
      );
      const data = await response.json();
      if (data.results.length > 0) {
        return data.results[0].geometry;
      }
      throw new Error("City not found");
    } catch (error) {
      console.error("Error fetching coordinates:", error);
      alert("Failed to find city. Please try another name.");
      return null;
    }
  };

  const handleCityAdd = async () => {
    if (!cityInput.trim()) return;
    const coordinates = await getCityCoordinates(cityInput);
    if (coordinates) {
      const newCity = {
        name: cityInput,
        lat: coordinates.lat,
        lng: coordinates.lng,
        visitedAt: new Date().toISOString(),
      };
      setVisitedCities([...visitedCities, newCity]);
      setCityInput("");
    }
  };

  const highlightCountry = (e) => {
    if (mode === "country") {
      const countryName = e.target.feature.properties.name;
      setVisitedCountries((prev) =>
        prev.includes(countryName)
          ? prev.filter((c) => c !== countryName)
          : [...prev, countryName]
      );
    }
  };

  const saveData = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/save-data', 
        { visitedCities, visitedCountries, statistics },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Data saved successfully!");
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  
useEffect(() => {
  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/get-data', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };
  loadData();
}, []);

  const onSuggestionsFetchRequested = async ({ value }) => {
    const apiKey = import.meta.env.VITE_OPENCAGE_API_KEY;
    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${value}&key=${apiKey}`
    );
    const data = await response.json();
    const citySuggestions = data.results
      .filter((result) => result.components._type === "city")
      .map((result) => ({
        name: result.formatted,
        lat: result.geometry.lat,
        lng: result.geometry.lng,
      }));
    setSuggestions(citySuggestions);
  };

  const onSuggestionsClearRequested = () => setSuggestions([]);
  const getSuggestionValue = (suggestion) => suggestion.name;
  const renderSuggestion = (suggestion) => <div>{suggestion.name}</div>;
  const onSuggestionSelected = (_, { suggestion }) => setCityInput(suggestion.name);

  const inputProps = {
    placeholder: "Enter city name",
    value: cityInput,
    onChange: (e, { newValue }) => setCityInput(newValue),
    style: { color: "black" },
  };

  return (
    <div className="container">
      <button className="ui-btn header" onClick={() => setMode(mode === "city" ? "country" : "city")}>
        <span>Switch to {mode === "city" ? "Country Mode" : "City Mode"}</span>
      </button>

      {mode === "city" && (
        <div className="input-bar">
          <Autosuggest
            suggestions={suggestions}
            onSuggestionsFetchRequested={onSuggestionsFetchRequested}
            onSuggestionsClearRequested={onSuggestionsClearRequested}
            getSuggestionValue={getSuggestionValue}
            renderSuggestion={renderSuggestion}
            onSuggestionSelected={onSuggestionSelected}
            inputProps={inputProps}
          />
          <button className="ui-btn" onClick={handleCityAdd}><span>Add City</span></button>
        </div>
      )}

      <MapContainer
        center={[20, 0]}
        zoom={2}
        className="map"
        onClick={handleMapClick}
        maxZoom={10}
        minZoom={2}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {mode === "city" && visitedCities.map((city, index) => (
          <Marker key={index} position={[city.lat, city.lng]}>
            <Tooltip>{city.name.split(',')[0]}</Tooltip>
          </Marker>
        ))}

        {mode === "country" && (
          <GeoJSON
            data={worldGeoJSON}
            style={(feature) => ({
              fillColor: visitedCountries.includes(feature.properties.name) ? "green" : "gray",
              weight: 1,
              opacity: 1,
              color: "white",
              fillOpacity: 0.7,
            })}
            onEachFeature={(feature, layer) => {
              layer.on({ click: highlightCountry });
            }}
          />
        )}
      </MapContainer>

      <div className="statistics" style={{ top: mode === "city" ? "80vh" : "71vh" }}>
        {mode === "city" && <p>Cities Visited: {statistics.numCitiesVisited}</p>}
        {mode === "country" && (
          <>
            <p>Countries Visited: {statistics.numCountriesVisited}</p>
            <p>Percentage of World Explored: {statistics.percentageWorldExplored.toFixed(2)}%</p>
          </>
        )}
        <button className="ui-btn" onClick={saveData}><span>Save Data</span></button>
      </div>
    </div>
  );
};

export default WorldMap;