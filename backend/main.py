from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from nn_controller import predict_angles


app = FastAPI(title="6DOF Robot Arm Neural IK Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IKRequest(BaseModel):
    target_position: list[float] = Field(..., min_length=3, max_length=3)
    target_quaternion: list[float] = Field(..., min_length=4, max_length=4)
    current_joint_angles: list[float] = Field(..., min_length=6, max_length=6)


@app.get("/")
def root():
    return {
        "status": "running",
        "message": "6DOF Neural IK backend is active",
    }


@app.post("/predict")
def predict(request: IKRequest):
    angles = predict_angles(
        target_position=request.target_position,
        target_quaternion=request.target_quaternion,
        current_joint_angles=request.current_joint_angles,
    )

    return {
        "predicted_joint_angles": {
            "j1": angles[0],
            "j2": angles[1],
            "j3": angles[2],
            "j4": angles[3],
            "j5": angles[4],
            "j6": angles[5],
        },
        "angles_array": angles,
    }
