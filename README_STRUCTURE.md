# 📁 Estrutura do Projeto

## Visão Geral

```
mtg_token_printer/
├── public/                          # Arquivos web (GitHub Pages + Cloudflare Worker)
│   ├── index.html                  # Página principal (busca de cartas)
│   ├── momir.html                  # Página Momir (criaturas aleatórias)
│   └── worker/                     # Cloudflare Worker backend
│       ├── src/index.js            # Endpoints da API
│       ├── wrangler.toml           # Configuração do Worker
│       └── deploy-worker.sh        # Script de deploy
│
├── local/                          # Arquivos para execução local (Python)
│   ├── run.py                      # Script para rodar localmente
│   ├── web_app.py                  # Flask app (não usado, substituído pelo Worker)
│   ├── start.sh                    # Script de inicialização
│   ├── requirements.txt            # Dependências Python
│   └── src/                        # Módulos Python
│       ├── base_printer.py         # Classe base para impressoras
│       ├── thermer_layout.py       # Formatação para Thermer
│       ├── mtg_layout.py           # Layouts de MTG
│       ├── scryfall_fetcher.py     # Integração Scryfall
│       └── archidekt_fetcher.py    # Integração Archidekt
│
├── LICENSE                         # Licença MIT
├── README.md                       # Documentação principal
├── README_THERMER.md              # Documentação do Thermer
├── TESTING.md                     # Guia de testes
├── .nojekyll                      # Desabilita Jekyll no GitHub Pages
├── snippet_code.py                # Código snippets/exemplos
└── venv/                          # Ambiente virtual Python (não versionado)
```

## 🌐 Frontend (GitHub Pages + Cloudflare Worker)

**Localização:** `public/`

### Arquivos Web:
- **`index.html`** - Busca e impressão de cartas Magic
- **`momir.html`** - Gerador de criaturas aleatórias (Momir Vig)

### Worker Backend:
- **`worker/src/index.js`** - API com endpoints:
  - `/api/preview?card=NAME` - Dados brutos da carta
  - `/api/search?card=NAME` - Carta formatada (sem imagem)
  - `/api/search/print?card=NAME` - Carta formatada (com imagem)
  - `/api/momir?cmc=X` - Criatura aleatória
  - `/api/momir/print?cmc=X` - Criatura com imagem

**Deploy:** `cd public/worker && npx wrangler deploy`

---

## 🖥️ Backend Local (Python)

**Localização:** `local/`

### Scripts:
- **`run.py`** - Starter script
- **`web_app.py`** - Flask app (depreciado, use Worker)
- **`start.sh`** - Script bash para iniciar o app
- **`requirements.txt`** - Dependências: flask, requests, etc

### Módulos Python:
- **`src/thermer_layout.py`** - Formata dados para Thermer JSON
- **`src/scryfall_fetcher.py`** - Busca cartas no Scryfall
- **`src/archidekt_fetcher.py`** - Importa decks do Archidekt
- **`src/base_printer.py`** - Classe base para impressoras

**Como usar:**
```bash
cd local/
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

---

## 🔧 Como Fazer Deploy

### Frontend (GitHub Pages):
```bash
# Arquivos HTML são automaticamente servidos do root public/
git push
```

### Backend (Cloudflare Worker):
```bash
cd public/worker/
npx wrangler deploy
# Ou use o script:
./deploy-worker.sh
```

---

## 📝 Documentação Adicional

- **`README.md`** - Visão geral do projeto e instruções de setup
- **`README_THERMER.md`** - Documentação da API Thermer
- **`TESTING.md`** - Guia de testes e como testar localmente
- **`LICENSE`** - Licença MIT

---

## 🎯 Roadmap Futuro

- [ ] Reativar backend local (Flask) para impressão local
- [ ] Deck import (Moxfield, Archidekt)
- [ ] Dark mode
- [ ] Batch printing
- [ ] Analytics e histórico
