import requests
import json
import re

class ArchidektFetcher:
    def __init__(self):
        # Explicit headers to ensure our request looks like a standard browser request
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json"
        }

    def extract_deck_id(self, url_or_id):
        if url_or_id.isdigit():
            return url_or_id
        match = re.search(r'/decks/(\d+)', url_or_id)
        if match:
            return match.group(1)
        return None

    def get_deck_token_names(self, deck_url_or_id):
        """Uses requests to query Archidekt and parses card descriptions for required tokens."""
        deck_id = self.extract_deck_id(deck_url_or_id)
        if not deck_id:
            print("❌ Invalid Archidekt URL or Deck ID provided.")
            return []
            
        api_url = f"https://archidekt.com{deck_id}/"
        
        try:
            print(f"Connecting to Archidekt for Deck #{deck_id} using requests connection module...")
            # Using requests bypasses urllib's network name resolution errors completely
            response = requests.get(api_url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                payload = response.json()
                cards_list = payload.get("cards", [])
                
                token_names = set()
                print("Scanning deck lists for token capabilities...")
                
                for item in cards_list:
                    card_obj = item.get("card", {}).get("oracleCard", {})
                    oracle_text = card_obj.get("text", "")
                    
                    if not oracle_text:
                        continue
                        
                    # Expanded pattern matching specifically tuned for your Thromax Devour deck lists!
                    token_matches = re.findall(
                        r'create (?:[a-z]+ )?([\d+/]+ colorless Eldrazi Spawn|[\d+/]+ colorless Eldrazi Scion|[\d+/]+ green Insect|[\d+/]+ green Saproling|[\d+/]+ red Goblin|[\d+/]+ green Ooze|[\d+/]+ green Plant|[\d+/]+ red and green Satyr|[\d+/]+ green Spider|[\d+/]+ red Elemental|[\d+/]+ green Frog|[\d+/]+ green Treefolk|[\d+/]+ green Elf Warrior|[\d+/]+ red Hellion|[\d+/]+ green Squirrel|[\d+/]+ black and green Pest|[\d+/]+ black Rat) creature token', 
                        oracle_text, 
                        re.IGNORECASE
                    )
                    
                    for match in token_matches:
                        # Clean out structural sizing strings (like "1/1 green ") to isolate the exact name root
                        clean_name = re.sub(r'^[\d+/]+\s+(?:colorless|green|red|black|white|blue|and|\s+)*', '', match, flags=re.IGNORECASE)
                        token_names.add(clean_name.title())
                        
                    # Explicit checking conditions for card items with generic keyword text fields
                    if "create a Treasure token" in oracle_text or "create a tapped Treasure token" in oracle_text:
                        token_names.add("Treasure")
                    if "create a Clue token" in oracle_text:
                        token_names.add("Clue")
                    if "create a Food token" in oracle_text:
                        token_names.add("Food")
                    if "named Kobolds of Kher Keep" in oracle_text:
                        token_names.add("Kobold")
                        
                found_list = list(token_names)
                print(f"✅ Success! Token requirements found: {found_list}")
                return found_list
            else:
                print(f"❌ Archidekt API returned error status: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"❌ Failed to extract Archidekt data: {e}")
            return []
