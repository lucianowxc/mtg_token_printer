"""
Web API for MTG Token Printer - Thermer Edition
Serves JSON payloads compatible with Thermer app (iOS & Android) for thermal printing.
"""

import json
import asyncio
from flask import Flask, jsonify, request, send_from_directory, render_template_string
from src.scryfall_fetcher import ScryfallFetcher
from src.archidekt_fetcher import ArchidektFetcher
from src.thermer_layout import ThermerLayout

app = Flask(__name__, static_folder=".")

# Initialize fetchers and layout
scryfall = ScryfallFetcher()
archidekt = ArchidektFetcher()
thermer_layout = ThermerLayout()


def run_async(coro):
    """Helper to run async functions in Flask context."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@app.route("/", methods=["GET"])
def home():
    """Serve the main HTML interface."""
    with open("index.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    return html_content, 200, {"Content-Type": "text/html; charset=utf-8"}


@app.route("/api/search", methods=["GET"])
def search_card():
    """
    Search for a card and return Thermer-compatible JSON for printing.
    Usage: /api/search?card=goblin
    """
    card_name = request.args.get("card", "").strip()

    if not card_name:
        return jsonify({"error": "Missing 'card' parameter"}), 400

    try:
        # Fetch card data asynchronously
        card_data = run_async(scryfall.fetch_card_data(card_name))

        if not card_data:
            return jsonify({"error": f"Card not found: {card_name}"}), 404

        # Generate Thermer JSON
        thermer_json = thermer_layout.generate_token_json(
            name=card_data["name"],
            type_line=card_data["type_line"],
            rules_text=card_data["rules_text"],
            flavor_text=card_data["flavor_text"],
            pt=card_data["pt"],
            mana_cost=card_data["mana_cost"],
            mana_value=card_data["mana_value"],
            scryfall_uri=card_data["scryfall_uri"],
        )

        return jsonify(thermer_json)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/preview", methods=["GET"])
def preview_card():
    """
    Preview card data without print formatting.
    Usage: /api/preview?card=goblin
    """
    card_name = request.args.get("card", "").strip()

    if not card_name:
        return jsonify({"error": "Missing 'card' parameter"}), 400

    try:
        card_data = run_async(scryfall.fetch_card_data(card_name))

        if not card_data:
            return jsonify({"error": f"Card not found: {card_name}"}), 404

        return jsonify(card_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/print", methods=["POST"])
def print_token():
    """
    Print a token.
    Receives card name in POST body: {"card": "goblin"}
    """
    data = request.get_json()

    if not data or "card" not in data:
        return jsonify({"error": "Missing 'card' in request body"}), 400

    card_name = data["card"].strip()

    try:
        card_data = run_async(scryfall.fetch_card_data(card_name))

        if not card_data:
            return jsonify({"error": f"Card not found: {card_name}"}), 404

        thermer_json = thermer_layout.generate_token_json(
            name=card_data["name"],
            type_line=card_data["type_line"],
            rules_text=card_data["rules_text"],
            flavor_text=card_data["flavor_text"],
            pt=card_data["pt"],
            mana_cost=card_data["mana_cost"],
            mana_value=card_data["mana_value"],
            scryfall_uri=card_data["scryfall_uri"],
        )

        return jsonify(
            {
                "status": "success",
                "message": f"Ready to print: {card_data['name']}",
                "print_data": thermer_json,
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/archidekt", methods=["GET"])
def archidekt_deck():
    """
    Fetch and prepare all tokens from an Archidekt decklist.
    Usage: /api/archidekt?url=https://archidekt.com/decks/...
    """
    deck_url = request.args.get("url", "").strip()

    if not deck_url:
        return jsonify({"error": "Missing 'url' parameter"}), 400

    try:
        tokens = run_async(archidekt.fetch_tokens_from_url(deck_url))

        if not tokens:
            return jsonify({"error": "No tokens found in decklist"}), 404

        # Return list of cards (not printing, just previewing)
        return jsonify({"token_count": len(tokens), "tokens": tokens})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # Run on 0.0.0.0 to allow access from other devices on the network
    app.run(host="0.0.0.0", port=5000, debug=True)
