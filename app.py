import json
import os
import uuid
from datetime import datetime
from pathlib import Path

import gspread
from flask import Flask, abort, jsonify, redirect, request, send_from_directory

BASE = Path(__file__).parent
DEPARTMENTS = ["IT", "RE", "RH", "ORGANISATION", "COMMUNICATION"]
HEADERS = ["ID", "Date", "Name", "Department", "Registrar"]
DEFAULT_REGISTRAR = "Host / Organisateur"
STATIC_EXTENSIONS = {".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".svg", ".webp", ".ico"}

# Required environment variables (set in Railway):
#   GOOGLE_SHEET_ID              - the ID from the sheet's URL
#   GOOGLE_SERVICE_ACCOUNT_JSON  - full JSON content of the service account key
SHEET_ID = os.environ.get("GOOGLE_SHEET_ID", "")
SERVICE_ACCOUNT_JSON = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "")

app = Flask(__name__)
_worksheet = None


def get_worksheet():
    """Connect once and reuse the worksheet; ensure the header row exists."""
    global _worksheet
    if _worksheet is None:
        if not SHEET_ID or not SERVICE_ACCOUNT_JSON:
            raise RuntimeError("GOOGLE_SHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON must be set.")
        client = gspread.service_account_from_dict(json.loads(SERVICE_ACCOUNT_JSON))
        ws = client.open_by_key(SHEET_ID).sheet1
        if ws.row_values(1) != HEADERS:
            ws.update(range_name="A1", values=[HEADERS])
        _worksheet = ws
    return _worksheet


@app.route("/")
def index():
    return send_from_directory(BASE, "index.html")


@app.route("/<path:filename>")
def frontend_file(filename):
    """Serve frontend assets from the project root, never backend code."""
    path = BASE / filename
    if path.suffix.lower() not in STATIC_EXTENSIONS or not path.is_file():
        abort(404)
    return send_from_directory(BASE, filename)


@app.route("/api/departments")
def departments():
    return jsonify(DEPARTMENTS)


@app.route("/api/members")
def members():
    try:
        rows = get_worksheet().get_all_records()
    except Exception as exc:
        app.logger.exception("Sheet read failed")
        return jsonify(error="Erreur lecture base de données"), 500
    members = [
        {
            "id": r.get("ID"),
            "date": r.get("Date"),
            "name": r.get("Name"),
            "department": r.get("Department"),
            "registrar": r.get("Registrar") or "Host",
        }
        for r in rows
        if r.get("ID")
    ]
    return jsonify(list(reversed(members)))


@app.route("/api/database/download")
def download_database():
    # The live data is in Google Sheets: send the user to the sheet itself.
    if not SHEET_ID:
        return jsonify(error="Base de données non configurée"), 404
    return redirect(f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit")


@app.route("/api/badges", methods=["POST"])
def create_badge():
    name = (request.form.get("name") or "").strip()
    department = (request.form.get("department") or "").strip()
    registrar = (request.form.get("registrar") or DEFAULT_REGISTRAR).strip()

    if not name:
        return jsonify(error="Le nom est obligatoire."), 400
    if department not in DEPARTMENTS:
        return jsonify(error="Département invalide."), 400

    badge_id = uuid.uuid4().hex[:8].upper()
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    try:
        get_worksheet().append_row(
            [badge_id, now, name, department, registrar],
            value_input_option="USER_ENTERED",
        )
    except Exception:
        app.logger.exception("Sheet write failed")
        return jsonify(error="Impossible d'enregistrer dans la base de données."), 500

    return jsonify(
        id=badge_id,
        displayId=f"ECO-{badge_id}",
        name=name,
        department=department,
        registrar=registrar,
        issuedAt=now,
    )


if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
