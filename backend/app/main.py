from fastapi import FastAPI
from app.weather import get_weather, get_weather_data
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

@app.get("/weather")
def read_weather(location: str):
    return get_weather(location)

@app.get("/forecast")
def get_forecast(location: str):
    return get_weather_data(location)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)