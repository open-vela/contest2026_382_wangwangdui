from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src" / "common" / "icons"
TARGET = SOURCE / "soft"


def main():
    TARGET.mkdir(parents=True, exist_ok=True)
    for source in sorted(SOURCE.glob("*.jpg")):
        image = Image.open(source).convert("RGB")
        image = ImageEnhance.Color(image).enhance(0.55)
        image = ImageEnhance.Brightness(image).enhance(0.72)
        image = image.filter(ImageFilter.GaussianBlur(radius=1.15))
        target = TARGET / source.name
        image.save(target, "JPEG", quality=88, optimize=True)
        print(f"Rendered {target}")


if __name__ == "__main__":
    main()
