from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
output = ROOT / "images" / "og-portfolio.jpg"
image = Image.new("RGB", (1200, 630), "white")
draw = ImageDraw.Draw(image)
font_path = "/System/Library/Fonts/SFNSMono.ttf"
mark = ImageFont.truetype(font_path, 250)
small = ImageFont.truetype(font_path, 22)

draw.rectangle((1, 1, 1198, 628), outline="black", width=2)
draw.text((68, 155), "K.", font=mark, fill="black", stroke_width=0)
draw.text((72, 545), "MUSIC.EDUCATION.SOUND", font=small, fill="black")
draw.text((825, 545), "KIMINA / NAIROBI", font=small, fill="black")

for index in range(7):
    x = 650 + index * 55
    draw.ellipse((x, 140 + index * 18, x + 210, 350 + index * 18), outline=(35, 35, 35), width=1)

image.save(output, "JPEG", quality=92, optimize=True, progressive=True)
print(output)
