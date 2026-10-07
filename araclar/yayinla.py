"""Şifrelenmiş hesap verilerini doğrulayıp yayınlar: commit, push ve sitenin güncellendiğinin kontrolü.

Kullanım:
    python araclar/yayinla.py                  # doğrula, commit et, gönder, yayını bekle
    python araclar/yayinla.py -m "Mesaj"       # commit mesajını kendin belirle
    python araclar/yayinla.py --deneme         # yalnızca kontrol et; hiçbir şey commit etme, gönderme
    python araclar/yayinla.py --beklemeden     # gönder ama sitenin güncellenmesini bekleme

Yalnızca yayınlanan veri dosyaları (hesaplar.json ve veri/) commit edilir; kodda yaptığın başka değişikliklere
dokunmaz. Commit mesajında hesap adı geçmez (depo herkese açık).

Şifre belirledikten sonra tek komutla yayınlamak için:
    python araclar/sifrele.py <hesap> --yeni-sifre --yayinla
"""

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
import urllib.request

import sifrele as s

PATHS = ["hesaplar.json", "veri"]


def run(*args, check=True):
    r = subprocess.run(list(args), cwd=s.ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if check and r.returncode != 0:
        sys.exit(f"Komut başarısız: {' '.join(args)}\n{(r.stderr or r.stdout).strip()}")
    return r


def git(*args, check=True):
    return run("git", *args, check=check)


def verify() -> None:
    """Gizli dosyalar depoda değil, her hesabın şifreli verisi güncel ve yalnızca kendi anahtarıyla açılıyor."""
    if git("ls-files", "ozel").stdout.strip():
        sys.exit("DUR: ozel/ klasöründen dosyalar depoda görünüyor. Bunlar asla yayınlanmamalı; önce kaldır.")
    if git("check-ignore", "-q", "ozel/hesaplar.json", check=False).returncode != 0:
        sys.exit("DUR: ozel/ klasörü .gitignore'da değil; gizli veriler yanlışlıkla yayınlanabilir.")

    accounts = s.load_json(s.ACCOUNTS, {})
    index = s.load_json(s.INDEX, {"hesaplar": []}).get("hesaplar", [])
    by_id = {e["id"]: e for e in index}
    index_text = s.INDEX.read_text(encoding="utf-8") if s.INDEX.exists() else ""
    keys = {}
    for name, info in accounts.items():
        key = s.saved_key(name)
        entry = by_id.get(info["id"])
        if not key or not entry:
            print(f"  {name}: şifresi belirlenmemiş, sitede listelenmiyor (atlandı).")
            continue
        keys[name] = key["key"]
        if s.open_sealed(entry["kontrol"], key["key"]) != (s.CHECK_PREFIX + info["id"]).encode("utf-8"):
            sys.exit(f"DUR: {name} hesabının kaydı anahtarıyla eşleşmiyor. Önce: python araclar/sifrele.py {name}")
        data_file = s.ROOT / entry["dosya"]
        if not data_file.exists():
            sys.exit(f"DUR: {entry['dosya']} bulunamadı. Önce: python araclar/sifrele.py {name}")
        if s.open_sealed(json.loads(data_file.read_text(encoding="utf-8")), key["key"]) != s.read_data(s.PRIVATE / name / "veri.js"):
            sys.exit(f"DUR: {name} hesabının verisi değişmiş ama yeniden şifrelenmemiş. Önce: python araclar/sifrele.py {name}")
        if re.search(rf"\b{re.escape(name)}\b", index_text, re.I):
            sys.exit("DUR: hesaplar.json bir hesap adı içeriyor; herkese açık dosyada isim olmamalı.")
    for name, key in keys.items():
        others = [e for e in index if e["id"] != accounts[name]["id"]]
        if any(s.open_sealed(e["kontrol"], key) is not None for e in others):
            sys.exit(f"DUR: {name} hesabının şifresi başka bir hesabı da açıyor; şifresini değiştir.")
    for e in index:
        if not (s.ROOT / e["dosya"]).exists():
            sys.exit(f"DUR: hesaplar.json'daki {e['dosya']} dosyası yok.")
    print(f"Doğrulama tamam: {len(keys)} hesap, her biri yalnızca kendi verisini açıyor.")


def auto_message() -> str:
    """Değişikliğe göre (isim içermeyen) commit mesajı."""
    old = git("show", "HEAD:hesaplar.json", check=False)
    try:
        before = {e["id"]: e for e in json.loads(old.stdout).get("hesaplar", [])} if old.returncode == 0 else {}
    except ValueError:
        before = {}
    after = {e["id"]: e for e in s.load_json(s.INDEX, {"hesaplar": []}).get("hesaplar", [])}
    if set(after) - set(before):
        return "Yeni hesap eklendi"
    if set(before) - set(after):
        return "Hesap kaldırıldı"
    if any(before[i]["kontrol"] != after[i]["kontrol"] or before[i]["salt"] != after[i]["salt"] for i in after):
        return "Hesap şifresi güncellendi"
    return "Hesap verisi güncellendi"


def repo_slug():
    m = re.search(r"github\.com[:/]([^/]+)/(.+?)(?:\.git)?$", git("remote", "get-url", "origin").stdout.strip())
    return f"{m.group(1)}/{m.group(2)}" if m else None


def wait_for_site(commit: str, changed: list[str]) -> None:
    if not shutil.which("gh"):
        print("GitHub CLI (gh) bulunamadı; sitenin güncellenmesi kontrol edilmedi (genelde 1-2 dakika sürer).")
        return
    slug = repo_slug()
    if not slug:
        return
    print("Site yayınlanıyor", end="", flush=True)
    status = ""
    for _ in range(36):  # en fazla ~6 dakika
        r = run("gh", "api", f"repos/{slug}/pages/builds/latest", "--jq", '.status + " " + .commit', check=False)
        status = r.stdout.strip()
        if status == f"built {commit}":
            break
        if status.startswith("errored"):
            print(f"\nYayın başarısız oldu: {slug} deposunun Actions/Pages sekmesine bak.")
            return
        print(".", end="", flush=True)
        time.sleep(10)
    else:
        print(f"\nYayın henüz bitmedi ({status}); birkaç dakika içinde tamamlanır.")
        return
    print(" tamam.")
    site = run("gh", "api", f"repos/{slug}/pages", "--jq", ".html_url", check=False).stdout.strip()
    if not site:
        return
    site = site.rstrip("/") + "/"
    pending = list(changed)
    for _ in range(6):
        left = []
        for path in pending:
            want = hashlib.sha256(subprocess.run(["git", "show", f"HEAD:{path}"], cwd=s.ROOT, capture_output=True).stdout).hexdigest()
            try:
                req = urllib.request.Request(f"{site}{path}?t={int(time.time())}", headers={"User-Agent": "ders-takip-yayinla"})
                got = hashlib.sha256(urllib.request.urlopen(req, timeout=30).read()).hexdigest()
            except Exception:  # noqa: BLE001 - ağ hatası: yeniden dene
                got = None
            if got != want:
                left.append(path)
        if not left:
            print(f"Sitedeki dosyalar güncel: {site}")
            return
        pending = left
        time.sleep(15)
    print(f"Yayın bitti ama şu dosyalar sitede henüz eski görünüyor (önbellek birkaç dakikada yenilenir): {', '.join(pending)}")


def yayinla(message=None, dry_run=False, wait=True) -> None:
    if not shutil.which("git"):
        sys.exit("git bulunamadı.")
    verify()

    status = [(line[:2], line[3:].strip().strip('"')) for line in git("status", "--porcelain", "--untracked-files=all", "--", *PATHS).stdout.splitlines() if line.strip()]
    changed = [path for _, path in status]
    removed = {path for code, path in status if "D" in code}
    git("fetch", "-q", "origin", check=False)
    ahead = git("rev-list", "--count", "@{u}..HEAD", check=False).stdout.strip()
    behind = git("rev-list", "--count", "HEAD..@{u}", check=False).stdout.strip()
    if behind and behind != "0":
        sys.exit("DUR: GitHub'da bu bilgisayarda olmayan değişiklikler var. Önce: git pull --rebase")

    if not changed:
        if ahead and ahead != "0":
            print(f"Yeni veri değişikliği yok ama gönderilmemiş {ahead} commit var.")
        else:
            print("Yayınlanacak değişiklik yok; site güncel.")
            return
    else:
        message = message or auto_message()
        print("Yayınlanacak dosyalar:")
        for path in changed:
            print(f"  {path}")
        print(f'Commit mesajı: "{message}"')

    if dry_run:
        print("Deneme: hiçbir şey commit edilmedi ve gönderilmedi.")
        return

    if changed:
        git("add", "-A", "--", *PATHS)
        git("commit", "-q", "-m", message, "--", *PATHS)
    push = git("push", "-q", "origin", "HEAD", check=False)
    if push.returncode != 0:
        sys.exit(f"Gönderilemedi:\n{(push.stderr or push.stdout).strip()}\nİnternet bağlantını kontrol edip tekrar çalıştır.")
    commit = git("rev-parse", "HEAD").stdout.strip()
    print(f"GitHub'a gönderildi ({commit[:7]}).")
    if wait:
        wait_for_site(commit, [p for p in changed if p not in removed] or ["hesaplar.json"])
    if "şifre" in (message or ""):
        print("Not: şifresi değişen kullanıcı cihazlarında yeni şifreyle giriş yapmalı; eşitleme açıksa GitHub anahtarını Ayarlar'a bir kez daha yapıştırmalı.")


def main() -> None:
    ap = argparse.ArgumentParser(description="Şifreli hesap verilerini doğrulayıp yayınlar.")
    ap.add_argument("-m", "--mesaj", help="commit mesajı (varsayılan: değişikliğe göre otomatik)")
    ap.add_argument("--deneme", action="store_true", help="yalnızca kontrol et, commit etme ve gönderme")
    ap.add_argument("--beklemeden", action="store_true", help="sitenin güncellenmesini bekleme")
    args = ap.parse_args()
    yayinla(args.mesaj, dry_run=args.deneme, wait=not args.beklemeden)


if __name__ == "__main__":
    main()
