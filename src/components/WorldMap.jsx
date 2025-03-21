import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, GeoJSON, Tooltip } from "react-leaflet";
import Autosuggest from 'react-autosuggest';
import "leaflet/dist/leaflet.css";
import worldGeoJSON from "../world-geo.json"; 
import L from "leaflet";
import "./WorldMap.css"; 

const WorldMap = () => {
  const [mode, setMode] = useState("city"); 
  const [visitedCities, setVisitedCities] = useState([]);
  const [visitedCountries, setVisitedCountries] = useState([]);
  const [cityInput, setCityInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  
  const handleMapClick = (e) => {
    if (mode === "city") {
      const newCity = { lat: e.latlng.lat, lng: e.latlng.lng, name: cityInput };
      setVisitedCities([...visitedCities, newCity]);
    }
  };

  const [statistics, setStatistics] = useState({
    numCitiesVisited: 0,
    numCountriesVisited: 0,
    percentageWorldExplored: 0,
  });

  const calculateStatistics = () => {
    const numCitiesVisited = visitedCities.length;
    const numCountriesVisited = visitedCountries.length;
    const totalCountries = worldGeoJSON.features.length;
    const percentageWorldExplored = (numCountriesVisited / totalCountries) * 100;
  
    setStatistics({
      numCitiesVisited,
      numCountriesVisited,
      percentageWorldExplored,
    });
  };

  useEffect(() => {
    calculateStatistics();
  }, [visitedCities, visitedCountries]);
  
  const handleCityAdd = async () => {
    const cityCoordinates = await getCityCoordinates(cityInput);
    if (cityCoordinates) {
      setVisitedCities([...visitedCities, { ...cityCoordinates, name: cityInput }]);
      setCityInput("");
    }
  };

  const getCityCoordinates = async (cityName) => {
    try {
      const apiKey = "b580df691f7642b7b236dacaab04dfa6"; 
      const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${cityName}&key=${apiKey}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry;
        return { lat, lng };
      } else {
        throw new Error("No results found for the given city name.");
      }
    } catch (error) {
      console.error("Error fetching city coordinates:", error);
      alert(`Failed to fetch city coordinates: ${error.message}`);
      return null;
    }
  };
  const highlightCountry = (e) => {
    if (mode === "country") {
      const countryName = e.target.feature.properties.name;
  
      setVisitedCountries((prevCountries) => {
        if (prevCountries.includes(countryName)) {
          return prevCountries.filter((c) => c !== countryName);
        } else {
          return [...prevCountries, countryName];
        }
      });
    }
  };
  
  const onSuggestionsFetchRequested = async ({ value }) => {
    const apiKey = "b580df691f7642b7b236dacaab04dfa6"; 
    const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${value}&key=${apiKey}`);
    const data = await response.json();
    const citySuggestions = data.results
      .filter(result => result.components._type === "city")
      .map(result => ({
        name: result.formatted,
        lat: result.geometry.lat,
        lng: result.geometry.lng
      }));
    setSuggestions(citySuggestions);
  };


  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const getSuggestionValue = suggestion => suggestion.name;

  const renderSuggestion = suggestion => (
    <div>
      {suggestion.name}
    </div>
  );

  const onSuggestionSelected = (event, { suggestion }) => {
    setCityInput(suggestion.name);
  };

  const inputProps = {
    placeholder: "Enter city name",
    style: {color: "black"},
    value: cityInput,
    onChange: (e, { newValue }) => setCityInput(newValue)
  };

  return (
    <div className="container">
      <button className="ui-btn" onClick={() => setMode(mode === "city" ? "country" : "city")}>
          <span>
            Switch to {mode === "city" ? "Country Mode" : "City Mode"}
          </span>
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
      
      <MapContainer center={[20, 0]} zoom={2} className="map" onClick={handleMapClick} maxZoom={10} minZoom={2}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {mode === "city" &&
          visitedCities.map((city, index) => (
            <Marker key={index} position={[city.lat, city.lng]}>
              <Tooltip>{city.name}</Tooltip>
            </Marker>
          ))}
        {mode === "country" && (
          <GeoJSON data={worldGeoJSON} style={(feature) => ({
            fillColor: visitedCountries.includes(feature.properties.name) ? "green" : "gray",
            weight: 1,
            opacity: 1,
            color: "white",
            fillOpacity: 0.7,
          })} onEachFeature={(feature, layer) => {
            layer.on({ click: highlightCountry });
            }} />
        )}
      </MapContainer>
      <div className="statistics" style={{ top: mode === "city" ? "450px" : "410px" }}>
      {mode === "city" && (
        <p>Cities Visited: {statistics.numCitiesVisited}</p>
      )}
      {mode === "country" && (
        <>
          <p>Countries Visited: {statistics.numCountriesVisited}</p>
          <p>Percentage of World Explored: {statistics.percentageWorldExplored.toFixed(2)}%</p>
        </>
      )}
    </div>
    </div>
  );
};

export default WorldMap;