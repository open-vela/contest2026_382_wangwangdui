import argparse
from pathlib import Path

from PIL import Image


def smoothstep(value):
    return value * value * (3.0 - 2.0 * value)


def main():
    parser = argparse.ArgumentParser(description='让表盘背景底部平滑过渡到系统黑色手势栏')
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--start', type=float, default=0.72)
    args = parser.parse_args()

    source = Image.open(args.input).convert('RGB')
    width, height = source.size
    start_y = max(0, min(height - 1, round(height * args.start)))
    mask = Image.new('L', (width, height), 0)
    pixels = mask.load()
    fade_height = max(1, height - start_y)
    for y in range(start_y, height):
        progress = (y - start_y) / fade_height
        opacity = round(smoothstep(progress) * 255)
        for x in range(width):
            pixels[x, y] = opacity

    faded = Image.composite(Image.new('RGB', source.size, '#000000'), source, mask)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    faded.save(output, 'JPEG', quality=88, optimize=True, progressive=True)
    print(f'已生成 {output}：{width}x{height}，从 {start_y}px 开始渐隐')


if __name__ == '__main__':
    main()
