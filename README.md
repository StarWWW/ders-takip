# Ders Takip

Ders programı, devamsızlık, not ve GNO takip uygulaması. Tek sayfalık, bağımlılıksız bir statik sitedir ve GitHub Pages üzerinde çalışır. Birden fazla kullanıcıyı destekler: her kullanıcı kendi şifresiyle yalnızca kendi bilgilerini görür. Kullanıcılar farklı üniversitelerden olabilir; ders saatleri, harf notu tablosu, devam kuralları ve yönetmelik metinleri her hesabın kendi verisindedir.

## Güvenlik modeli

- Her hesabın kişisel verisi (ders listesi, transkript, isim, üniversite kuralları) **`veri/<kimlik>.enc.json` içinde şifrelidir**: AES-256-GCM, anahtar şifreden PBKDF2-SHA256 (600.000 tur) ile türetilir.
- `hesaplar.json` yalnızca rastgele hesap kimliklerini, dosya adlarını, PBKDF2 tuzunu ve bir doğrulama bloğunu içerir; isim ya da kişisel bilgi içermez. Kilit ekranı girilen şifreden anahtarı türetir, doğrulama bloğunu çözebildiği hesabı açar.
- Şifre çözme tamamen tarayıcıda (WebCrypto) yapılır; şifre hiçbir sunucuya gönderilmez.
- Şifresiz kaynak veriler ve türetilmiş anahtarlar (`ozel/`) yalnızca yerel bilgisayarda durur ve `.gitignore` ile depodan hariç tutulur.
- Yoklama, not, görev gibi kayıtlar tarayıcıda (localStorage) her hesap için ayrı önekle tutulur; **otomatik eşitleme** açıksa gizli bir GitHub Gist'e şifreli olarak gönderilir.
- Ek sertleştirmeler: sayfa başka bir sitenin içine çerçevelenemez (tıklama hırsızlığı); veriden gelen bağlantılar yalnızca `http(s)` olabilir; "Bu cihazda açık kalsın" seçilince uygulama anahtarın dışa aktarılamaz kopyasını kullanır; eşitlemeden gelen anahtarlar `__proto__`/`constructor` gibi adları kabul etmez ve kayıt sayıları sınırlıdır.
- Şifreli dosyalar herkese açık depoda durduğu için tek koruma şifrenin gücüdür: 4-5 rastgele kelimeden oluşan bir parola önerilir (anahtar türetme PBKDF2-SHA256, 600.000 tur).

## Cihazlar arası eşitleme

- Gist'te `durum.enc.json` (kayıtlar) ve `erisim.enc.json` (erişim anahtarı) bulunur; ikisi de hesabın site şifresinden türetilen anahtarla AES-256-GCM ile şifrelenir.
- Hesabın verisinde Gist kimliği varsa (`sync.gistId`) kurulum bir kez yapılır; diğer cihazlar kilidi açınca erişim anahtarını otomatik alır.
- Kimlik yoksa (yeni kullanıcı): kullanıcı kendi GitHub hesabında **Gists: Read and write** izinli ince ayarlı (fine-grained) bir erişim anahtarı oluşturup Ayarlar'a yapıştırır. Uygulama bu hesabın anahtarıyla çözülebilen kaydı kullanıcının Gist'leri arasında arar, yoksa yeni gizli Gist oluşturur. Diğer cihazlarda da anahtar bir kez yapıştırılır.
- Birleştirme kayıt bazındadır: her yoklama, not, görev ve ayarın kendi zaman damgası vardır, en yeni değişiklik kazanır; silmeler de eşitlenir. Tema cihaza özeldir.
- Kapatmak için Ayarlar → "Tüm cihazlarda kapat", ardından GitHub → Settings → Developer settings → Personal access tokens üzerinden anahtarı iptal et.
- Sayfa `noindex` ve `robots.txt` ile arama motorlarına kapalıdır; Content-Security-Policy yalnızca kendi dosyalarına, GitHub API'ye ve Google Fonts'a izin verir.

## Veriyi güncelleme

1. `ozel/<hesap>/veri.js` dosyasını düzenle (ör. şubeler açıklandığında `"sections": { "DERS101": "A", ... }`).
2. Şifrele:
   ```bash
   python araclar/sifrele.py
   ```
   Tüm hesapları kayıtlı anahtarlarıyla şifreler ve `hesaplar.json`'u yeniler; içeriği değişmeyen dosyalara dokunmaz. Tek hesap için `python araclar/sifrele.py <hesap>`, şifre değiştirmek için `--yeni-sifre`.
3. `veri/` ve `hesaplar.json` değişikliklerini commit edip push'la.

## Yeni kullanıcı ekleme

1. `python araclar/sifrele.py --yeni-hesap <ad>` — rastgele kimlik ve `ozel/<ad>/` klasörü oluşturulur.
2. Kullanıcının verisini `ozel/<ad>/veri.js` dosyasına koy (biçim için mevcut bir hesabın dosyasına bak: `universite.saatler`, `kurallar`, `takvim`, `courses`, `transcript`).
3. Terminalde `python araclar/sifrele.py <ad> --yeni-sifre` çalıştırıp kullanıcının şifresini belirle (başka bir hesabın şifresiyle aynı olamaz).
4. `veri/` ve `hesaplar.json` değişikliklerini commit edip push'la.

Gereksinim: `python -m pip install cryptography`

## Yerelde çalıştırma

```bash
python -m http.server 8765
```

`http://localhost:8765` adresinde `ozel/` varsa şifre sorulmadan ilk hesap açılır; başka hesap için `?hesap=<ad>`, şifreli akışı denemek için `?kilit=1` ekle.
