"""Hesapların kişisel verisini (ozel/<hesap>/veri.js) şifreleyip yayınlanabilir dosyaları üretir.

Kullanım:
    python araclar/sifrele.py                        # tüm hesaplar (kayıtlı anahtarlarla) + hesaplar.json
    python araclar/sifrele.py ali                    # yalnızca bir hesap (anahtarı yoksa şifre sorar)
    python araclar/sifrele.py ali --yeni-sifre       # hesabın şifresini belirler ya da değiştirir
    python araclar/sifrele.py --yeni-hesap ali       # yeni hesap kaydı açar (ozel/ali/ klasörü ve rastgele kimlik)

Yerel (git'e yüklenmeyen) dosyalar:
    ozel/hesaplar.json          hesap adı → {"id": rastgele kimlik, "depo": (isteğe bağlı) tarayıcı depolama öneki}
    ozel/<hesap>/veri.js        şifresiz kaynak veri (window.VERI = {...};)
    ozel/<hesap>/anahtar.json   şifreden türetilmiş anahtar (şifre hiçbir yere yazılmaz)

Yayınlanan dosyalar:
    veri/<kimlik>.enc.json      hesabın şifreli verisi
    hesaplar.json               yalnızca kimlik, dosya adı, tuz ve doğrulama bloğu (isim ya da kişisel bilgi yok)

Şifreleme: AES-256-GCM; anahtar, şifreden PBKDF2-HMAC-SHA256 (600.000 tur) ile türetilir. Yeni hesaplar mevcut
hesaplarla aynı tuzu kullanır; böylece kilit ekranı şifreyi bir kez türetip hangi hesaba ait olduğunu bulur.
Doğrulama bloğu, hesabın anahtarıyla şifrelenmiş "ders-takip-hesap:<kimlik>" metnidir.
"""

import argparse
import base64
import getpass
import hashlib
import hmac
import json
import os
import re
import secrets
import sys
import unicodedata
from pathlib import Path

try:
    from cryptography.exceptions import InvalidTag
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    sys.exit("Eksik paket: önce 'python -m pip install cryptography' komutunu çalıştır.")

ROOT = Path(__file__).resolve().parent.parent
PRIVATE = ROOT / "ozel"
ACCOUNTS = PRIVATE / "hesaplar.json"
INDEX = ROOT / "hesaplar.json"
DATA_DIR = ROOT / "veri"
ITERATIONS = 600_000
MIN_LEN = 10
CHECK_PREFIX = "ders-takip-hesap:"
NAME_RE = re.compile(r"^[a-z0-9_-]{2,32}$")

b64e = lambda b: base64.b64encode(b).decode("ascii")
b64d = lambda s: base64.b64decode(s.encode("ascii"))


def derive_key(password: str, salt: bytes, iterations: int = ITERATIONS) -> bytes:
    pw = unicodedata.normalize("NFC", password).encode("utf-8")
    return hashlib.pbkdf2_hmac("sha256", pw, salt, iterations, dklen=32)


def read_data(src: Path) -> bytes:
    text = src.read_text(encoding="utf-8").strip()
    prefix = "window.VERI ="
    if not text.startswith(prefix):
        sys.exit(f"{src} beklenen biçimde değil ('{prefix}' ile başlamalı).")
    data = json.loads(text[len(prefix):].strip().rstrip(";"))  # geçerli JSON mu?
    data.pop("_not", None)
    for field in ("courses", "transcript"):
        if not isinstance(data.get(field), list):
            sys.exit(f"{src}: veride '{field}' listesi yok.")
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def seal(plaintext: bytes, key: bytes) -> dict:
    iv = os.urandom(12)
    return {"iv": b64e(iv), "ct": b64e(AESGCM(key).encrypt(iv, plaintext, None))}  # şifreli metin + 16 baytlık etiket


