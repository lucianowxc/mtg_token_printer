# ⚡ Quick Test - MTG Token Printer

## ✅ Testes automatizados (frontend + backend)

Esta suíte cobre:
- **Backend Worker**: validação de endpoints, erros de parâmetros e formato de payload Thermer.
- **Frontend compartilhado**: `shared-print.js`, `shared-i18n.js` e `shared-layout.js`.

### Rodar a suíte

```bash
cd ~/thermal_printer_playground/mtg_token_printer
npm install
npm test
```

### Estrutura dos testes

- `tests/backend/worker.api.test.js`
- `tests/frontend/shared-print.test.js`
- `tests/frontend/shared-i18n.test.js`
- `tests/frontend/shared-layout.test.js`

### Modo watch (desenvolvimento)

```bash
cd ~/thermal_printer_playground/mtg_token_printer
npm run test:watch
```

## Setup (primeira vez)
```bash
cd ~/thermal_printer_playground/mtg_token_printer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Teste 1: Rodar o servidor
```bash
source venv/bin/activate
python web_app.py
```
Esperado: `Running on http://0.0.0.0:5000`

## Teste 2: Buscar card
Em outro terminal:
```bash
curl "http://localhost:5000/api/preview?card=goblin" | python -m json.tool
```
Esperado: JSON com name, type_line, rules_text, etc.

## Teste 3: Acessar interface
```
http://localhost:5000
```
Esperado: Página roxa com busca de cards

## Teste 4: Digitar "goblin" na interface
- Deve aparecer preview com nome, tipo, custo
- Botão "Imprimir com Thermer" deve aparecer

## Teste 5: Do iPhone (mesmo WiFi)
1. Descubra IP: `hostname -I`
2. Safari: `http://IP:5000`
3. Busque uma carta
4. Veja o preview

## Pronto! ✅
Instale Thermer no iPhone e clique "Imprimir" para testar impressão.
