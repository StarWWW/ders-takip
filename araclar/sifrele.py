"""Kişisel veriyi (ozel/veri.js) şifreleyip yayınlanabilir veri.enc.json dosyasını üretir.

Kullanım:
    python araclar/sifrele.py              # ilk seferde şifre sorar, sonra kayıtlı anahtarı kullanır
    python araclar/sifrele.py --yeni-sifre # şifreyi değiştirir (tüm cihazlarda yeniden giriş gerekir)

Şifreleme: AES-256-GCM; anahtar, şifreden PBKDF2-HMAC-SHA256 (600.000 tur) ile türetilir.
Şifre hiçbir yere yazılmaz. Türetilmiş anahtar yalnızca bu bilgisayarda ozel/anahtar.json içinde
tutulur (ozel/ klasörü git'e yüklenmez); böylece veriyi güncellerken şifreyi tekrar yazman gerekmez.
"""

import argparse
import base64
import getpass
import hashlib
import json
import os
import sys
import unicodedata
from pathlib import Path

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    sys.exit("Eksik paket: önce 'python -m pip install cryptography' komutunu çalıştır.")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "ozel" / "veri.js"
KEYFILE = ROOT / "ozel" / "anahtar.json"
OUT = ROOT / "veri.enc.json"
ITERATIONS = 600_000
MIN_LEN = 10

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
    body = text[len(prefix):].strip().rstrip(";")
    data = json.loads(body)  # geçerli JSON mu?
    data.pop("_not", None)
    for field in ("courses", "transcript"):
        if not isinstance(data.get(field), list):
            sys.exit(f"Veride '{field}' listesi yok.")
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def encrypt(plaintext: bytes, key: bytes, salt: bytes, iterations: int) -> dict:
    iv = os.urandom(12)
    ct = AESGCM(key).encrypt(iv, plaintext, None)  # şifreli metin + 16 baytlık etiket (WebCrypto ile uyumlu)
    return {"v": 1, "alg": "AES-256-GCM", "kdf": "PBKDF2-SHA256", "iter": iterations,
            "salt": b64e(salt), "iv": b64e(iv), "ct": b64e(ct)}


def ask_new_password() -> str:
    print("Siteyi açarken kullanacağın şifreyi belirle.")
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


def main() -> None:
    ap = argparse.ArgumentParser(description="Ders Takip verisini şifreler.")
    ap.add_argument("--yeni-sifre", action="store_true", help="yeni şifre belirle")
    args = ap.parse_args()

    if not SRC.exists():
        sys.exit(f"Kaynak veri bulunamadı: {SRC}")
    plaintext = read_data(SRC)

    if args.yeni_sifre or not KEYFILE.exists():
        password = ask_new_password()
        salt = os.urandom(16)
        print("Anahtar türetiliyor…")
        key = derive_key(password, salt)
        KEYFILE.write_text(json.dumps({"salt": b64e(salt), "iter": ITERATIONS, "key": b64e(key)}), encoding="utf-8")
        del password
    else:
        saved = json.loads(KEYFILE.read_text(encoding="utf-8"))
        salt, key, iterations = b64d(saved["salt"]), b64d(saved["key"]), saved["iter"]
        if iterations != ITERATIONS:
            sys.exit("Kayıtlı anahtar farklı ayarlarla oluşturulmuş; --yeni-sifre ile yenile.")

    payload = encrypt(plaintext, key, salt, ITERATIONS)
    OUT.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"Tamam: {OUT.name} güncellendi ({len(plaintext)} bayt veri şifrelendi).")


if __name__ == "__main__":
    main()
