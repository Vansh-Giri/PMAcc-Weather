import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Weather() {
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [error, setError] = useState('');

  const apiBase = process.env.REACT_APP_API_BASE_URL;

  const fetchWeather = async () => {
    try {
      const res = await axios.get(`${apiBase}/weather`, {
        params: { location }
      });
      setWeather(res.data);
      setForecast([]);
      setError('');
    } catch (err) {
      setWeather(null);
      setError(err.response?.data?.error || 'Error fetching weather data');
    }
  };

  const fetchForecast = async () => {
    try {
      const res = await axios.get(`${apiBase}/forecast`, {
        params: { location }
      });
      setForecast(res.data.forecast);
      setWeather(null);
      setError('');
    } catch (err) {
      setForecast([]);
      setError(err.response?.data?.error || 'Error fetching forecast');
    }
  };

  const fetchByGeolocation = () => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
        setLocation(coords);
        try {
          const weatherRes = await axios.get(`${apiBase}/weather`, {
            params: { location: coords }
          });
          setWeather(weatherRes.data);

          const forecastRes = await axios.get(`${apiBase}/forecast`, {
            params: { location: coords }
          });
          setForecast(forecastRes.data.forecast);

          setError('');
        } catch (err) {
          setError(err.response?.data?.error || 'Location-based fetch failed');
        }
      },
      (err) => {
        setError('Geolocation error');
      }
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Weather App</h2>

      <input
        type="text"
        placeholder="Enter location (e.g. Delhi or 28.6,77.2)"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <div style={{ marginTop: '0.5rem' }}>
        <button onClick={fetchWeather}>Get Weather</button>
        <button onClick={fetchForecast} style={{ marginLeft: '1rem' }}>
          5-Day Forecast
        </button>
        <button onClick={fetchByGeolocation} style={{ marginLeft: '1rem' }}>
          Use My Location
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {weather && (
        <div style={{ marginTop: '1rem' }}>
          <h3>{weather.location}</h3>
          <p>{weather.description}</p>
          <p>Temperature: {weather.temperature} °C</p>
          <p>Humidity: {weather.humidity}%</p>
          <p>Wind Speed: {weather.wind_speed} m/s</p>
        </div>
      )}

      {forecast.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3>5-Day Forecast</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {forecast.map((day) => (
              <div key={day.date} style={{ border: '1px solid #ccc', padding: '1rem' }}>
                <p><strong>{day.date}</strong></p>
                <img
                  src={`http://openweathermap.org/img/wn/${day.icon}@2x.png`}
                  alt={day.description}
                />
                <p>{day.description}</p>
                <p>{day.temperature} °C</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Weather;
