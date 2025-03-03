import requests
from fastapi import FastAPI, HTTPException

app = FastAPI()

# GitHub raw URLs (update if necessary)
GITHUB_REPO = "https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/databones/"
BONESETS_JSON_URL = GITHUB_REPO + "json/bonesets.json"
BONES_JSON_URL = GITHUB_REPO + "json/bones.json"

# Helper function to fetch JSON from GitHub
def fetch_json(url):
    response = requests.get(url)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data from {url}")
    return response.json()

@app.get("/")
def home():
    return {"message": "Welcome to the Boneset API (GitHub-Integrated)"}

@app.get("/bonesets/{boneset_id}")
def get_boneset(boneset_id: str):
    """Fetch boneset details from GitHub"""
    bonesets = fetch_json(BONESETS_JSON_URL)
    
    if boneset_id not in bonesets:
        raise HTTPException(status_code=404, detail="Boneset not found")
    
    return {
        "id": bonesets[boneset_id]["id"],
        "name": bonesets[boneset_id]["name"],
        "description": bonesets[boneset_id]["description"],
        "bones": bonesets[boneset_id]["bones"]
    }

@app.get("/bones/{bone_id}")
def get_bone(bone_id: str):
    """Fetch bone details from GitHub"""
    bones = fetch_json(BONES_JSON_URL)

    if bone_id not in bones:
        raise HTTPException(status_code=404, detail="Bone not found")

    return {
        "id": bones[bone_id]["id"],
        "name": bones[bone_id]["name"],
        "description": bones[bone_id]["description"],
        "sub_bones": bones[bone_id]["sub_bones"]
    }
