from quart import Quart, jsonify

app = Quart(__name__)

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>", methods=["GET", "POST"])
async def handle_api_request(path):
    # This API is no longer in use.
    # The TTS logic has been moved to the frontend using Puter.js.
    return jsonify({
        "message": "API is deprecated. Please use the frontend application.",
        "status": "ok"
    }), 200
