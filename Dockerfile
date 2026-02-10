# Use Python 3.12 slim image as base
FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_CACHE_DIR=/app/.uv-cache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Essential build tools
    build-essential \
    # Required for psycopg2 and asyncpg
    libpq-dev \
    # Required for some Python packages
    curl \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Set work directory
WORKDIR /app

# Copy uv configuration files
COPY pyproject.toml uv.lock .python-version ./

# Install dependencies with uv
RUN uv sync --frozen --no-dev

# Copy only the necessary application code
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./

# Create a non-root user
RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 --gid 1001 appuser

# Change ownership of the app directory and create cache directory
RUN chown -R appuser:appuser /app && \
    mkdir -p /app/.uv-cache && \
    chown -R appuser:appuser /app/.uv-cache

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Run the application (single worker to stay within low-memory Fly tiers)
CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
