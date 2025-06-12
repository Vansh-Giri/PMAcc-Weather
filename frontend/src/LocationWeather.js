import React, { useEffect, useState, useCallback } from "react";
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { getProfileWeather } from "./api";

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '15px'
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

function LocationWeather({ location, onBack }) {
  const [weatherData, setWeatherData] = useState(null);
  const [countryData, setCountryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
  const [mapKey, setMapKey] = useState(0); // Add this for forcing re-render
  const [mapError, setMapError] = useState(false);

  const fetchCountryFromCoordinates = useCallback(async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lng}&limit=1&appid=${process.env.REACT_APP_WEATHER_API_KEY}`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const countryCode = data[0].country;
        await fetchCountryDataByCode(countryCode);
      }
    } catch (error) {
      console.error("Error getting country from coordinates:", error);
    }
  }, []);

  const geocodeLocationAndGetCountry = useCallback(async () => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location.location_name)}&limit=1&appid=${process.env.REACT_APP_WEATHER_API_KEY}`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon, country } = data[0];
        setMapCenter({ lat, lng: lon });
        setMapKey(prev => prev + 1); // Force map re-render
        await fetchCountryDataByCode(country);
      }
    } catch (error) {
      console.error("Error geocoding location:", error);
    }
  }, [location.location_name]);

  const fetchCountryDataByCode = useCallback(async (countryCode) => {
    try {
      const response = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`);
      if (response.ok) {
        const data = await response.json();
        setCountryData(data[0]);
      }
    } catch (error) {
      console.error("Error fetching country data:", error);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setMapError(false); // Reset map error state
    try {
      // Fetch weather data
      const weatherRes = await getProfileWeather(location.id);
      setWeatherData(weatherRes.data);

      // Set map coordinates and force map re-render
      if (location.latitude && location.longitude) {
        const lat = parseFloat(location.latitude);
        const lng = parseFloat(location.longitude);
        setMapCenter({ lat, lng });
        setMapKey(prev => prev + 1); // Force map re-render
        console.log("Setting map center to:", { lat, lng });
        
        // Get country from coordinates using reverse geocoding
        await fetchCountryFromCoordinates(lat, lng);
      } else {
        // Geocode location name to get coordinates and country
        await geocodeLocationAndGetCountry();
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  }, [location.id, location.latitude, location.longitude, fetchCountryFromCoordinates, geocodeLocationAndGetCountry]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const getWeatherIcon = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  const onMapLoad = useCallback((map) => {
    console.log("Map loaded for location:", location.location_name);
    // Center the map on the correct location
    map.setCenter(mapCenter);
  }, [mapCenter, location.location_name]);


  const onLoadScriptLoad = useCallback(() => {
    console.log("LoadScript loaded for location:", location.location_name);
  }, [location.location_name]);

  const onLoadScriptError = useCallback(() => {
    console.error("LoadScript error for location:", location.location_name);
    setMapError(true);
  }, [location.location_name]);

  if (loading) {
    return (
      <div className="weather-detail">
        <button onClick={onBack} className="back-btn">← Back to Locations</button>
        <div className="loading">Loading detailed information...</div>
      </div>
    );
  }

  return (
    <div className="weather-detail">
      <button onClick={onBack} className="back-btn">← Back to Locations</button>
      
      <h2>{location.location_name} Details</h2>
      
      {/* Country Information Section */}
      {countryData && (
        <div className="country-info-section">
          <h3>Country Information</h3>
          <div className="country-info-card">
            <div className="country-header">
              <img 
                src={countryData.flags?.png} 
                alt={`${countryData.name?.common} flag`}
                className="country-flag-large"
              />
              <div className="country-basic-info">
                <h4>{countryData.name?.common}</h4>
                <p className="country-official-name">{countryData.name?.official}</p>
              </div>
            </div>
            
            <div className="country-details-grid">
              <div className="country-detail-item">
                <span className="label">Population:</span>
                <span className="value">{formatNumber(countryData.population)}</span>
              </div>
              <div className="country-detail-item">
                <span className="label">Region:</span>
                <span className="value">{countryData.region}</span>
              </div>
              <div className="country-detail-item">
                <span className="label">Subregion:</span>
                <span className="value">{countryData.subregion}</span>
              </div>
              <div className="country-detail-item">
                <span className="label">Capital:</span>
                <span className="value">{countryData.capital?.[0]}</span>
              </div>
              <div className="country-detail-item">
                <span className="label">Languages:</span>
                <span className="value">
                  {countryData.languages ? Object.values(countryData.languages).join(', ') : 'N/A'}
                </span>
              </div>
              <div className="country-detail-item">
                <span className="label">Currencies:</span>
                <span className="value">
                  {countryData.currencies ? 
                    Object.values(countryData.currencies).map(curr => curr.name).join(', ') : 'N/A'}
                </span>
              </div>
              <div className="country-detail-item">
                <span className="label">Area:</span>
                <span className="value">{formatNumber(countryData.area)} km²</span>
              </div>
              <div className="country-detail-item">
                <span className="label">Timezone:</span>
                <span className="value">{countryData.timezones?.[0]}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Maps Section with Unique Key */}
      <div className="map-section">
        <h3>Location on Map</h3>
        <div className="map-container">
          {!process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? (
            <div className="map-error">
              <h4>Google Maps API Key Missing</h4>
              <p>Please add REACT_APP_GOOGLE_MAPS_API_KEY to your .env file.</p>
              <p>Get your API key from: <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></p>
            </div>
          ) : mapError ? (
            <div className="map-error">
              <h4>Map Loading Error</h4>
              <p>Failed to load Google Maps. Please check your API key and internet connection.</p>
              <button onClick={() => window.location.reload()}>Reload Page</button>
            </div>
          ) : (
            <LoadScript 
              key={`map-${location.id}-${mapKey}`} // Unique key for each location
              googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
              onLoad={onLoadScriptLoad}
              onError={onLoadScriptError}
              loadingElement={
                <div style={{ 
                  height: '400px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '15px'
                }}>
                  <div>
                    <div>Loading Maps for {location.location_name}...</div>
                    <small>Lat: {mapCenter.lat}, Lng: {mapCenter.lng}</small>
                  </div>
                </div>
              }
            >
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={12}
                options={mapOptions}
                onLoad={onMapLoad}
              >
                <Marker 
                  position={mapCenter} 
                  title={location.location_name}
                />
              </GoogleMap>
            </LoadScript>
          )}
        </div>
      </div>

      {/* Weather Information */}
      {weatherData ? (
        <>
          <div className="current-weather-detail">
            <h3>Current Weather</h3>
            {weatherData.current_weather && !weatherData.current_weather.error ? (
              <div className="current-weather-card">
                <div className="main-temp">
                  {Math.round(weatherData.current_weather.temperature)}°C
                </div>
                <div className="weather-info">
                  <div className="description">
                    {weatherData.current_weather.description}
                  </div>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="label">Humidity</span>
                      <span className="value"><span role="img" aria-label="water drop">💧</span> {weatherData.current_weather.humidity}%</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Wind Speed</span>
                      <span className="value"><span role="img" aria-label="wind">💨</span> {weatherData.current_weather.wind_speed} m/s</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Location</span>
                      <span className="value"><span role="img" aria-label="location pin">📍</span> {weatherData.current_weather.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="weather-error">Current weather data unavailable</div>
            )}
          </div>

          <div className="forecast-detail">
            <h3>5-Day Forecast</h3>
            {weatherData.forecast && weatherData.forecast.length > 0 ? (
              <div className="forecast-grid">
                {weatherData.forecast.map((day, idx) => (
                  <div key={idx} className="forecast-card">
                    <div className="forecast-date">
                      {formatDate(day.date)}
                    </div>
                    <div className="forecast-time">
                      {formatTime(day.date)}
                    </div>
                    <img 
                      src={getWeatherIcon(day.icon)} 
                      alt={day.description}
                      className="forecast-icon-large"
                    />
                    <div className="forecast-temp-large">
                      {Math.round(day.temperature)}°C
                    </div>
                    <div className="forecast-description">
                      {day.description}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="forecast-error">5-day forecast unavailable</div>
            )}
          </div>
        </>
      ) : (
        <div className="weather-error">Weather data unavailable</div>
      )}
    </div>
  );
}

export default LocationWeather;
