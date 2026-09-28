# MTG Token Printer - Thermer Edition

Imprima tokens de Magic: The Gathering na impressora térmica Knup KP-1026 usando seu iPhone! 

## ✨ Novo: Interface Web + Thermer App

Este projeto foi refatorado para usar o app Thermer (iOS), permitindo:
- ✅ Interface acessível via navegador Safari no iPhone
- ✅ Busca de cards em tempo real
- ✅ Preview antes de imprimir
- ✅ Histórico de impressões
- ✅ Zero configuração Bluetooth no iPhone

## 🎯 Como Funciona

```
iPhone (Safari) → Web Server → Thermer App → Impressora Bluetooth
```

1. Acesse o website do seu celular (mesmo WiFi que o servidor)
2. Digite o nome da carta
3. Veja preview
4. Clique "Imprimir com Thermer"
5. O app Thermer assume o controle e imprime

## 🌐 Deploy no GitHub Pages (sem depender do seu PC ligado)

GitHub Pages só serve arquivos estáticos, então o `web_app.py` (Flask) não roda lá.
A solução: mover a lógica de busca/transformação para um **Cloudflare Worker**
(gratuito, HTTPS, sempre online), e deixar só o `index.html` no GitHub Pages.

```
iPhone → GitHub Pages (index.html) → Cloudflare Worker → Scryfall API
```

### Passo 1: Deploy do Worker (backend)

```bash
cd worker
npm install -g wrangler   # CLI da Cloudflare (uma vez só)
wrangler login             # abre navegador para autenticar
wrangler deploy
```

Isso retorna uma URL tipo `https://mtg-token-printer-worker.SEU_SUBDOMINIO.workers.dev`.

### Passo 2: Atualizar o frontend

Em `index.html`, ache a linha com `workers.dev` e troque pela URL real do seu worker:

```js
: "https://mtg-token-printer-worker.SEU_SUBDOMINIO.workers.dev";
```

### Passo 3: Habilitar GitHub Pages

1. No GitHub, vá em **Settings → Pages**
2. Em "Source", selecione a branch `main` e pasta `/ (root)`
3. Salve — o site fica em `https://SEU_USUARIO.github.io/mtg_token_printer/`

### Passo 4: Testar do iPhone

Abra `https://SEU_USUARIO.github.io/mtg_token_printer/` no Safari — funciona
mesmo fora de casa, sem WiFi local, sem PC ligado.

> Nota: `run.py`/`web_app.py` continuam funcionando localmente como antes,
> úteis para desenvolvimento ou impressão via terminal.

## 📋 Pré-requisitos

### No seu Windows/WSL (máquina com impressora):
- Python 3.8+
- Impressora térmica Knup KP-1026 conectada via Bluetooth
- Bluetooth já configurado (veja seção "Configuração WSL" abaixo)

### No seu iPhone:
- Safari ou qualquer navegador
- App Thermer (gratuito): https://apps.apple.com/us/app/id1599863946
- Conectado no **mesmo WiFi** que o servidor

## 🚀 Instalação Rápida

### 1. Configure o WSL e Bluetooth (primeira vez só)

```bash
# No PowerShell (como admin):
usbipd list
usbipd bind --busid <id-do-seu-dispositivo>
```

```bash
# No WSL:
sudo apt install dbus
sudo service dbus start

echo 'export BLUETOOTH_ENABLED=1' | sudo tee /etc/default/bluetooth
sudo modprobe bluetooth
sudo modprobe btusb

bluetoothctl
# Dentro do bluetoothctl:
> scan on
# Encontre "Knup KP-1026" e anote o MAC address (ex: 86:67:7A:B7:30:F9)
> exit

sudo rfcomm bind 0 86:67:7A:B7:30:F9 1
```

### 2. Instale o Thermer no iPhone
- Acesse: https://apps.apple.com/us/app/id1599863946
- Instale o app
- Habilite "Browser Print function" nas configurações do app

