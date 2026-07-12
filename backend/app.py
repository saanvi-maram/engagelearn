from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def calculate_engagement(data):
    time_spent = data.get("timeSpent", 0)
    clicks = data.get("clicks", 0)
    scroll = data.get("scrollDepth", 0)
    interactions = data.get("interactions", 0)

    score = (
        (time_spent * 0.2) +
        (clicks * 5) +
        (scroll * 0.3) +
        (interactions * 4)
    )

    return min(100, round(score, 2))

@app.route("/engagement", methods=["POST"])
def engagement():
    data = request.json
    return jsonify({
        "engagementScore": calculate_engagement(data)
    })

if __name__ == "__main__":
    app.run(debug=True)