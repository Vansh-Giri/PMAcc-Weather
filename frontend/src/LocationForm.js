import React, { useState } from "react";
import { createProfile } from "./api";

function LocationForm({ onSuccess }) {
  const [inputType, setInputType] = useState("browser");
  const [locationName, setLocationName] = useState("");
  const [customName, setCustomName] = useState("");
  const [coordinates, setCoordinates] = useState({ lat: "", lon: "" });
  const [detectedLocation, setDetectedLocation] = useState(""); // Store original detected location
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const getCurrentLocation = () => {
    setGettingLocation(true);
    
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude.toString(), lon: longitude.toString() });
        
        try {
          // Get location name from coordinates using reverse geocoding
          const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${process.env.REACT_APP_WEATHER_API_KEY}`
          );
          const data = await response.json();
          
          if (data.length > 0) {
            const detectedLocationName = `${data[0].name}, ${data[0].state || data[0].country}`;
            setDetectedLocation(detectedLocationName);
            setLocationName(detectedLocationName);
          } else {
            const coordsName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setDetectedLocation(coordsName);
            setLocationName(coordsName);
          }
        } catch (error) {
          console.error("Error getting location name:", error);
          const coordsName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setDetectedLocation(coordsName);
          setLocationName(coordsName);
        }
        
        setGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to get your location. Please try manual entry.");
        setGettingLocation(false);
      }
    );
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    let profileData;
    
    if (inputType === "browser" && coordinates.lat && coordinates.lon) {
      // Use custom name if provided, otherwise use detected location name
      const finalLocationName = customName.trim() || detectedLocation;
      
      profileData = {
        location_name: finalLocationName,
        country: "Auto-detected",
        latitude: parseFloat(coordinates.lat),
        longitude: parseFloat(coordinates.lon),
      };
    } else {
      profileData = {
        location_name: locationName,
        country: "Auto-detected",
      };
    }
    
    console.log("Sending data:", profileData);
    
    await createProfile(profileData);
    
    // Reset form
    setLocationName("");
    setCustomName("");
    setDetectedLocation("");
    setCoordinates({ lat: "", lon: "" });
    setInputType("browser");
    
    onSuccess();
  } catch (error) {
    console.error("Error creating location:", error);
    
    if (error.response && (error.response.status === 200 || error.response.status === 201)) {
      onSuccess();
    } else {
      const errorMessage = error.response?.data?.detail || error.message || "Unknown error occurred";
      alert(`Failed to create location: ${errorMessage}`);
    }
  }
  
  setLoading(false);
};



  return (
    <div className="location-form">
      <div className="input-type-selector">
        <h3>How would you like to add your location?</h3>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              value="browser"
              checked={inputType === "browser"}
              onChange={(e) => setInputType(e.target.value)}
            />
            <span role="img" aria-label="location pin">📍</span> Use Browser Location (GPS)
          </label>
          <label>
            <input
              type="radio"
              value="city"
              checked={inputType === "city"}
              onChange={(e) => setInputType(e.target.value)}
            />
            <span role="img" aria-label="city">🏙️</span> Enter City Name
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form">
        {inputType === "browser" ? (
          <div className="browser-location">
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="location-btn"
            >
              {gettingLocation ? "Getting Location..." : 
                <><span role="img" aria-label="location pin">📍</span> Get My Location</>
              }
            </button>
            
            {coordinates.lat && coordinates.lon && (
              <div className="coordinates">
                <p>✅ Location detected: {detectedLocation}</p>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Give this location a name (e.g., Home, Office, School)"
                  className="custom-name-input"
                />
                <small>Leave blank to use detected location name</small>
              </div>
            )}
          </div>
        ) : (
          <div className="manual-input">
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Enter city name (e.g., London, New York)"
              required
            />
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || (inputType === "browser" && !coordinates.lat)}
          className="submit-btn"
        >
          {loading ? "Adding Location..." : "Add Location"}
        </button>
      </form>
    </div>
  );
}

export default LocationForm;
