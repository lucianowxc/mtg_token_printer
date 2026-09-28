"""
ThermerLayout: Converts MTG token data to JSON format compatible with Thermer iOS app.

Thermer type definitions:
- 0: text
- 1: image
- 2: barcode
- 3: QR code

Align: 0=left, 1=center, 2=right
Format: 0=normal, 1=double height, 2=double height+width, 3=double width, 4=small
"""

import os


class ThermerLayout:
    def __init__(self):
        pass

    def generate_token_json(
        self,
        name,
        type_line,
        rules_text=None,
        flavor_text=None,
        pt=None,
        mana_cost=None,
        mana_value=None,
        scryfall_uri=None,
    ):
        """
        Generates a Thermer-compatible JSON array for printing a Magic token.
        Returns list of objects with type, content, align, bold, format, etc.
        """
        output = []

        # --- Divider line at top
        output.append(
            {
                "type": 0,
                "content": "=" * 32,
                "bold": 0,
                "align": 1,
                "format": 0,
            }
        )

        # --- Custom Icon (if exists locally)
        icon_filename = f"icons/{name.lower().replace(' ', '_')}.png"
        if os.path.exists(icon_filename):
            output.append(
                {
                    "type": 1,  # image
                    "path": icon_filename,  # local path or URL
                    "align": 1,  # center
                }
            )

        # --- QR Code to Scryfall
        if scryfall_uri:
            output.append(
                {
                    "type": 3,  # QR code
                    "value": scryfall_uri,
                    "size": 60,  # mm
                    "align": 2,  # right
                }
            )

        # --- Card Name (large, bold, centered)
        output.append(
            {
                "type": 0,
                "content": f"NAME: {name.upper()}",
                "bold": 1,
                "align": 0,  # left
                "format": 0,
            }
        )

        # --- Mana Cost
        if mana_cost or mana_value is not None:
            cost_string = (
                f"{mana_cost} (MV: {mana_value})"
                if mana_cost
                else f"MV: {mana_value}"
            )
            output.append(
                {
                    "type": 0,
                    "content": f"MANA: {cost_string}",
                    "bold": 1,
                    "align": 0,
                    "format": 0,
                }
            )

        # --- Type Line
        output.append(
            {
                "type": 0,
                "content": f"TYPE: {type_line}",
                "bold": 1,
                "align": 0,
                "format": 0,
            }
        )

        # --- Divider
        output.append(
            {
                "type": 0,
                "content": "-" * 32,
                "bold": 0,
                "align": 1,
                "format": 0,
            }
        )

        # --- Rules Text
        if rules_text:
            output.append(
                {
                    "type": 0,
                    "content": rules_text,
                    "bold": 0,
                    "align": 0,
                    "format": 0,
                }
            )
            output.append(
                {
                    "type": 0,
                    "content": "-" * 32,
                    "bold": 0,
                    "align": 1,
                    "format": 0,
                }
            )

        # --- Flavor Text (centered)
        if flavor_text:
            output.append(
                {
                    "type": 0,
                    "content": flavor_text,
                    "bold": 0,
                    "align": 1,
                    "format": 4,  # small
                }
            )
            output.append(
                {
                    "type": 0,
                    "content": "-" * 32,
                    "bold": 0,
                    "align": 1,
                    "format": 0,
                }
            )

        # --- Power/Toughness (if creature)
        if pt:
            output.append(
                {
                    "type": 0,
                    "content": f"[{pt}]",
                    "bold": 1,
                    "align": 2,  # right
                    "format": 3,  # double width
                }
            )

        # --- Divider at bottom
        output.append(
            {
                "type": 0,
                "content": "=" * 32,
                "bold": 0,
                "align": 1,
                "format": 0,
            }
        )

        # --- Empty lines for paper feed
        output.append(
            {
                "type": 0,
                "content": " ",
                "bold": 0,
                "align": 0,
                "format": 0,
            }
        )
        output.append(
            {
                "type": 0,
                "content": " ",
                "bold": 0,
                "align": 0,
                "format": 0,
            }
        )

        return output
