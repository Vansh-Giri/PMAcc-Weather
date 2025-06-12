from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Location(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    location_name = Column(String, index=True, nullable=False)
    country = Column(String, default="Auto-detected")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Relationship to weather data
    weather_data = relationship("WeatherData", back_populates="location", cascade="all, delete-orphan")

class WeatherData(Base):
    __tablename__ = "weather_data"
    
    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"))
    date = Column(Date)
    temperature = Column(Float)
    description = Column(String)
    humidity = Column(Float, nullable=True)
    wind_speed = Column(Float, nullable=True)
    
    # Relationship back to location
    location = relationship("Location", back_populates="weather_data")
