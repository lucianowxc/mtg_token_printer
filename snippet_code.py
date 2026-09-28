import sys
from escpos.printer import Serial

try:
    # 1. Initialize the Knup KP-1025 via the bound RFCOMM port
    printer = Serial(devfile="/dev/rfcomm0", baudrate=9600, profile="POS-5890")
    
    # 2. Print Header (Using the updated bold property)
    printer.set(align='center', bold=True, width=2, height=2)
    printer.text("WSL SUCCESS\n")
    
    # 3. Print Body (Sticking to the 32-column limit of the KP-1025)
    # We reset bold to False here
    printer.set(align='left', bold=False, width=1, height=1)
    printer.text("-" * 32 + "\n")
    printer.text("Device: Knup KP-1025\n")
    printer.text("Interface: Bluetooth (WSL2)\n")
    printer.text("-" * 32 + "\n")
    
    # 4. QR Code Test
    printer.set(align='center')
    printer.qr("https://github.com", size=5)
    
    # 5. Advance paper past the manual tearing edge
    printer.text("\n\n\n\n")
    print("Print job sent successfully!")

except Exception as e:
    print(f"An unexpected error occurred: {e}")