# Thermal Printer - Scryfall

Este projeto faz a impressão dee tokens e cartas na impressora térmica Knup KP-1026.
Feito para treino em programação e exploração das possibilidades com a impressora.

## Configuração WSL:

Para configurar o projeto, siga os passos abaixo:

Caso esteja no WSL, é necessário instalar o pacote `bluez` e configurar o Bluetooth no WSL.
Para isso, siga os passos abaixo:

- No PowerShell, execute o comando para habilitar o Bluetooth no WSL:
```powershell
usbipd list
```
- Encontre o ID do dispositivo Bluetooth na lista exibida e execute o comando para vincular o dispositivo ao WSL:
```powershell
usbipd bind --busid <id>
```

- No WSL, instale o pacote `dbus` e inicie o serviço do D-Bus:
```bash
sudo apt install dbus
sudo service dbus start
```

- Habilite o Bluetooth no WSL:
```bash
echo 'export BLUETOOTH_ENABLED=1' | sudo tee /etc/default/bluetooth
sudo modprobe bluetooth
sudo modprobe btusb
```

- Inicie o utilitário `bluetoothctl` para gerenciar dispositivos Bluetooth e encontre o endereço MAC do dispositivo da impressora térmica:
```bash
bluetoothctl
bluetoothctl> scan on (encontre o dispositivo com nome Knup KP-1026 e anote o endereço MAC)
```

- Associe a porta COM com o endereço MAC da impressora térmica:
```bash
sudo rfcomm bind 0 86:67:7A:B7:30:F9 1
```

- Configure uma venv e instale os requerimentos do projeto:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Uso

Script para imprimir cartas de Magic: The Gathering usando a API do Scryfall.

```bash
python run.py
```
