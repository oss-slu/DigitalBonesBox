import requests
from fastapi import FastAPI, HTTPException

app = FastAPI()

# GitHub raw URLs for JSON files
GITHUB_REPO = "https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/"
BONESET_JSON_URL = GITHUB_REPO + "boneset/bony_pelvis.json"
BONES_DIR_URL = GITHUB_REPO + "bones/"  # Directory for individual bone JSON files

# Helper function to fetch JSON from GitHub
def fetch_json(url):
    response = requests.get(url)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data from {url}")
    return response.json()

@app.get("/")
def home():
    return {"message": "Welcome to the Boneset API (GitHub-Integrated)"}

@app.get("/boneset")
def get_boneset():
    """Fetch bony pelvis details from GitHub"""
    return fetch_json(BONESET_JSON_URL)

@app.get("/bones/{bone_id}")
def get_bone(bone_id: str):
    """Fetch a specific bone's details from GitHub"""
    bone_json_url = BONES_DIR_URL + f"{bone_id}.json"
    return fetch_json(bone_json_url)
