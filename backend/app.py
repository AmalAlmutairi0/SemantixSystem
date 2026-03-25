from flask import Flask, request, jsonify
from flask_cors import CORS
from schema import clean_data
from validation import check_data

app = Flask(__name__)
CORS(app)

@app.route("/validate-response", methods=["POST"])
def validate_response():
    data = request.get_json() or {}
    ok, row_or_err = clean_data(data)

    if not ok:
        return jsonify({
            "has_issues": True,
            "issues": row_or_err,
            "quality_score": 0.2,
            "source": "input",
            "llm_error": ""
        }), 200

    issues, score, source, llm_error = check_data(row_or_err)

    return jsonify({
        "has_issues": len(issues) > 0,
        "issues": issues,
        "quality_score": score,
        "source": source,
        "llm_error": llm_error
    }), 200

@app.route("/submit", methods=["POST"])
def submit():
    return jsonify({"ok": True}), 200

if __name__ == "__main__":
    app.run(debug=True)
