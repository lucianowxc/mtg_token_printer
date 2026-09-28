import textwrap
from PIL import Image
from escpos.printer import Serial

class BasePrinter:
    def __init__(self, devfile="/dev/rfcomm0", baudrate=9600):
        try:
            self.printer = Serial(devfile=devfile, baudrate=baudrate, profile="POS-5890", timeout=2.0)
            self.width = 32  # Characters width
            self.pixel_width = 384  # 58mm printer total horizontal pixels
            print("Successfully connected to printer at /dev/rfcomm0!")
        except Exception as e:
            print(f"Hardware Access Error: {e}")
            self.printer = None

    def draw_divider(self, char="-"):
        if self.printer:
            self.printer.set(align='center', bold=False)
            self.printer.text(char * self.width + "\n")

    def print_centered_header(self, text, large=False):
        if self.printer and text:
            w, h = (2, 2) if large else (1, 1)
            self.printer.set(align='center', bold=True, width=w, height=h)
            self.printer.text(f"{text.upper()}\n")

    def print_wrapped_body(self, text, align='left'):
        if self.printer and text:
            self.printer.set(align=align, bold=False)
            for line in text.split("\n"):
                wrapped_lines = textwrap.wrap(line, width=self.width - 2)
                for wl in wrapped_lines:
                    padding = " " if align == 'left' else ""
                    self.printer.text(f"{padding}{wl}\n")

    def print_aligned_stats(self, label):
        if self.printer and label:
            self.printer.set(align='right', bold=True, width=2, height=2)
            self.printer.text(f"[{label}] \n")

    def print_pixel_art(self, image_path, size=64, dither=True):
        """Loads a local image file, prepares it for thermal limitations, and prints it centered."""
        if not self.printer:
            return
            
        try:
            # 1. Open the local asset image
            img = Image.open(image_path)
            
            # 2. Convert to Grayscale to handle any color spaces safely
            img = img.convert("L")
            
            # 3. Resize proportionally maintaining a sharp thumbnail scale
            # (size=64 to 128 pixels wide is perfect for an emblem icon)
            img.thumbnail((size, size), Image.Resampling.NEAREST)
            
            # 4. Convert to 1-bit pixel art (Pure Black & White)
            if dither:
                # Floyd-Steinberg dithering for smooth vintage shading curves
                img = img.convert("1") 
            else:
                # Sharp, high-contrast crisp silhouette threshold
                img = img.point(lambda x: 0 if x < 128 else 255, mode="1")
                
            # 5. Execute hardware centering and fire image matrix array over Bluetooth
            self.printer.set(align='center')
            self.printer.image(img)
            self.printer.text("\n") # Line break padding below the graphic
            
        except Exception as e:
            print(f"Failed to process pixel art file '{image_path}': {e}")

    def feed_and_finish(self):
        if self.printer:
            self.printer.text("\n\n\n\n")  

    def safe_close(self):
        if self.printer and hasattr(self.printer, 'device') and self.printer.device:
            try:
                self.printer.device.close()
                self.printer.device = None
            except:
                pass