### 3. Configure e rode o servidor

```bash
# No seu WSL:
cd /caminho/para/mtg_token_printer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Rode o servidor Flask
python web_app.py
```

Vai mostrar algo como:
```
Running on http://0.0.0.0:5000
```

### 4. No seu iPhone

1. Descubra o IP do seu Windows/WSL:
   ```bash
   # No WSL:
   hostname -I
   # Resultado: 192.168.X.X
   ```

2. No Safari do iPhone, abra:
   ```
   http://192.168.X.X:5000
   ```

3. Pronto! Busque cards e imprima

## 📱 Uso

### Via Interface Web
1. Abra http://192.168.X.X:5000 no Safari
2. Digite o nome da carta (ex: "Goblin", "Treasure")
3. Veja o preview
4. Clique "Imprimir com Thermer"
5. O app Thermer abre automaticamente

### Via API (avançado)

```bash
# Buscar card e retornar JSON para impressora
curl "http://localhost:5000/api/search?card=goblin"

# Preview (sem print)
curl "http://localhost:5000/api/preview?card=goblin"

# Buscar tokens de um deck Archidekt
curl "http://localhost:5000/api/archidekt?url=https://archidekt.com/decks/..."
```

## 🏗️ Estrutura do Projeto

```
mtg_token_printer/
├── web_app.py              # Servidor Flask
├── index.html              # Interface web (iOS)
├── requirements.txt        # Dependências Python
├── run.py                  # CLI antigo (mantido para compatibilidade)
├── src/
│   ├── scryfall_fetcher.py       # Busca cards via API Scryfall
│   ├── archidekt_fetcher.py      # Busca decks Archidekt
│   ├── thermer_layout.py         # ✨ NOVO: Gera JSON para Thermer
│   ├── mtg_layout.py            # Layout para impressora (legacy)
│   └── base_printer.py          # Driver ESCPOS (legacy)
└── icons/                  # Icons customizados (opcional)
```

## 📡 Endpoints da API

| Endpoint | Método | Parâmetro | Resposta |
|----------|--------|-----------|----------|
| `/api/search` | GET | `card=NOME` | JSON formatado para Thermer |
| `/api/preview` | GET | `card=NOME` | Dados da carta (sem formatação) |
| `/api/print` | POST | `{"card": "NOME"}` | JSON para impressão |
| `/api/archidekt` | GET | `url=LINK` | Lista de tokens do deck |

## 🔧 Troubleshooting

### "Conexão recusada" no iPhone
- Verifique se está no **mesmo WiFi** que o Windows
- Abra `http://WINDOWS_IP:5000` no Safari
- Se não funcionar, o servidor pode estar vinculado a localhost. Edite `web_app.py` linha 138

### App Thermer não abre
- Abra configurações do Thermer → "Browser Print function" → Ative
- Verifique se clicou em "Imprimir com Thermer" (não é um link normal)

### Carta não encontrada
- Tente com o nome exato da carta (case-insensitive)
- Tokens genéricos: "treasure", "clue", "food", "blood", "map", "incubator"
- Use busca no Scryfall (https://scryfall.com) para verificar o nome exato

### Erro de Bluetooth no WSL
- Certifique-se de que `/dev/rfcomm0` existe: `ls -la /dev/rfcomm0`
- Se não existir, rode: `sudo rfcomm bind 0 MAC_ADDRESS 1`
- Reinicie o servidor

## 📚 Recursos

- [Scryfall API](https://scryfall.com/docs/api)
- [Thermer App Documentation](https://apps.apple.com/us/app/id1599863946)
- [Archidekt Decklist Editor](https://archidekt.com)
- [Magic: The Gathering Rules](https://magic.wizards.com/)

## 📝 Licença

Livre para uso pessoal e educacional.

---

**Feito com ❤️ para Magic: The Gathering collectors**
