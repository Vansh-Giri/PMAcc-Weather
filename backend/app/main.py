from fastapi import FastAPI
from app.weather import get_weather

app = FastAPI()

@app.get("/")
def root():
    return {"msg": "Weather API is live!"}

@app.get("/weather")
def weather(city: str):
    return get_weather(city)
