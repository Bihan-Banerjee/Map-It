import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, GeoJSON, Tooltip as LeafletTooltip } from "react-leaflet";
import Autosuggest from 'react-autosuggest';
import "leaflet/dist/leaflet.css";
import worldGeoJSON from "../world-geo.json"; 
import L from "leaflet";
import "./WorldMap.css"; 
import axios from "axios";
import Loader from "./Loader";
import { debounce } from 'lodash';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LogoutButton from "./LogoutButton";
import { FaRobot } from "react-icons/fa";
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
  const [userName, setUserName] = useState("");
  const [hoverCountryInfo, setHoverCountryInfo] = useState(null);
  const countryCache = useRef(new Map());
  const [robotResponse, setRobotResponse] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [showBubble, setShowBubble] = useState(false);



  const handleRobotClick = async () => {
    try {
      const cleanList = (list) => [...list].filter(Boolean).map(c => typeof c === 'string' ? c : (c.name || JSON.stringify(c)));
      const cleanCountries = cleanList(visitedCountries);
      const cleanCities = cleanList(visitedCities);
      
      const prompt = `The user has visited the following countries: ${cleanCountries.join(", ")} and cities: ${cleanCities.join(", ")}. Compose a brief travel summary (within 50-75 words) in a light, mildly formal, and engaging tone — like a note from a seasoned travel writer. Avoid asking the user any questions. You may reference famous landmarks, local dishes, or cultural moments from these places. Use only English text, but localized words in English (like 'gelato' or 'siesta') are allowed. No font changes or non-English scripts. You can add tasteful emojis to enhance warmth. End with a charming remark if fitting.`;
  
      const response = await axios.post('http://localhost:5000/api/gemini/analyze', { prompt });
  
      console.log("Gemini says:", response.data.message);
      setRobotResponse(response.data.message);
      setShowBubble(true);
  
      setTimeout(() => {
        setShowBubble(false);
      }, 30000);
  
    } catch (error) {
      console.error("Error fetching robot response:", error);
    }
  };

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:5000/api/get-username", {
          headers: { Authorization: `Bearer ${token}` }, 
        });
        const { username } = response.data; 
        setUserName(username || "Guest"); 
      } catch (error) {
        console.error("Failed to fetch username:", error);
        setUserName("Guest"); 
      }
    };
    fetchUserName();
  }, []);

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
      toast.warn("Failed to find city. Please try another name.", { position: "top-right" });
      return null;
    }
  };

  const handleCityAdd = async () => {
    if (!cityInput.trim()) {
      toast.warn("City name cannot be empty.", { position: "top-right" });
      return;
    }
  
    const isDuplicate = visitedCities.some(
      (city) => city.name.toLowerCase() === cityInput.trim().toLowerCase()
    );
  
    if (isDuplicate) {
      toast.warn("City is already in the list.", { position: "top-right" });
      return;
    }
  
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

  const debouncedFetchCountryInfo = useCallback(
    debounce(async (countryName) => {
      if (countryCache.current.has(countryName)) {
        setHoverCountryInfo(countryCache.current.get(countryName));
        return;
      }
      try {
        const res = await axios.get(`https://restcountries.com/v3.1/name/${countryName}`);
        const country = res.data[0];
        const info = {
          name: country.name.common,
          capital: country.capital?.[0] || "N/A",
          region: country.region,
          population: country.population,
          flag: country.flags?.png || "",
          latlng: country.latlng,
        };
        countryCache.current.set(countryName, info);
        setHoverCountryInfo(info);
      } catch (error) {
        setHoverCountryInfo(null);
      }
    }, 500), [] 
  );

  const saveData = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/save-data', 
        { visitedCities, visitedCountries, statistics },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Data saved successfully!", { position: "top-right" });
    } catch (error) {
      toast.error("Failed to save data. Please try again.", { position: "top-right" });
    }
  };

  const debouncedFetchSuggestions = useCallback(
    debounce(async ({ value }) => {
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
    }, 500), [] 
  );
  

  const onSuggestionsClearRequested = () => setSuggestions([]);
  const getSuggestionValue = (suggestion) => suggestion.name;
  const renderSuggestion = (suggestion) => (
    <div style={{ display: "flex", alignItems: "center", padding: "5px" }}>
      <div style={{ marginRight: "10px", fontWeight: "bold" }}>{suggestion.name}</div>
      <div style={{ fontSize: "12px", color: "gray" }}>
        ({suggestion.lat.toFixed(2)}, {suggestion.lng.toFixed(2)})
      </div>
    </div>
  );
  const onSuggestionSelected = (_, { suggestion }) => setCityInput(suggestion.name);

  const inputProps = {
    placeholder: "Enter city name",
    value: cityInput,
    onChange: (e, { newValue }) => setCityInput(newValue),
    style: { color: "black" },
  };

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true); 
    const timer = setTimeout(() => {
      setLoading(false); 
    }, 2000);
    return () => clearTimeout(timer); 
  }, []);

  return (
    <div>
      <ToastContainer autoClose={3000} hideProgressBar={false} closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      {loading && <Loader state={loading} />}
      {!loading && (
      <div className="container">
        <div className="header-container">
          <span className="welcome">Welcome, {userName}</span>
          <LogoutButton/>

          <button className="ui-btn header" onClick={() => setMode(mode === "city" ? "country" : "city")}>
            <span>Switch to {mode === "city" ? "Country Mode" : "City Mode"}</span>
          </button>

          {mode === "city" && (
            <div className="input-bar">
              <Autosuggest
                suggestions={suggestions}
                onSuggestionsFetchRequested={debouncedFetchSuggestions}
                onSuggestionsClearRequested={onSuggestionsClearRequested}
                getSuggestionValue={getSuggestionValue}
                renderSuggestion={renderSuggestion}
                onSuggestionSelected={onSuggestionSelected}
                inputProps={inputProps}
                theme={{
                  container: "autosuggest-container",
                  suggestionsContainer: "autosuggest-suggestions-container",
                  suggestionsList: "autosuggest-suggestions-list",
                  suggestion: "autosuggest-suggestion",
                }}
              />
              <button className="ui-btn search_button" onClick={handleCityAdd}><span>Add City</span></button>
            </div>
          )}
        </div>

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
              <LeafletTooltip>{city.name.split(',')[0]}</LeafletTooltip>
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
                layer.on({
                  click: highlightCountry,
                  mouseover: () => debouncedFetchCountryInfo(feature.properties.name),
                  mouseout: () => setHoverCountryInfo(null),
                });
              }}
            />
          )}

          {hoverCountryInfo && (
            <Marker position={hoverCountryInfo.latlng} icon={L.divIcon({ className: 'invisible-icon' })}>
              <LeafletTooltip direction="top" permanent>
                <div style={{ maxWidth: "200px", textAlign: "left" }}>
                  <strong>{hoverCountryInfo.name}</strong><br />
                  Capital: {hoverCountryInfo.capital}<br />
                  Region: {hoverCountryInfo.region}<br />
                  Population: {hoverCountryInfo.population.toLocaleString()}<br />
                  <img src={hoverCountryInfo.flag} alt="flag" width="60" />
                </div>
              </LeafletTooltip>
            </Marker>
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
          <button className="ui-btn stat" onClick={saveData}><span>Save Data</span></button>
        </div>
      </div>
      )}
      <div
        className="robot-icon"
        onClick={handleRobotClick}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          backgroundColor: "#007bff",
          color: "white",
          borderRadius: "50%",
          width: "60px",
          height: "60px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
          zIndex: 1000
        }}
      >
        <FaRobot size={30} />
      </div>

      {showBubble && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '30px',
          backgroundColor: '#fff',
          padding: '12px 16px',
          borderRadius: '12px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
          maxWidth: '260px',
          zIndex: 9999,
          fontSize: '14px',
          color: '#000',
          lineHeight: '1.4',
        }}>
          {robotResponse}
          <div style={{
            position: 'absolute',
            bottom: '-12px',
            right: '20px',
            width: '0',
            height: '0',
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: '12px solid #fff',
            color: '#000',
          }}></div>
        </div>
      )}
  
      <button 
        onClick={handleRobotClick}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          backgroundColor: '#ffcc00',
          border: 'none',
          color: '#000',
          opacity: 0.000001,
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          cursor: 'pointer',
          fontSize: '30px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}
      >
        🤖
      </button>
    </div>
  );
};

export default WorldMap;