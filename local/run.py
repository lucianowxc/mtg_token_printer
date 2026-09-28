import asyncio
from src.archidekt_fetcher import ArchidektFetcher
from src.scryfall_fetcher import ScryfallFetcher
from src.mtg_layout import MTGTokenLayout

async def process_and_print_token(search_term, fetcher, printer_layout):
    """Encapsulates the standalone print pipeline workflow frame."""
    card_data = await fetcher.fetch_card_data(search_term)
    if card_data:
        printer_layout.generate_token_receipt(
            name=card_data["name"],
            type_line=card_data["type_line"],
            rules_text=card_data["rules_text"],
            flavor_text=card_data["flavor_text"],
            pt=card_data["pt"],
            mana_cost=card_data["mana_cost"],
            mana_value=card_data["mana_value"],
            scryfall_uri=card_data["scryfall_uri"]
        )
        return True
    else:
        print(f"Could not retrieve info for: '{search_term}'")
        return False

async def main():
    archidekt = ArchidektFetcher()
    scryfall = ScryfallFetcher()
    printer_layout = MTGTokenLayout(devfile="/dev/rfcomm0")
    
    if not printer_layout.printer:
        print("Exiting loop. Ensure device is powered on and bound to /dev/rfcomm0.")
        return

    print("\n🔮 MTG Instant Receipt Deck Token Engine Active!")
    print("-> Paste an Archidekt link to print all tokens at once.")
    print("-> Or just type a single card name normally to query it.")
    print("Type 'exit' to quit.\n")
    
    while True:
        try:
            user_input = input("Enter card name OR Archidekt URL: ").strip()
            
            if user_input.lower() in ['exit', 'quit']:
                print("Closing generation deck. Goodbye!")
                break
            if not user_input:
                continue

            # Route A: Check if input string is an Archidekt reference link
            if "archidekt.com" in user_input.lower() or (user_input.isdigit() and len(user_input) > 4):
                token_queue = archidekt.get_deck_token_names(user_input)
                
                if not token_queue:
                    print("No tokens found or deck is set to private.")
                    continue
                    
                print("\n🚀 Starting automated batch print queue! Stay clear of the paper track...")
                for token_name in token_queue:
                    await process_and_print_token(token_name, scryfall, printer_layout)
                    # Safe padding interval delay so the printer buffer stays healthy
                    await asyncio.sleep(0.4)
                print("🏁 Finished batch deck list print processing!\n")
            
            # Route B: Process standard standalone lookup requests
            else:
                await process_and_print_token(user_input, scryfall, printer_layout)
                await asyncio.sleep(0.1)
            
        except KeyboardInterrupt:
            print("\nExiting loop gracefully via command signal.")
            break
        except Exception as e:
            print(f"An unexpected loop breakdown occurred: {e}")
            
    printer_layout.safe_close()

if __name__ == "__main__":
    asyncio.run(main())
