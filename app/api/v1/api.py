from fastapi import APIRouter
from app.api.v1.endpoints import auth, pomodoro

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(pomodoro.router, prefix="/pomodoro", tags=["pomodoro"]) 