# Base image with Python 3.9
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies (tesseract, poppler, build tools)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils \
    libgl1 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Upgrade pip + install dependencies
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Expose FastAPI port
EXPOSE 3000

# Start FastAPI app with Uvicorn
CMD ["uvicorn", "userapi:app", "--host", "0.0.0.0", "--port", "3000"]

