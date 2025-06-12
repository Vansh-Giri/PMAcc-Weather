from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import date, datetime
import csv
import io
import os
from app.database import engine, Base, get_db
from app.models import Location, WeatherData
from app.weather import get_weather, get_weather_data
import json
from fastapi import Response
from datetime import datetime


# Initialize FastAPI and create tables
app = FastAPI()
Base.metadata.create_all(bind=engine)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic schemas - Keep it simple
class LocationCreate(BaseModel):
    location_name: str
    country: str = "Auto-detected"
    latitude: float | None = None
    longitude: float | None = None

class LocationResponse(BaseModel):
    id: int
    location_name: str
    country: str
    latitude: float | None = None
    longitude: float | None = None
    current_weather: dict | None = None
    
    class Config:
        orm_mode = True

# CRUD Endpoints - Simplified
@app.post("/profiles/", response_model=LocationResponse)
def create_location(location: LocationCreate, db: Session = Depends(get_db)):
    try:
        print(f"Creating location: {location.dict()}")  # Debug log
        
        # Create location with minimal data
        db_location = Location(
            location_name=location.location_name,
            country=location.country,
            latitude=location.latitude,
            longitude=location.longitude
        )
        db.add(db_location)
        db.commit()
        db.refresh(db_location)
        
        print(f"Location created successfully: {db_location.id}")  # Debug log
        
        # Try to fetch and store current weather data (don't fail if this fails)
        try:
            # Use coordinates if available, otherwise use location name
            if location.latitude and location.longitude:
                location_query = f"{location.latitude},{location.longitude}"
            else:
                location_query = location.location_name
                
            weather_info = get_weather(location_query)
            if 'error' not in weather_info:
                weather_data = WeatherData(
                    location_id=db_location.id,
                    date=datetime.now().date(),
                    temperature=weather_info.get('temperature'),
                    description=weather_info.get('description'),
                    humidity=weather_info.get('humidity'),
                    wind_speed=weather_info.get('wind_speed')
                )
                db.add(weather_data)
                db.commit()
                print("Weather data added successfully")
        except Exception as weather_error:
            print(f"Weather fetch error (non-critical): {weather_error}")
            # Don't fail location creation if weather fetch fails
            pass
            
        return db_location
        
    except Exception as e:
        db.rollback()
        print(f"Location creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create location: {str(e)}")

@app.get("/profiles/", response_model=List[LocationResponse])
def read_locations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        locations = db.query(Location).offset(skip).limit(limit).all()
        
        # Add current weather to each location
        for location in locations:
            try:
                # Use coordinates if available for weather data
                if location.latitude and location.longitude:
                    location_query = f"{location.latitude},{location.longitude}"
                else:
                    location_query = location.location_name
                    
                weather_info = get_weather(location_query)
                if 'error' not in weather_info:
                    location.current_weather = weather_info
            except:
                location.current_weather = None
        
        return locations
    except Exception as e:
        print(f"Error reading locations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/profiles/{location_id}", response_model=LocationResponse)
def read_location(location_id: int, db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location

@app.delete("/profiles/{location_id}")
def delete_location(location_id: int, db: Session = Depends(get_db)):
    try:
        location = db.query(Location).filter(Location.id == location_id).first()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        db.delete(location)
        db.commit()
        return {"message": "Location deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete location: {str(e)}")

# Weather endpoints
@app.get("/weather")
def weather(location: str):
    try:
        return get_weather(location)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/forecast")
def forecast(location: str):
    try:
        return get_weather_data(location)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/profiles/{location_id}/weather")
def get_location_weather(location_id: int, db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    try:
        # Use coordinates if available, otherwise use location name
        if location.latitude and location.longitude:
            location_query = f"{location.latitude},{location.longitude}"
        else:
            location_query = location.location_name
            
        current_weather = get_weather(location_query)
        forecast_data = get_weather_data(location_query)
        
        return {
            "current_weather": current_weather,
            "forecast": forecast_data.get("forecast", [])
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# CSV Export Endpoint
@app.get("/export")
def export_locations_with_weather(db: Session = Depends(get_db)):
    try:
        locations = db.query(Location).all()
        export_data = []
        
        for location in locations:
            try:
                # Use coordinates if available, otherwise use location name
                if location.latitude and location.longitude:
                    location_query = f"{location.latitude},{location.longitude}"
                else:
                    location_query = location.location_name
                
                # Fetch weather data
                weather_info = get_weather(location_query)
                
                # Create export entry with weather data
                location_data = {
                    "id": location.id,
                    "name": location.location_name,
                    "country": location.country,
                    "lat": location.latitude,
                    "lng": location.longitude,
                    "weather": weather_info if 'error' not in weather_info else {"error": "Weather data unavailable"},
                    "export_date": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
                
                export_data.append(location_data)
                print(f"Successfully fetched weather for: {location.location_name}")
                
            except Exception as e:
                print(f"Error fetching weather for {location.location_name}: {e}")
                # Add location even if weather fetch fails
                export_data.append({
                    "id": location.id,
                    "name": location.location_name,
                    "country": location.country,
                    "lat": location.latitude,
                    "lng": location.longitude,
                    "weather": {"error": f"Failed to fetch weather: {str(e)}"},
                    "export_date": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                })
        
        # Return as JSON with weather data included
        return {
            "locations": export_data, 
            "count": len(export_data),
            "export_timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
    except Exception as e:
        print(f"Export error: {e}")
        return {"error": str(e)}




@app.get("/test-export")
def test_export():
    return {"message": "Test export works"}

@app.get("/")
def root():
    return {"message": "API is working"}

@app.get("/debug/routes")
def list_routes():
    routes = []
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods)
            })
    return {"routes": routes}
