import flask
import cv2
import os
from werkzeug.utils import secure_filename
from flask_cors import CORS
from threading import Thread

app = flask.Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

UPLOAD_FOLDER = "static/uploads"
FRAME_FOLDER = "static/frames"

# Ensure folders exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(FRAME_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Video processing state
frame_data = {"frames": [], "processing": False}

def extract_frames(video_path):
    frame_data["processing"] = True
    frame_data["frames"] = []
    vidcap = cv2.VideoCapture(video_path)
    success, frame = vidcap.read()
    count = 0

    while success:
        frame_path = os.path.join(FRAME_FOLDER, f"frame_{count}.jpg")
        cv2.imwrite(frame_path, frame)
        frame_data["frames"].append(f"/{frame_path}")
        count += 1
        success, frame = vidcap.read()

    vidcap.release()
    frame_data["processing"] = False

@app.route("/")
def index():
    return flask.render_template("index.html")

@app.route("/upload", methods=["POST"])
def upload_video():
    file = flask.request.files.get("video")
    if file:
        filename = secure_filename(file.filename)
        video_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(video_path)

        # Start frame extraction in a background thread
        thread = Thread(target=extract_frames, args=(video_path,))
        thread.start()

        return flask.jsonify({"message": "Video uploaded successfully!", "frames": frame_data["frames"]}), 200
    return flask.jsonify({"error": "No file uploaded!"}), 400

@app.route("/get_frames", methods=["GET"])
def get_frames():
    return flask.jsonify(frame_data)

@app.route("/download_frames", methods=["GET"])
def download_frames():
    # Create a ZIP of the frames
    zip_path = os.path.join(FRAME_FOLDER, "frames.zip")
    os.system(f"zip -r {zip_path} {FRAME_FOLDER}")
    return flask.send_file(zip_path, as_attachment=True)

if __name__ == "__main__":
    app.run(debug=True)