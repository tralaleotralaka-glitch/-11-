#!/usr/bin/env python3
"""Генерация ресурсов: обои, boot-логотип, иконки лаунчера, фото, курсоры."""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ensure(p): os.makedirs(p, exist_ok=True)
def lerp(a, b, t): return tuple(int(a[i] + (b[i]-a[i])*t) for i in range(3))

# ---------- 1. Обои ----------
def cover_to(im, W, H):
    w, h = im.size
    s = max(W/w, H/h)
    im = im.resize((int(w*s)+1, int(h*s)+1), Image.LANCZOS)
    w, h = im.size
    x = (w-W)//2; y = (h-H)//2
    return im.crop((x, y, x+W, y+H))

ensure(f'{ROOT}/www/assets/wallpapers')
for src, dst in [('bloom', 'bloom'), ('bloom_light', 'bloom-light'), ('aurora', 'aurora'), ('peaks', 'peaks')]:
    p = f'{ROOT}/assets_src/{src}.png'
    if not os.path.exists(p):
        print('skip', src); continue
    im = Image.open(p).convert('RGB')
    cover_to(im, 1920, 1080).save(f'{ROOT}/www/assets/wallpapers/{dst}.jpg', quality=84, optimize=True, progressive=True)
    print('wallpaper', dst)

# ---------- 2. Логотип Windows (4 квадрата с градиентом) ----------
def draw_logo(size):
    S = size
    im = Image.new('RGBA', (S, S), (0,0,0,0))
    sq = S*0.455; gap = S*0.05
    total = sq*2 + gap
    off = (S-total)/2
    pos = [(off,off), (off+sq+gap,off), (off,off+sq+gap), (off+sq+gap,off+sq+gap)]
    c1 = (59,201,248); c2 = (14,119,208)
    r = int(sq*0.10)
    for (x, y) in pos:
        tile = Image.new('RGBA', (max(2,int(sq)), max(2,int(sq))))
        td = ImageDraw.Draw(tile)
        for i in range(tile.size[1]):
            col = lerp(c1, c2, i/tile.size[1])
            td.line([(0,i),(tile.size[0],i)], fill=col+(255,))
        mask = Image.new('L', tile.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0,0,tile.size[0]-1,tile.size[1]-1], radius=r, fill=255)
        im.paste(tile, (int(x), int(y)), mask)
    return im

ensure(f'{ROOT}/www/assets')
draw_logo(512).save(f'{ROOT}/www/assets/boot-logo.png')

# ---------- 3. Иконки лаунчера Android ----------
ensure(f'{ROOT}/android/app/src/main/res/mipmap-mdpi')
for dpi, px in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    big = 512
    im = Image.new('RGBA', (big, big), (0,0,0,0))
    d = ImageDraw.Draw(im)
    # фон: градиент тёмно-синий + скругление
    bg1 = (13,52,94); bg2 = (6,25,47)
    for i in range(big):
        col = lerp(bg1, bg2, i/big)
        d.line([(0,i),(big,i)], fill=col+(255,))
    mask = Image.new('L', (big, big), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0,0,big,big], radius=110, fill=255)
    logo = draw_logo(300)
    im.paste(logo, ((big-300)//2, (big-300)//2), logo)
    out = Image.new('RGBA', (big,big), (0,0,0,0)); out.paste(im, (0,0), mask)
    out.resize((px,px), Image.LANCZOS).save(f'{ROOT}/android/app/src/main/res/mipmap-{dpi}/ic_launcher.png')
print('launcher icons ok')

# ---------- 4. Фотографии-градиенты ----------
ensure(f'{ROOT}/www/assets/photos')
def photo(name, c1, c2, blobs):
    sw, sh = 96, 64
    im = Image.new('RGB', (sw, sh))
    px = im.load()
    for y in range(sh):
        for x in range(sw):
            px[x, y] = lerp(c1, c2, (x/sw + y/sh)/2)
    W, H = 1200, 900
    im = im.resize((W, H), Image.BICUBIC)
    overlay = Image.new('RGBA', (W, H), (0,0,0,0))
    od = ImageDraw.Draw(overlay)
    for (fx, fy, fr, col) in blobs:
        od.ellipse([W*fx-fr, H*fy-fr, W*fx+fr, H*fy+fr], fill=col+(110,))
    overlay = overlay.filter(ImageFilter.GaussianBlur(120))
    im = Image.alpha_composite(im.convert('RGBA'), overlay).convert('RGB')
    im.save(f'{ROOT}/www/assets/photos/{name}', quality=86, optimize=True)
    print('photo', name)

photo('g1.jpg', (255,123,84), (196,75,196), [(0.3,0.3,220,(255,220,150)), (0.75,0.7,260,(120,40,140))])
photo('g2.jpg', (0,198,255), (0,84,166), [(0.7,0.25,240,(255,255,255)), (0.25,0.8,260,(0,60,120))])
photo('g3.jpg', (199,159,255), (123,91,230), [(0.35,0.7,230,(255,170,220)), (0.8,0.25,220,(255,240,180))])

# ---------- 5. Курсоры ----------
ensure(f'{ROOT}/www/assets/cursors')
def save_cursor(im, name):
    im.resize((32,32), Image.LANCZOS).save(f'{ROOT}/www/assets/cursors/{name}.png')
    print('cursor', name)

BIG = 256
# стрелка (классический курсор Windows — форма aero arrow)
arrow = Image.new('RGBA', (BIG, BIG), (0,0,0,0))
d = ImageDraw.Draw(arrow)
# контур: кончик -> левая кромка -> нижняя диагональ -> хвост -> подмышка -> горизонталь -> гипотенуза
pts = [(24,20), (24,230), (77,181), (110,255), (146,238), (113,165), (186,165)]
d.polygon(pts, fill=(255,255,255,255))
d.line(pts+[pts[0]], fill=(15,15,15,255), width=9, joint='curve')
save_cursor(arrow, 'arrow')

# текстовый курсор (I-beam)
beam = Image.new('RGBA', (BIG, BIG), (0,0,0,0))
d = ImageDraw.Draw(beam)
black = (10,10,10,255); white = (245,245,245,255)
def thick_shape(pts_list, fill, w):
    for (a,b) in pts_list:
        d.line([a,b], fill=fill, width=w)
segments = [((128,34),(128,222)), ((88,34),(168,34)), ((88,222),(168,222)), ((112,34),(112,70)), ((144,34),(144,70)), ((112,186),(112,222)), ((144,186),(144,222))]
thick_shape(segments, black, 20)
thick_shape(segments, white, 10)
save_cursor(beam, 'beam')

# занятость (кольцо)
busy = Image.new('RGBA', (BIG, BIG), (0,0,0,0))
d = ImageDraw.Draw(busy)
d.arc([48,48,208,208], start=-60, end=250, fill=(76,194,255,255), width=30)
d.arc([48,48,208,208], start=250, end=300, fill=(120,120,120,140), width=30)
save_cursor(busy, 'busy')

print('done')
