from __future__ import annotations

import math
import subprocess
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "marketing" / "video"
OUT_DIR.mkdir(parents=True, exist_ok=True)

WIDTH, HEIGHT = 720, 1280
FPS = 24
DURATION = 13.5


def font(size: int, serif: bool = False, bold: bool = False) -> ImageFont.FreeTypeFont:
    fonts = Path("C:/Windows/Fonts")
    if serif:
        name = "georgiab.ttf" if bold else "georgia.ttf"
    else:
        name = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(str(fonts / name), size)


def smooth(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3 - 2 * value)


def scene_alpha(t: float, start: float, end: float, fade: float = 0.55) -> float:
    return min(smooth((t - start) / fade), smooth((end - t) / fade))


def centered(draw: ImageDraw.ImageDraw, text: str, y: float, face, fill, tracking: int = 0):
    if not tracking:
        box = draw.textbbox((0, 0), text, font=face)
        draw.text(((WIDTH - (box[2] - box[0])) / 2, y), text, font=face, fill=fill)
        return
    widths = [draw.textlength(ch, font=face) for ch in text]
    total = sum(widths) + tracking * max(0, len(text) - 1)
    x = (WIDTH - total) / 2
    for ch, size in zip(text, widths):
        draw.text((x, y), ch, font=face, fill=fill)
        x += size + tracking


def wrap_center(draw: ImageDraw.ImageDraw, lines: list[str], y: int, face, fill, gap: int):
    for idx, line in enumerate(lines):
        centered(draw, line, y + idx * gap, face, fill)


