# ---- Base image ----
FROM python:3.12-slim

# ---- Environment ----
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=1

# ---- System deps (minimal) ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
 && rm -rf /var/lib/apt/lists/*

# ---- Install uv ----
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:${PATH}"

# ---- Workdir ----
WORKDIR /app

# ---- Copy dependency files (if any) ----
# If your dependencies are inside app/
COPY app/requirements.txt ./requirements.txt

# If you use pyproject.toml instead, uncomment:
# COPY app/pyproject.toml app/uv.lock* ./

# ---- Install dependencies ----
RUN uv pip install --no-cache -r requirements.txt || true
# For pyproject.toml:
# RUN uv sync --no-dev

# ---- Copy application code ----
COPY app/ .

# ---- Expose port ----
EXPOSE 9001

# ---- Run app ----
CMD ["python", "main.py"]
