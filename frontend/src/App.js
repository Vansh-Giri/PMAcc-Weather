import React, { useEffect, useState, useCallback } from "react";
import {
  getProfiles,
  deleteProfile,
  exportProfiles,
} from "./api";
import LocationForm from "./LocationForm";
import LocationWeather from "./LocationWeather";
import "./styles.css";

function Home() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationTimes, setLocationTimes] = useState({});

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (locations.length > 0) {
      updateLocationTimes();
      // Update times every minute
      const interval = setInterval(updateLocationTimes, 60000);
      return () => clearInterval(interval);
    }
  }, [locations]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await getProfiles();
      setLocations(res.data);
      if (res.data.length === 0) {
        setShowForm(true);
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
      setShowForm(true);
    } finally {
      setLoading(false);
    }
  };

  const updateLocationTimes = useCallback(async () => {
    const times = {};
    
    for (const location of locations) {
      try {
        let timezone = null;
        let weatherApiKey = process.env.REACT_APP_WEATHER_API_KEY;
        
        // Skip if no API key
        if (!weatherApiKey) {
          console.warn("Weather API key not found");
          times[location.id] = {
            time: new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }),
            timeOfDay: getTimeOfDay(new Date().getHours())
          };
          continue;
        }

        // Get timezone for the location
        let timezoneResponse;
        if (location.latitude && location.longitude) {
          // Use coordinates if available
          timezoneResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&appid=${weatherApiKey}`
          );
        } else {
          // Use location name
          timezoneResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location.location_name)}&appid=${weatherApiKey}`
          );
        }
        
        if (timezoneResponse.ok) {
          const timezoneData = await timezoneResponse.json();
          timezone = timezoneData.timezone;
        }
        
        if (timezone !== null) {
          // Calculate local time using timezone offset (timezone is in seconds)
          const utcTime = new Date().getTime() + (new Date().getTimezoneOffset() * 60000);
          const localTime = new Date(utcTime + (timezone * 1000));
          
          times[location.id] = {
            time: localTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }),
            timeOfDay: getTimeOfDay(localTime.getHours())
          };
        } else {
          // Fallback to system time
          times[location.id] = {
            time: new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }),
            timeOfDay: getTimeOfDay(new Date().getHours())
          };
        }
      } catch (error) {
        console.error(`Error getting timezone for ${location.location_name}:`, error);
        // Fallback to system time
        times[location.id] = {
          time: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          timeOfDay: getTimeOfDay(new Date().getHours())
        };
      }
    }
    
    setLocationTimes(times);
  }, [locations]);

  useEffect(() => {
    if (locations.length > 0) {
      updateLocationTimes();
      // Update times every minute
      const interval = setInterval(updateLocationTimes, 60000);
      return () => clearInterval(interval);
    }
  }, [locations, updateLocationTimes]);

  const getTimeOfDay = (hour) => {
    if (hour < 6) return "Night";
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    if (hour < 21) return "Evening";
    return "Night";
  };

  const handleDelete = async (id, event) => {
    event.stopPropagation();
    
    if (window.confirm("Are you sure you want to delete this location?")) {
      try {
        await deleteProfile(id);
        
        // Update state immediately without refetching
        setLocations(prevLocations => prevLocations.filter(loc => loc.id !== id));
        
        // Remove from location times
        setLocationTimes(prevTimes => {
          const newTimes = { ...prevTimes };
          delete newTimes[id];
          return newTimes;
        });
        
        if (selectedLocation && selectedLocation.id === id) {
          setSelectedLocation(null);
        }
        
        console.log(`Location ${id} deleted successfully`);
      } catch (err) {
        console.error("Failed to delete location:", err);
        alert(`Failed to delete location: ${err.response?.data?.detail || err.message}`);
      }
    }
  };

 const handleExport = async () => {
  try {
    console.log("Starting export...");
    
    const res = await exportProfiles();
    console.log("Export response:", res.data);
    
    // Convert JSON to text
    const jsonText = JSON.stringify(res.data, null, 2);
    
    // Create blob and download
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "weather_locations.json");
    
    document.body.appendChild(link);
    link.click();
    
    link.remove();
    window.URL.revokeObjectURL(url);
    
    console.log("Export completed successfully");
    alert("Locations exported successfully!");
    
  } catch (err) {
    console.error("Export error:", err);
    alert(`Failed to export: ${err.message}`);
  }
};



  const handleFormSuccess = () => {
    setShowForm(false);
    fetchLocations();
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      <h1>Weather Locations</h1>
      
      {selectedLocation ? (
        <LocationWeather 
          location={selectedLocation} 
          onBack={() => setSelectedLocation(null)}
        />
      ) : (
        <>
          {showForm ? (
            <div className="form-container">
              <h2>Add New Location</h2>
              <LocationForm onSuccess={handleFormSuccess} />
              {locations.length > 0 && (
                <button 
                  onClick={() => setShowForm(false)} 
                  className="cancel-btn"
                >
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <button 
              onClick={() => setShowForm(true)} 
              className="add-location-btn"
            >
              Add Location
            </button>
          )}

          {locations.length > 0 && (
            <button onClick={handleExport} className="export-btn">
              Export All
            </button>
          )}

          {locations.length > 0 && (
            <div className="locations-list">
              <h2>Your Locations</h2>
              {locations.map((location) => (
                <div 
                  key={location.id} 
                  className="location-card"
                  onClick={() => setSelectedLocation(location)}
                >
                  <div className="location-header">
                    <h3>{location.location_name}</h3>
                    <button 
                      onClick={(e) => handleDelete(location.id, e)}
                      className="delete-btn"
                      title="Delete location"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="location-summary">
                    <div className="time-info">
                      <span className="current-time">
                        {locationTimes[location.id]?.time || "Loading..."}
                      </span>
                      <span className="time-of-day">
                        {locationTimes[location.id]?.timeOfDay || ""}
                      </span>
                    </div>
                    
                    {location.current_weather && location.current_weather.error ? (
                      <div className="weather-error">Weather unavailable</div>
                    ) : location.current_weather ? (
                      <div className="current-weather-summary">
                        <div className="temperature">
                          {Math.round(location.current_weather.temperature)}°C
                        </div>
                        <div className="description">
                          {location.current_weather.description}
                        </div>
                        <div className="details">
                          💧 {location.current_weather.humidity}% | 
                          💨 {location.current_weather.wind_speed} m/s
                        </div>
                      </div>
                    ) : (
                      <div className="weather-loading">Loading weather...</div>
                    )}
                  </div>
                  
                  <div className="click-hint">Click for detailed forecast →</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Home;