def rounded_panel(layer: Image.Image, box, radius: int, fill, outline=None, width=1):
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def render_frame(t: float, logo: Image.Image) -> Image.Image:
    # Soft monochrome background with a slow moving light source.
    small = Image.new("RGB", (WIDTH // 4, HEIGHT // 4), "#050505")
    px = small.load()
    glow_x = WIDTH / 8 + math.sin(t * 0.34) * 22
    glow_y = HEIGHT / 8 + math.cos(t * 0.27) * 42
    for y in range(small.height):
        for x in range(small.width):
            distance = math.hypot(x - glow_x, y - glow_y)
            light = max(0, 23 - int(distance / 8.5))
            px[x, y] = (5 + light, 5 + light, 5 + light)
    frame = small.resize((WIDTH, HEIGHT), Image.Resampling.BICUBIC)
    draw = ImageDraw.Draw(frame, "RGBA")

    # Ambient rings and particles provide motion while keeping the frame calm.
    pulse = 1 + 0.025 * math.sin(t * 1.4)
    cx, cy = WIDTH // 2, 565
    for radius, opacity in ((270, 18), (340, 12), (430, 8)):
        r = radius * pulse
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(255, 255, 255, opacity), width=1)
    for i in range(18):
        angle = i * 2.399 + t * (0.035 + (i % 3) * 0.01)
        radius = 255 + (i * 29) % 240
        x = cx + math.cos(angle) * radius
        y = cy + math.sin(angle) * radius
        rr = 1 + i % 2
        draw.ellipse((x - rr, y - rr, x + rr, y + rr), fill=(255, 255, 255, 18 + i % 4 * 7))

    # Persistent minimalist brand mark.
    draw.ellipse((55, 55, 111, 111), fill=(246, 246, 242, 255))
    brand = font(39, serif=True)
    draw.text((72, 58), "n", font=brand, fill=(8, 8, 8, 255))
    draw.text((128, 68), "NORA", font=font(18, bold=True), fill=(255, 255, 255, 220))

    # Scene 1: emotional opening.
    a = scene_alpha(t, 0.0, 3.1)
    if a > 0:
        offset = int((1 - smooth(min(1, t / 0.8))) * 28)
        centered(draw, "HAY DÍAS EN QUE", 435 + offset, font(17, bold=True), (255, 255, 255, int(150 * a)), tracking=4)
        wrap_center(draw, ["hablar", "cuesta."], 485 + offset, font(76, serif=True), (248, 248, 244, int(255 * a)), 86)
        centered(draw, "Y está bien empezar poco a poco.", 705 + offset, font(24), (255, 255, 255, int(170 * a)))

    # Scene 2: conversational reassurance.
    a = scene_alpha(t, 2.7, 6.3)
    if a > 0:
        centered(draw, "Nora te escucha.", 338, font(59, serif=True), (248, 248, 244, int(255 * a)))
        centered(draw, "Sin juicios. A tu ritmo.", 415, font(24), (255, 255, 255, int(170 * a)))
        layer = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        slide = int((1 - smooth((t - 2.7) / 0.75)) * 44)
        rounded_panel(layer, (94 + slide, 510, 604 + slide, 608), 35, (245, 245, 241, int(245 * a)))
        ld = ImageDraw.Draw(layer)
        ld.text((130 + slide, 536), "Hoy no me siento bien…", font=font(25), fill=(12, 12, 12, int(255 * a)))
        rounded_panel(layer, (150 - slide, 638, 626 - slide, 788), 35, (30, 30, 30, int(235 * a)), (255, 255, 255, int(30 * a)), 1)
        ld.text((186 - slide, 667), "Gracias por decírmelo.", font=font(24, bold=True), fill=(248, 248, 244, int(255 * a)))
        ld.text((186 - slide, 708), "Estoy aquí. ¿Querés contarme", font=font(21), fill=(255, 255, 255, int(185 * a)))
        ld.text((186 - slide, 739), "qué pasó, a tu manera?", font=font(21), fill=(255, 255, 255, int(185 * a)))
        frame = Image.alpha_composite(frame.convert("RGBA"), layer).convert("RGB")
        draw = ImageDraw.Draw(frame, "RGBA")

    # Scene 3: product benefits.
    a = scene_alpha(t, 5.9, 10.0)
    if a > 0:
        centered(draw, "UN ESPACIO PARA VOS", 302, font(17, bold=True), (255, 255, 255, int(145 * a)), tracking=4)
        centered(draw, "Acompañamiento", 348, font(54, serif=True), (248, 248, 244, int(255 * a)))
        centered(draw, "que se siente cercano.", 414, font(38, serif=True), (248, 248, 244, int(220 * a)))
        cards = [
            ("♡", "Habla sin miedo", "Un lugar privado para expresarte."),
            ("◇", "Entiende lo que sentís", "Reflexiona sin etiquetas ni diagnósticos."),
            ("↗", "Cuida de vos", "Ejercicios y apoyo cuando lo necesités."),
        ]
        for i, (icon, title, body) in enumerate(cards):
            delay = 6.0 + i * 0.22
            ca = a * smooth((t - delay) / 0.55)
            y = 530 + i * 145
            xoff = int((1 - smooth((t - delay) / 0.65)) * 50)
            draw.rounded_rectangle((84 + xoff, y, 636 + xoff, y + 112), radius=30, fill=(255, 255, 255, int(13 * ca)), outline=(255, 255, 255, int(34 * ca)), width=1)
            draw.text((116 + xoff, y + 31), icon, font=font(31), fill=(255, 255, 255, int(220 * ca)))
            draw.text((172 + xoff, y + 22), title, font=font(23, bold=True), fill=(255, 255, 255, int(245 * ca)))
            draw.text((172 + xoff, y + 59), body, font=font(18), fill=(255, 255, 255, int(145 * ca)))

    # Scene 4: final brand lock-up and call to action.
    a = scene_alpha(t, 9.6, DURATION + 0.5, 0.7)
    if a > 0:
        scale = 0.88 + 0.12 * smooth((t - 9.6) / 0.9)
        logo_size = int(330 * scale)
        mark = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
        if mark.mode != "RGBA":
            mark = mark.convert("RGBA")
        mark.putalpha(mark.getchannel("A").point(lambda p: int(p * a)))
        frame_rgba = frame.convert("RGBA")
        frame_rgba.alpha_composite(mark, ((WIDTH - logo_size) // 2, 245))
        frame = frame_rgba.convert("RGB")
        draw = ImageDraw.Draw(frame, "RGBA")
        centered(draw, "Nora", 617, font(84, serif=True), (248, 248, 244, int(255 * a)))
        centered(draw, "Tu espacio emocional.", 719, font(25), (255, 255, 255, int(175 * a)))
        draw.rounded_rectangle((126, 816, 594, 894), radius=39, fill=(246, 246, 242, int(255 * a)))
        centered(draw, "ENTRAR A NORA  →", 841, font(20, bold=True), (8, 8, 8, int(255 * a)), tracking=1)
        centered(draw, "noraai.qzz.io", 931, font(22, bold=True), (255, 255, 255, int(215 * a)))
        centered(draw, "Nora acompaña, pero no reemplaza atención profesional.", 1123, font(14), (255, 255, 255, int(95 * a)))

    # Global cinematic fade.
    global_a = min(smooth(t / 0.45), smooth((DURATION - t) / 0.55))
    if global_a < 1:
        frame = Image.blend(Image.new("RGB", frame.size, "#050505"), frame, global_a)
    return frame


def main():
    logo_path = ROOT / "marketing" / "figma" / "nora-logo-perfil.png"
    logo = Image.open(logo_path).convert("RGBA")
    output = OUT_DIR / "nora-video-presentacion-vertical.mp4"
    poster = OUT_DIR / "nora-video-portada.png"
    executable = imageio_ffmpeg.get_ffmpeg_exe()
    command = [
        executable, "-y", "-f", "rawvideo", "-vcodec", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS), "-i", "-", "-an",
        "-vf", "scale=1080:1920:flags=lanczos", "-c:v", "libx264", "-preset", "medium",
        "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    total = int(DURATION * FPS)
    for index in range(total):
        frame = render_frame(index / FPS, logo)
        if index == int(11.4 * FPS):
            frame.resize((1080, 1920), Image.Resampling.LANCZOS).save(poster)
        process.stdin.write(frame.tobytes())
    process.stdin.close()
    code = process.wait()
    if code:
        raise SystemExit(code)
    print(output)


if __name__ == "__main__":
    main()
