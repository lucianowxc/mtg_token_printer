import os
from src.base_printer import BasePrinter

class MTGTokenLayout(BasePrinter):
    def __init__(self, devfile="/dev/rfcomm0", baudrate=9600):
        super().__init__(devfile, baudrate)

    def generate_token_receipt(self, name, type_line, rules_text=None, flavor_text=None, pt=None, mana_cost=None, mana_value=None, scryfall_uri=None):
        if not self.printer:
            print("Cannot print: Hardware interface not initialized.")
            return
            
        print(f"Printing frame for: {name}...")
        try:
            self.draw_divider("=")
            
            # --- NEW: Local Custom Icon Check ---
            # Looks for a local file named matching the card type inside an 'icons' folder
            # For example: icons/treasure.png or icons/zombie.png
            icon_filename = f"icons/{name.lower().replace(' ', '_')}.png"
            if os.path.exists(icon_filename):
                # Size 96x96 pixels looks gorgeous right above the title!
                self.print_pixel_art(icon_filename, size=96, dither=False)
            
            # Mini QR to the right side configuration
            if scryfall_uri:
                self.printer.set(align='right')
                self.printer.qr(scryfall_uri, size=2, native=True)
                
            self.printer.set(align='left', bold=True, width=1, height=1)
            self.printer.text(f" NAME: {name.upper()}\n")
            
            if mana_cost or mana_value is not None:
                cost_string = f"{mana_cost} (MV: {mana_value})" if mana_cost else f"MV: {mana_value}"
                self.printer.text(f" MANA: {cost_string}\n")
                
            self.printer.text(f" TYPE: {type_line}\n")
            self.draw_divider("-")
            
            if rules_text:
                self.print_wrapped_body(rules_text, align='left')
                self.draw_divider("-")
                
            if flavor_text:
                self.print_wrapped_body(flavor_text, align='center')
                self.draw_divider("-")
                
            if pt:
                self.print_aligned_stats(pt)
                
            self.draw_divider("=")
            self.feed_and_finish()
            
        except OSError as e:
            print(f"\n⚠️ Hardware Error mid-print: Link disconnected or timed out ({e})")
