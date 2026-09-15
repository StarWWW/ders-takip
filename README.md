# Ders Takip

Kişisel ders programı, devamsızlık, not ve GNO takip uygulaması. Tek sayfalık, bağımlılıksız bir statik sitedir ve GitHub Pages üzerinde çalışır.

## Güvenlik modeli

- Kişisel veriler (ders listesi, transkript, isim) **`veri.enc.json` içinde şifrelidir**: AES-256-GCM, anahtar şifreden PBKDF2-SHA256 (600.000 tur) ile türetilir.
- Şifre çözme tamamen tarayıcıda (WebCrypto) yapılır; şifre hiçbir sunucuya gönderilmez.
- Şifresiz kaynak veri (`ozel/veri.js`) ve türetilmiş anahtar (`ozel/anahtar.json`) yalnızca yerel bilgisayarda durur ve `.gitignore` ile depodan hariç tutulur.
- Yoklama, not, görev gibi kayıtlar tarayıcıda (localStorage) tutulur ve **otomatik eşitleme** açıksa gizli bir GitHub Gist'e şifreli olarak gönderilir.

## Cihazlar arası eşitleme

- Gist kimliği şifreli verinin içindedir (`sync.gistId`); Gist'te `durum.enc.json` (kayıtlar) ve `erisim.enc.json` (erişim anahtarı) bulunur. İkisi de site şifresinden türetilen anahtarla AES-256-GCM ile şifrelenir.
- Kurulum bir kez yapılır: Ayarlar → Cihazlar arası eşitleme. Yalnızca **Gists: Read and write** izni olan ince ayarlı (fine-grained) bir GitHub erişim anahtarı yapıştırılır. Diğer cihazlar kilidi açınca anahtarı otomatik alır.
- Birleştirme kayıt bazındadır: her yoklama, not, görev ve ayarın kendi zaman damgası vardır, en yeni değişiklik kazanır; silmeler de eşitlenir. Tema cihaza özeldir.
- Kapatmak için Ayarlar → "Tüm cihazlarda kapat", ardından GitHub → Settings → Developer settings → Personal access tokens üzerinden anahtarı iptal et.
- Sayfa `noindex` ve `robots.txt` ile arama motorlarına kapalıdır; Content-Security-Policy yalnızca kendi dosyalarına ve Google Fonts'a izin verir.

## Veriyi güncelleme

1. `ozel/veri.js` dosyasını düzenle (ör. şubeler açıklandığında `"sections": { "BIL101": "A", ... }`).
2. Şifrele:
   ```bash
   python araclar/sifrele.py
   ```
   İlk çalıştırmada şifre sorar; sonrakilerde kayıtlı anahtarı kullanır. Şifreyi değiştirmek için `--yeni-sifre`.
3. `veri.enc.json` dosyasını commit edip push'la.

Gereksinim: `python -m pip install cryptography`

## Yerelde çalıştırma

```bash
python -m http.server 8765
```

`http://localhost:8765` adresinde `ozel/veri.js` varsa şifre sorulmadan açılır; şifreli akışı denemek için `?kilit=1` ekle.
