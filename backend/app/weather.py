import os
import requests
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

API_KEY = os.getenv("WEATHER_API_KEY")
BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"

def get_weather(location):
    """Get current weather for a location"""
    params = {
        'appid': API_KEY,
        'units': 'metric'
    }
    
    if ',' in location:
        lat, lon = location.split(',')
        params['lat'] = lat.strip()
        params['lon'] = lon.strip()
    else:
        params['q'] = location

    response = requests.get(BASE_URL, params=params)
    data = response.json()

    if response.status_code != 200:
        return {"error": data.get("message", "Could not fetch weather")}
    
    return {
        "location": data["name"],
        "temperature": data["main"]["temp"],
        "description": data["weather"][0]["description"],
        "humidity": data["main"]["humidity"],
        "wind_speed": data["wind"]["speed"]
    }

def get_weather_data(location: str):
    """Get 5-day forecast for a location"""
    params = {
        "appid": API_KEY,
        "units": "metric"
    }

    if ',' in location:
        lat, lon = location.split(',')
        params['lat'] = lat.strip()
        params['lon'] = lon.strip()
    else:
        params['q'] = location

    response = requests.get(FORECAST_URL, params=params)
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Error fetching forecast data")

    data = response.json()

    # Grab every 8th item to get daily forecasts from 3-hour interval list
    forecast = [data["list"][i] for i in range(0, len(data["list"]), 8)][:5]
    formatted = [
        {
            "date": item["dt_txt"],
            "temperature": item["main"]["temp"],
            "description": item["weather"][0]["description"],
            "icon": item["weather"][0]["icon"],
        }
        for item in forecast
    ]
    return {"location": data["city"]["name"], "forecast": formatted}
