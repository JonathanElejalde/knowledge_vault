from fastapi import APIRouter
from app.api.v1.endpoints import auth, pomodoro, learning_projects

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(pomodoro.router, prefix="/pomodoro", tags=["Pomodoro & Sessions"])
api_router.include_router(learning_projects.router, prefix="/learning-projects", tags=["Learning Projects"]) 