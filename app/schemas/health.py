from pydantic import BaseModel


class HealthCheck(BaseModel):
    """Health check response model."""
    status: bool
    message: str 