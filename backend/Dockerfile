FROM python:3.12

# prevents python creating .pyc files
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN pip install uv

# Copy the project into the image
ADD . /app

ENV PATH="/root/.local/bin/:$PATH"
# Sync the project into a new environment, using the frozen lockfile
WORKDIR /app
RUN uv sync --frozen
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
