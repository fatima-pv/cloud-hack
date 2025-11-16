FROM python:3.9-slim

WORKDIR /app

# Install system dependencies (kept minimal)
RUN apt-get update && apt-get install -y build-essential curl && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only necessary files (not entire project)
COPY src/ ./src/

# Expose the port the app will run on
EXPOSE 80

# Health check for ECS/ALB
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

# Use gunicorn to run the Flask wrapper in src/server.py
CMD ["gunicorn", "--bind", "0.0.0.0:80", "src.server:app", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-"]
