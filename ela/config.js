/* =====================================================================
   ELA'NIN DOĞUM GÜNÜ MACERASI · İçerik dosyası
   ---------------------------------------------------------------------
   Sitedeki bütün yazılar burada. Kod bilmene gerek yok, tırnak içindeki
   yazıları değiştirmen yeterli. (Tırnak işaretlerini ve virgülleri silme.)

   ✏️ işaretli yerler senin doldurman için bırakıldı. Siteyi bilgisayarında
   (localhost) açınca ekranın altında kaç tane kaldığı yazar.
   Yayına almadan önce hepsini doldurduğundan emin ol!
   ===================================================================== */

window.ELA = {
  isim: 'Ela',
  lakap: 'elos',     // mektupta ve finalde böyle hitap edilir
  yas: 22,
  gonderen: 'Gökhan',
  rehber: 'Lina',    // oyundaki rehber kedinin adı
  gozluk: false,     // piksel Ela gözlüklü olsun mu? (true = evet)

  /* -------------------------------------------------------------------
     BÖLÜM 1 · BİLGİ YARIŞMASI  (konusu: Ela!)
     dogru: doğru şıkkın sırası → 0 = ilk şık, 1 = ikinci, 2 = üçüncü, 3 = dördüncü
     Soru ekleyip silebilirsin, kaç tane olursa olsun çalışır.
     ------------------------------------------------------------------- */
  quiz: [
    {
      soru: 'Isınma sorusu: en sevdiğin çiçek?',
      secenekler: ['gül', 'zambak', 'papatya', 'lale'],
      dogru: 1,
    },
    {
      soru: 'en çok sevdiğin hayvan?',
      secenekler: ['köpek', 'tavşan', 'kedi', 'kaplumbağa'],
      dogru: 2,
    },
    {
      soru: 'iclerinden en sevdigin oyun?',
      secenekler: ['stardew valley', 'minecraft', 'undertale', 'overwatch'],
      dogru: 0,
    },
    {
      soru: 'hangi rengi daha az seviyon?',
      secenekler: ['kirmizi', 'yeşil', 'pembe', 'kahverengi'],
      dogru: 2,
    },
    {
      soru: 'gokanla nerede tanistiniz',
      secenekler: ['partide', 'valorant', 'sokakta', 'hatirlamiyorum'],
      dogru: 1,
    },
    {
      soru: 'son soru bu oyunu kim yapti',
      secenekler: ['Lina', 'Gökhan', 'bir cicek', 'Kendiliğinden oldu'],
      dogru: 1,
    },
    
  ],

  // Yanlış cevapta rastgele biri çıkar
  yanlisTepkiler: [
    'hmm... emin misin?',
    'lina duymasın!',
    'kendini mi unuttun(yoksa gökan mı seni tanimiyor)?',
    'Yaklaştın! (Yaklasmadin.)',
    'bir daha dene, basarirsinnn!',
    'Kediler bile biliyo bunu.',
    'miyav! (Çeviri: APOIDSjPOAIWJHDAPDWOAVWPD!)',
  ],
  // Doğru cevapta rastgele biri çıkar
  dogruTepkiler: ['DOĞRU!', 'harikasinn', 'tabii ki! 😺', 'kusursuz!', 'aynen öyle!'],

  /* -------------------------------------------------------------------
     BÖLÜM 2 · BALON FESTİVALİ
     Her mesaj ✉ işaretli bir balondan çıkar. İstediğin kadar ekle/sil.
     Örnek: 'O gün yağmurda şemsiyesiz kaldığımızı hatırlıyor musun? 😄'
     ------------------------------------------------------------------- */
  balonlar: [
    'gece ciğer yemeye gittigimiz günü hatırlıyormusun?',
    'seni yıldızlardan veya herhangi bir şeyden daha çok seviyorum.',
    'sesin çok güzeeeell',
    'umarim istediğin her şey olur her şeyin en güzelini hakedion',
    'denizi sevme sebebim sensin',
    'göbüsünü cok seviyom coooook tatli bu arada',
    'seni cok kötü cizdim özür dilerim gercekte cok güzelsinnn',
    'mutlu oldugunu bilmek beni cok hos hissettiriyo',
    'gözlerin çok güzel',
    'hayatindaki hedeflerine ulasmani cok istiyorum ve o günleri görmek için sabırsızlanıyorum.',
  ],

  /* -------------------------------------------------------------------
     ANI KARTLARI · her bölümün sonunda bir tanesi açılır (sırayla 1, 2, 3)
     odak: fotoğraf kare kırpılırken nereye odaklansın (0 = üst, 0.5 = orta, 1 = alt)
     ------------------------------------------------------------------- */
  anilar: [
    { foto: 'foto/kedi.jpg', odak: 0.35, not: 'kedi + sen = dünyanın en guzek ikinci çifti.' },
    { foto: 'foto/balon.jpg', odak: 0.5, not: 'bugün cok güzeldiii susiciye gidek bi ara yine' },
    { foto: 'foto/zambak.jpg', odak: 0.45, not: 'cicekler sana çok yakışıyor. 🌸' },
  ],

  /* -------------------------------------------------------------------
     FİNAL · ANI ALBÜMÜ (yukarıdan aşağı = albümdeki sıra)
     Çıkarmak istediğin fotoğrafın satırını silmen yeterli.
     ------------------------------------------------------------------- */
  album: [
    { foto: 'foto/bebek.jpg', etiket: 'KAYIT 01', not: 'minicik elos' },
    { foto: 'foto/ordek.jpg', etiket: 'KAYIT 02', not: 'GÜLÜSE BAK' },
    { foto: 'foto/tac.jpg', etiket: 'KAYIT 03', not: 'allam yicem' },
    { foto: 'foto/kedi-makyaj.jpg', etiket: 'KAYIT 04', not: 'KEDİ OLMUS PQWOIEQPN' },
    { foto: 'foto/sapka.jpg', etiket: 'KAYIT 05', not: 'Dogum günü sapkasii' },
    { foto: 'foto/sahil.jpg', etiket: 'KAYIT 06', not: 'bu fotoda cok tatlisin kiz' },
    { foto: 'foto/gulumseme.jpg', etiket: 'KAYIT 07', not: 'gülüsüne kurban' },
    { foto: 'foto/kirmizi.jpg', etiket: 'KAYIT 08', not: 'kirmizi sana yakisiyo he' },
    { foto: 'foto/kedi.jpg', etiket: 'KAYIT 09', not: 'kedi+elos' },
    { foto: 'foto/zambak.jpg', etiket: 'KAYIT 10', not: 'cicek kiz' },
    { foto: 'foto/balon.jpg', etiket: 'KAYIT 11', not: 'Kalpli balon' },
    { foto: 'foto/kamera.jpg', etiket: 'KAYIT 12', not: 'profesyonel fotografci' },
    { foto: 'foto/ayna.jpg', etiket: 'KAYIT 13', not: 'tatlis foto' },
    { foto: 'foto/yanak.jpg', etiket: 'KAYIT 14', not: 'ooo konser günü fena iyiydi' },
  ],

  /* -------------------------------------------------------------------
     FİNAL · MEKTUP  (✏️ bu bir taslak, istediğin gibi değiştir)
     Satır atlamak için Enter'a basman yeterli. İmza otomatik eklenir.
     ------------------------------------------------------------------- */
  mektup: `Sevgili Elos,

İyi ki doğdun elossss 22. yasina hos geldin.

Sana sıradan bir mesaj atmak yerine küçük bir oyun yapmak istedim. Çünkü sen biraz sürprizi ve her güzel seyi hak ediyorsun.

Seni düşününce aklıma hep güzel şeyler geliyor: tatlis seyler görünce o GÜLÜMSEMEN, ciceklere ve yasama olan sevgin, o MİNNOS yanaklarin, ve herseye ragmen bunca yıl cabalayışın... Bunları hatırlamak bile hâlâ yüzümü gülümsetiyor.

Hayat herkesi kendi yoluna sürüklüyor ama şunu bilmeni istiyom: senin icin her zaman en güzelini diliyorum. Bu yeni yaşında yüzün hiç düşmesin; sevdiğin insanlarla, sevdiğin şeylerle dolu bir yıl olsun.

Bu yasinda açacağın her kilit, kazanacağın her başarı seni mutlu etsin. Bölüm sonu canavarları kolay gelsin, yasamin hep doludolu olsun. ❤

İyi ki doğdun, iyi ki varsın.`,
};
