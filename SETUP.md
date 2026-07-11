# MovieLens Project Setup

This project is structured for a production-quality movie recommendation system using Python, FastAPI, NLP, and the TMDB 5000 dataset.

Recommendation logic is intentionally not implemented yet.

## Create a Virtual Environment

From the project root:

```bash
python3 -m venv .venv
```

Activate it:

```bash
source .venv/bin/activate
```

On Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

## Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

## Folder Structure

```text
backend/
  app/
    api/
    services/
    models/
    utils/
  data/
  models/
notebooks/
```

## Folder Purpose

- `backend/`: Backend application root for the FastAPI service, data assets, and trained model artifacts.
- `backend/app/`: Main Python application package.
- `backend/app/api/`: API route definitions and request/response endpoint wiring.
- `backend/app/services/`: Business logic layer for recommendation workflows, data processing, and orchestration.
- `backend/app/models/`: Python data models, schemas, and domain objects used by the API and services.
- `backend/app/utils/`: Shared helper functions such as text preprocessing utilities, configuration loading, and reusable validation helpers.
- `backend/data/`: Local storage for raw or processed TMDB 5000 dataset files. Data files are ignored by Git by default.
- `backend/models/`: Local storage for generated vectorizers, embeddings, similarity matrices, or trained artifacts. Model artifacts are ignored by Git by default.
- `notebooks/`: Exploratory analysis, experiments, and prototyping notebooks.