def open_sealed(blob: dict, key: bytes):
    try:
        return AESGCM(key).decrypt(b64d(blob["iv"]), b64d(blob["ct"]), None)
    except (InvalidTag, KeyError, ValueError):
        return None


def load_json(path: Path, default):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def save_json(path: Path, obj, compact=False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(obj, ensure_ascii=False, separators=(",", ":")) if compact else json.dumps(obj, ensure_ascii=False, indent=2)
    path.write_text(text + ("" if compact else "\n"), encoding="utf-8")


def key_file(name: str) -> Path:
    return PRIVATE / name / "anahtar.json"


def saved_key(name: str):
    k = load_json(key_file(name), None)
    if not k:
        return None
    if k.get("iter") != ITERATIONS:
        sys.exit(f"{name}: kayıtlı anahtar farklı ayarlarla oluşturulmuş; --yeni-sifre ile yenile.")
    return {"salt": b64d(k["salt"]), "key": b64d(k["key"])}


def interactive() -> bool:
    # Windows'ta NUL girişi de "terminal" sayılır; çıktının da terminale gitmesi aranır
    return sys.stdin.isatty() and sys.stdout.isatty()


def ask_new_password(name: str) -> str:
    if not interactive():
        sys.exit(f"{name}: şifre belirlemek gerekiyor; bu komutu bir terminalde çalıştır.")
    print(f"'{name}' hesabının siteyi açarken kullanacağı şifreyi belirle.")
    print(f"En az {MIN_LEN} karakter; kolay tahmin edilmeyen bir cümle en iyisi (ör. 'mavi-kedi-dondurma-47').")
    while True:
        p1 = getpass.getpass("Yeni şifre: ")
        if len(p1) < MIN_LEN:
            print(f"  Çok kısa, en az {MIN_LEN} karakter olmalı.")
            continue
        p2 = getpass.getpass("Tekrar: ")
        if p1 != p2:
            print("  Şifreler aynı değil, tekrar dene.")
            continue
        return p1


def set_password(name: str, accounts: dict) -> dict:
    # Ortak tuz: başka bir hesabın anahtarı varsa onun tuzu, yoksa yeni rastgele tuz
    others = {n: saved_key(n) for n in accounts if n != name}
    others = {n: k for n, k in others.items() if k}
    salt = next(iter(others.values()))["salt"] if others else os.urandom(16)
    while True:
        password = ask_new_password(name)
        print("Anahtar türetiliyor…")
        key = derive_key(password, salt)
        del password
        if any(hmac.compare_digest(key, k["key"]) for k in others.values()):
            print("  Bu şifre başka bir hesapta kullanılıyor; farklı bir şifre seç.")
            continue
        break
    save_json(key_file(name), {"salt": b64e(salt), "iter": ITERATIONS, "key": b64e(key)})
    return {"salt": salt, "key": key}


def encrypt_account(name: str, info: dict, key: dict) -> dict:
    src = PRIVATE / name / "veri.js"
    if not src.exists():
        sys.exit(f"{name}: kaynak veri bulunamadı ({src}).")
    plaintext = read_data(src)
    out = DATA_DIR / f"{info['id']}.enc.json"
    old = load_json(out, None)
    # İçerik ve anahtar aynıysa dosyayı yeniden yazma (gereksiz değişiklik olmasın)
    if old and old.get("salt") == b64e(key["salt"]) and open_sealed(old, key["key"]) == plaintext:
        print(f"{name}: değişiklik yok ({out.relative_to(ROOT).as_posix()}).")
    else:
        payload = {"v": 1, "alg": "AES-256-GCM", "kdf": "PBKDF2-SHA256", "iter": ITERATIONS, "salt": b64e(key["salt"]), **seal(plaintext, key["key"])}
        save_json(out, payload, compact=True)
        print(f"{name}: {out.relative_to(ROOT).as_posix()} güncellendi ({len(plaintext)} bayt veri şifrelendi).")
    return {"id": info["id"], "dosya": f"veri/{info['id']}.enc.json", "salt": b64e(key["salt"]), "iter": ITERATIONS}


def write_index(accounts: dict) -> None:
    old = {e["id"]: e for e in load_json(INDEX, {"hesaplar": []}).get("hesaplar", [])}
    entries = []
    for name, info in sorted(accounts.items(), key=lambda kv: kv[1]["id"]):
        key = saved_key(name)
        path = DATA_DIR / f"{info['id']}.enc.json"
        if not key or not path.exists():
            print(f"{name}: anahtarı ya da şifreli verisi olmadığı için sitede listelenmedi.")
            continue
        check = (CHECK_PREFIX + info["id"]).encode("utf-8")
        prev = old.get(info["id"], {}).get("kontrol")
        kontrol = prev if prev and open_sealed(prev, key["key"]) == check else seal(check, key["key"])
        entry = {"id": info["id"], "dosya": f"veri/{info['id']}.enc.json", "salt": b64e(key["salt"]), "iter": ITERATIONS, "kontrol": kontrol}
        if info.get("depo"):
            entry["depo"] = info["depo"]
        entries.append(entry)
    save_json(INDEX, {"v": 1, "hesaplar": entries})
    # Artık listede olmayan hesapların şifreli dosyalarını kaldır
    keep = {f"{e['id']}.enc.json" for e in entries}
    for f in DATA_DIR.glob("*.enc.json"):
        if f.name not in keep and not any(f.name == f"{i['id']}.enc.json" for i in accounts.values()):
            f.unlink()
            print(f"Kaldırıldı: veri/{f.name}")
    print(f"hesaplar.json: {len(entries)} hesap.")


def main() -> None:
    ap = argparse.ArgumentParser(description="Ders Takip hesap verilerini şifreler.")
    ap.add_argument("hesap", nargs="?", help="yalnızca bu hesabı işle (ör. ali)")
    ap.add_argument("--yeni-sifre", action="store_true", help="hesabın şifresini belirle ya da değiştir")
    ap.add_argument("--yeni-hesap", metavar="AD", help="yeni hesap kaydı oluştur")
    args = ap.parse_args()

    accounts = load_json(ACCOUNTS, {})

    if args.yeni_hesap:
        name = args.yeni_hesap
        if not NAME_RE.match(name):
            sys.exit("Hesap adı küçük harf, rakam, - veya _ içermeli (2–32 karakter).")
        if name in accounts:
            sys.exit(f"{name} hesabı zaten var.")
        accounts[name] = {"id": secrets.token_hex(6)}
        save_json(ACCOUNTS, accounts)
        (PRIVATE / name).mkdir(parents=True, exist_ok=True)
        print(f"{name} hesabı oluşturuldu (kimlik {accounts[name]['id']}). Verisini ozel/{name}/veri.js dosyasına koyup")
        print(f"  python araclar/sifrele.py {name} --yeni-sifre")
        print("komutunu çalıştır.")
        return

    if not accounts:
        sys.exit(f"Hesap bulunamadı: {ACCOUNTS}")
    if args.hesap and args.hesap not in accounts:
        sys.exit(f"'{args.hesap}' adlı hesap yok. Hesaplar: {', '.join(accounts)}")
    if args.yeni_sifre and not args.hesap:
        sys.exit("Şifresi değişecek hesabı yaz: python araclar/sifrele.py <hesap> --yeni-sifre")

    for name in [args.hesap] if args.hesap else list(accounts):
        key = None if args.yeni_sifre else saved_key(name)
        if key is None:
            if not args.hesap and not interactive():
                print(f"{name}: şifresi henüz belirlenmemiş, atlandı (python araclar/sifrele.py {name} --yeni-sifre).")
                continue
            key = set_password(name, accounts)
        encrypt_account(name, accounts[name], key)

    write_index(accounts)


if __name__ == "__main__":
    main()
