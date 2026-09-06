from __future__ import annotations

import math
import re
import struct
import subprocess
import textwrap
import wave
from dataclasses import dataclass
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "marketing" / "video"
W, H = 540, 960
FPS = 24
DURATION = 54.5


def face(size: int, *, serif: bool = False, bold: bool = False):
    folder = Path("C:/Windows/Fonts")
    name = ("georgiab.ttf" if bold else "georgia.ttf") if serif else ("arialbd.ttf" if bold else "arial.ttf")
    return ImageFont.truetype(str(folder / name), size)


def clamp(n: float) -> float:
    return max(0.0, min(1.0, n))


def ease(n: float) -> float:
    n = clamp(n)
    return n * n * (3 - 2 * n)


def visibility(t: float, start: float, end: float, fade: float = .55) -> float:
    return min(ease((t - start) / fade), ease((end - t) / fade))


def centered(draw, text: str, y: float, font, fill, spacing: int = 0):
    if spacing == 0:
        length = draw.textlength(text, font=font)
        draw.text(((W - length) / 2, y), text, font=font, fill=fill)
        return
    widths = [draw.textlength(c, font=font) for c in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x = (W - total) / 2
    for char, width in zip(text, widths):
        draw.text((x, y), char, font=font, fill=fill)
        x += width + spacing


def lines_center(draw, lines: list[str], y: int, font, fill, gap: int):
    for i, line in enumerate(lines):
        centered(draw, line, y + i * gap, font, fill)


def multiply_alpha(layer: Image.Image, alpha: float) -> Image.Image:
    if alpha >= .999:
        return layer
    channel = layer.getchannel("A").point(lambda p: int(p * alpha))
    layer.putalpha(channel)
    return layer


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


@dataclass
class Cue:
    start: float
    end: float
    text: str


def timestamp(raw: str) -> float:
    h, m, rest = raw.replace(",", ".").split(":")
    return int(h) * 3600 + int(m) * 60 + float(rest)


def read_cues(path: Path) -> list[Cue]:
    content = path.read_text(encoding="utf-8-sig")
    cues = []
    for match in re.finditer(r"(\d\d:\d\d:\d\d[,.]\d+) --> (\d\d:\d\d:\d\d[,.]\d+)\s+(.+?)(?=\n\s*\n|\Z)", content, re.S):
        text = " ".join(line.strip() for line in match.group(3).splitlines())
        cues.append(Cue(timestamp(match.group(1)), timestamp(match.group(2)), text))
    return cues


def background() -> Image.Image:
    tiny = Image.new("RGB", (135, 240), "#080808")
    pixels = tiny.load()
    for y in range(tiny.height):
        for x in range(tiny.width):
            d1 = math.hypot(x - 78, y - 102)
            d2 = math.hypot(x - 12, y - 224)
            light = max(0, 25 - d1 / 7) + max(0, 10 - d2 / 13)
            v = int(7 + light)
            pixels[x, y] = (v, v, v + 1)
    return tiny.resize((W, H), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(7))


BASE = background()


def ambient(frame: Image.Image, t: float):
    draw = ImageDraw.Draw(frame, "RGBA")
    cx = W / 2 + math.sin(t * .19) * 16
    cy = 435 + math.cos(t * .16) * 22
    pulse = 1 + .018 * math.sin(t * 1.15)
    for radius, opacity in ((178, 22), (252, 15), (336, 9)):
        r = radius * pulse
        draw.ellipse((cx-r, cy-r, cx+r, cy+r), outline=(255,255,255,opacity), width=1)
    for i in range(16):
        angle = i * 2.37 + t * (.015 + (i % 4) * .006)
        radius = 175 + (i * 37) % 230
        x, y = cx + math.cos(angle) * radius, cy + math.sin(angle) * radius
        size = 1 + (i % 2)
        draw.ellipse((x-size, y-size, x+size, y+size), fill=(255,255,255,20 + (i % 3) * 10))
    # Brand and progress remain in the safe area of every scene.
    draw.ellipse((32, 28, 70, 66), fill=(246,246,242,255))
    draw.text((44, 29), "n", font=face(27, serif=True), fill=(8,8,8,255))
    draw.text((81, 37), "NORA", font=face(13, bold=True), fill=(255,255,255,225))
    draw.rounded_rectangle((32, 78, 508, 81), radius=2, fill=(255,255,255,18))
    draw.rounded_rectangle((32, 78, 32 + int(476 * clamp(t / DURATION)), 81), radius=2, fill=(239,170,149,185))


def scene_open(t: float, logo: Image.Image) -> Image.Image:
    layer = Image.new("RGBA", (W,H), (0,0,0,0)); d = ImageDraw.Draw(layer, "RGBA")
    yoff = int((1-ease(t/.8))*24)
    centered(d, "A VECES", 280+yoff, face(13, bold=True), (239,170,149,220), 4)
    lines_center(d, ["solo necesitás", "un espacio", "para hablar."], 328+yoff, face(48, serif=True), (247,247,243,255), 55)
    centered(d, "Podés empezar con una sola palabra.", 534+yoff, face(17), (255,255,255,150))
    return layer


def scene_what(t: float, logo: Image.Image) -> Image.Image:
    layer = Image.new("RGBA", (W,H), (0,0,0,0)); d = ImageDraw.Draw(layer, "RGBA")
    size = 176 + int(8*math.sin(t*1.2))
    mark = logo.resize((size,size), Image.Resampling.LANCZOS)
    layer.alpha_composite(mark, ((W-size)//2, 158))
    centered(d, "¿QUÉ ES NORA?", 370, face(13,bold=True), (239,170,149,220), 3)
    centered(d, "Una inteligencia artificial", 410, face(34,serif=True), (247,247,243,255))
    centered(d, "para acompañarte.", 451, face(34,serif=True), (247,247,243,255))
    rounded(d, (58,535,482,684), 28, (255,255,255,13), (255,255,255,33), 1)
    rounded(d, (87,559,326,607), 17, (246,246,242,245))
    d.text((106,574), "Hoy tengo muchas cosas encima…", font=face(14), fill=(10,10,10,255))
    rounded(d, (150,622,453,662), 15, (63,57,72,245))
    d.text((168,634), "Estoy aquí. ¿Querés contarme?", font=face(14), fill=(247,247,243,245))
    centered(d, "Escucha primero · pregunta con cuidado · no juzga", 716, face(14), (255,255,255,145))
    return layer


def scene_features(t: float, logo: Image.Image) -> Image.Image:
    layer = Image.new("RGBA", (W,H), (0,0,0,0)); d = ImageDraw.Draw(layer, "RGBA")
    centered(d, "TODO EN UN MISMO ESPACIO", 205, face(13,bold=True), (239,170,149,220), 3)
    centered(d, "Nora se adapta a vos.", 244, face(40,serif=True), (247,247,243,255))
    cards = [
        ("01", "Chat emocional", "Conversaciones cálidas que podés retomar."),
        ("02", "Historial y memoria", "Vos decidís qué guardar y qué olvidar."),
        ("03", "Perfil personalizado", "Elegí tono, respuestas y apariencia."),
    ]
    for i, (num,title,body) in enumerate(cards):
        local = ease((t - 14.2 - i*.18)/.7)
        x = int(44 + (1-local)*46)
        y = 336+i*125
        rounded(d,(x,y,496,y+98),25,(255,255,255,14),(255,255,255,34),1)
        d.ellipse((x+18,y+25,x+64,y+71),fill=(239,170,149,220))
        d.text((x+32,y+39),num,font=face(10,bold=True),fill=(20,20,20,255))
        d.text((x+82,y+20),title,font=face(20,bold=True),fill=(248,248,244,255))
        d.text((x+82,y+54),body,font=face(13),fill=(255,255,255,145))
    centered(d, "También incluye tu compañero emocional, sin exigencias.", 742, face(14), (255,255,255,145))
    return layer


def scene_no_pressure(t: float, logo: Image.Image) -> Image.Image:
    layer=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(layer,"RGBA")
    centered(d,"TU RITMO ES SUFICIENTE",245,face(13,bold=True),(239,170,149,220),3)
    centered(d,"Sin rachas.",310,face(55,serif=True),(248,248,244,255))
    centered(d,"Sin metas. Sin presión.",371,face(34,serif=True),(248,248,244,220))
    for i,(title,body) in enumerate((("Volvé cuando querás","Nada se pierde por hacer una pausa."),("Compañía sin culpa","Tu mascota nunca reclama una ausencia."))):
        y=486+i*116
        rounded(d,(66,y,474,y+88),24,(255,255,255,13),(255,255,255,32),1)
        d.ellipse((88,y+27,122,y+61),outline=(239,170,149,230),width=2)
        d.text((142,y+18),title,font=face(18,bold=True),fill=(248,248,244,255))
        d.text((142,y+49),body,font=face(13),fill=(255,255,255,145))
    return layer


def scene_privacy(t: float, logo: Image.Image) -> Image.Image:
    layer=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(layer,"RGBA")
    centered(d,"PRIVACIDAD Y CONTROL",210,face(13,bold=True),(198,185,231,235),3)
    d.ellipse((197,258,343,404),fill=(238,231,248,245))
    d.rounded_rectangle((246,314,294,365),radius=8,fill=(26,35,31,255))
    d.arc((254,283,286,333),180,360,fill=(26,35,31,255),width=7)
    centered(d,"Tu historia te pertenece.",438,face(40,serif=True),(248,248,244,255))
    centered(d,"Revisá, exportá o eliminá tus datos",497,face(17),(255,255,255,155))
    centered(d,"cuando lo necesités.",524,face(17),(255,255,255,155))
    options=(("✓","Memoria opcional"),("↓","Exportación de chats"),("×","Borrado desde configuración"))
    for i,(icon,label) in enumerate(options):
        y=601+i*58
        d.ellipse((91,y,123,y+32),outline=(255,255,255,50),width=1)
        d.text((101,y+7),icon,font=face(12,bold=True),fill=(239,170,149,230))
        d.text((140,y+6),label,font=face(16),fill=(248,248,244,220))
    return layer


def scene_access(t: float, logo: Image.Image) -> Image.Image:
    layer=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(layer,"RGBA")
    centered(d,"ENTRAR ES MUY FÁCIL",175,face(13,bold=True),(239,170,149,220),3)
    centered(d,"noraai.qzz.io",216,face(41,serif=True,bold=True),(248,248,244,255))
    rounded(d,(105,301,435,698),38,(244,244,240,250),(255,255,255,60),2)
    d.ellipse((132,329,174,371),fill=(18,18,18,255)); d.text((146,331),"n",font=face(27,serif=True),fill=(248,248,244,255))
    d.text((189,338),"Nora",font=face(20,serif=True,bold=True),fill=(18,18,18,255))
    steps=(("1","Visitá la página"),("2","Iniciá sesión"),("3","Empezá a conversar"))
    for i,(num,label) in enumerate(steps):
        y=413+i*74
        d.ellipse((137,y,177,y+40),fill=(27,36,32,255))
        d.text((151,y+10),num,font=face(12,bold=True),fill=(248,248,244,255))
        d.text((196,y+9),label,font=face(17,bold=True),fill=(24,24,24,255))
    rounded(d,(137,637,403,678),21,(26,35,31,255))
    centered_width=d.textlength("Google o correo electrónico",font=face(13,bold=True))
    d.text(((W-centered_width)/2,650),"Google o correo electrónico",font=face(13,bold=True),fill=(248,248,244,255))
    centered(d,"Disponible desde celular o computadora.",742,face(15),(255,255,255,145))
    return layer


def scene_limits(t: float, logo: Image.Image) -> Image.Image:
    layer=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(layer,"RGBA")
    d.ellipse((207,210,333,336),outline=(255,255,255,42),width=2)
    centered(d,"!",236,face(52,serif=True),(239,170,149,240))
    centered(d,"APOYO HONESTO",380,face(13,bold=True),(239,170,149,220),3)
    lines_center(d,["Nora acompaña,","pero no reemplaza"],425,face(40,serif=True),(248,248,244,255),47)
    centered(d,"a profesionales ni servicios de emergencia.",535,face(16),(255,255,255,155))
    rounded(d,(64,608,476,716),25,(255,255,255,12),(255,255,255,34),1)
    centered(d,"Si existe peligro inmediato, buscá ayuda humana",632,face(14,bold=True),(248,248,244,235))
    centered(d,"y contactá los servicios de emergencia de tu país.",662,face(13),(255,255,255,145))
    return layer


def scene_final(t: float, logo: Image.Image) -> Image.Image:
    layer=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(layer,"RGBA")
    size=220
    layer.alpha_composite(logo.resize((size,size),Image.Resampling.LANCZOS),((W-size)//2,150))
    centered(d,"Nora",409,face(64,serif=True),(248,248,244,255))
    centered(d,"Un espacio para hablar.",486,face(21),(255,255,255,170))
    rounded(d,(85,565,455,631),33,(246,246,242,255))
    centered(d,"noraai.qzz.io",586,face(20,bold=True),(8,8,8,255))
    centered(d,"CONOCÉ Y COMPARTÍ NORA",686,face(13,bold=True),(239,170,149,235),3)
    centered(d,"Un pequeño gesto puede hacer una gran diferencia.",726,face(14),(255,255,255,145))
    return layer


SCENES = [
    (0.0,4.7,scene_open),(4.35,14.45,scene_what),(14.0,22.55,scene_features),
    (22.15,27.75,scene_no_pressure),(27.35,33.35,scene_privacy),(32.95,43.35,scene_access),
    (42.95,51.85,scene_limits),(51.45,DURATION+.2,scene_final),
]


def subtitle(frame: Image.Image, t: float, cues: list[Cue]):
    cue = next((cue for cue in cues if cue.start <= t <= cue.end), None)
    if not cue:
        return
    draw=ImageDraw.Draw(frame,"RGBA")
    words = textwrap.wrap(cue.text.replace("noraai punto q z z punto io", "noraai.qzz.io"), width=43)
    words = words[:3]
    line_height=21
    box_h=28+len(words)*line_height
    top=H-50-box_h
    rounded(draw,(35,top,505,H-50),18,(0,0,0,185),(255,255,255,28),1)
    for i,line in enumerate(words):
        centered(draw,line,top+15+i*line_height,face(15,bold=True),(255,255,255,238))


def render(t: float, logo: Image.Image, cues: list[Cue]) -> Image.Image:
    frame=BASE.copy().convert("RGBA")
    ambient(frame,t)
    for start,end,fn in SCENES:
        alpha=visibility(t,start,end)
        if alpha>0:
            frame=Image.alpha_composite(frame,multiply_alpha(fn(t,logo),alpha))
    subtitle(frame,t,cues)
    fade=min(ease(t/.45),ease((DURATION-t)/.45))
    if fade<1:
        frame=Image.blend(Image.new("RGBA",(W,H),(5,5,5,255)),frame,fade)
    return frame.convert("RGB")


def make_music(path: Path):
    rate=22050
    total=int(DURATION*rate)
    with wave.open(str(path),"wb") as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate)
        batch=bytearray()
        notes=(110.0,164.81,220.0,293.66)
        for i in range(total):
            t=i/rate
            fade=min(clamp(t/2.2),clamp((DURATION-t)/2.4))
            breath=.72+.28*math.sin(t*.31)
            sample=sum(math.sin(2*math.pi*f*t + j*.7) for j,f in enumerate(notes))/len(notes)
            shimmer=math.sin(2*math.pi*440*t + math.sin(t*.18))*0.14
            value=int(32767*.055*fade*breath*(sample+shimmer))
            batch.extend(struct.pack("<h",value))
            if len(batch)>=131072:
                wav.writeframesraw(batch); batch.clear()
        if batch: wav.writeframesraw(batch)


def main():
    logo=Image.open(ROOT/"marketing"/"figma"/"nora-logo-perfil.png").convert("RGBA")
    logo=ImageEnhance.Contrast(logo).enhance(1.02)
    cues=read_cues(OUT/"nora-anuncio-narracion.vtt")
    temp=OUT/"nora-anuncio-video-sin-audio.mp4"
    music=OUT/"nora-anuncio-ambiente.wav"
    final=OUT/"nora-anuncio-completo-vertical.mp4"
    poster=OUT/"nora-anuncio-portada.png"
    ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
    command=[ffmpeg,"-y","-loglevel","error","-f","rawvideo","-vcodec","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-","-an","-vf","scale=1080:1920:flags=lanczos","-c:v","libx264","-preset","veryfast","-crf","18","-pix_fmt","yuv420p","-movflags","+faststart",str(temp)]
    process=subprocess.Popen(command,stdin=subprocess.PIPE)
    total=int(DURATION*FPS)
    for index in range(total):
        t=index/FPS
        frame=render(t,logo,cues)
        if index==int(52.2*FPS):
            frame.resize((1080,1920),Image.Resampling.LANCZOS).save(poster)
        process.stdin.write(frame.tobytes())
    process.stdin.close()
    if process.wait(): raise SystemExit("No se pudo renderizar el video")
    make_music(music)
    mix=[ffmpeg,"-y","-loglevel","error","-i",str(temp),"-i",str(OUT/"nora-anuncio-narracion.mp3"),"-i",str(music),"-filter_complex","[1:a]volume=1.35[voz];[2:a]volume=0.28[musica];[voz][musica]amix=inputs=2:duration=longest:dropout_transition=2[a]","-map","0:v:0","-map","[a]","-c:v","copy","-c:a","aac","-b:a","192k","-t",str(DURATION),"-movflags","+faststart",str(final)]
    subprocess.run(mix,check=True)
    temp.unlink(missing_ok=True); music.unlink(missing_ok=True)
    print(final)


if __name__=="__main__":
    main()
