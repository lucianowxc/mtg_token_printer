import scrython

class ScryfallFetcher:
    def __init__(self):
        pass

    async def fetch_card_data(self, search_name):
        token_keywords = ["treasure", "clue", "food", "blood", "map", "incubator"]
        is_generic_token = search_name.lower().strip() in token_keywords
        
        try:
            if is_generic_token:
                query_string = f"t:token {search_name}"
                print(f"Using Advanced Search for token: '{query_string}'...")
                search_obj = scrython.cards.Search(q=query_string)
                results = search_obj.to_dict().get("data", [])
                if not results:
                    print(f"No tokens found for query: {query_string}")
                    return None
                
                # FIX: Grab index 0 out of the results array list
                data = results[0]
            else:
                print(f"Using Fuzzy Match for card: '{search_name}'...")
                card_obj = scrython.cards.Named(fuzzy=search_name)
                data = card_obj.to_dict()
            
            card_info = {
                "name": data.get("name", "Unknown"),
                "type_line": data.get("type_line", "Token"),
                "rules_text": data.get("oracle_text", None),
                "flavor_text": data.get("flavor_text", None),
                "pt": None,
                "mana_cost": data.get("mana_cost", None),
                "mana_value": int(data.get("cmc", 0)) if "cmc" in data else None,
                "scryfall_uri": data.get("scryfall_uri", None)
            }
            
            if "power" in data and "toughness" in data:
                card_info["pt"] = f"{data['power']}/{data['toughness']}"
                
            if "card_faces" in data:
                faces = data["card_faces"]
                target_face = faces
                if is_generic_token:
                    for face in faces:
                        if search_name.lower() in face.get("name", "").lower():
                            target_face = face
                            break
                
                card_info["name"] = target_face.get("name", card_info["name"])
                card_info["type_line"] = target_face.get("type_line", card_info["type_line"])
                card_info["rules_text"] = target_face.get("oracle_text", card_info["rules_text"])
                card_info["flavor_text"] = target_face.get("flavor_text", card_info["flavor_text"])
                if "mana_cost" in target_face:
                    card_info["mana_cost"] = target_face.get("mana_cost", card_info["mana_cost"])
                if "power" in target_face and "toughness" in target_face:
                    card_info["pt"] = f"{target_face['power']}/{target_face['toughness']}"
                    
            return card_info
        except Exception as e:
            print(f"Scryfall retrieval error for '{search_name}': {e}")
            return None
