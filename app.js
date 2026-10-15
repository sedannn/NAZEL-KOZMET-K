const C = window.NAZELI_CONFIG;
const sb = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANAHTAR);
const $ = (id) => document.getElementById(id);
let PROFIL = null;

const ROL_ADI = {
  patron: "Yönetici", kimyager: "Kimyager", uretim_calisani: "Üretim Çalışanı",
  depocu: "Depo Sorumlusu", muhasebeci: "Muhasebe", uretim_sorumlusu: "Üretim Sorumlusu"
};
const TUM = Object.keys(ROL_ADI);

// Menüyü sadece gösterimi belirler. Gerçek yetki kontrolü Supabase'deki kurallardadır.
const MODULLER = [
  { ad: "Müşteriler ve Ürünler", ikon: "🏷️", alt: "Müşteri ve ürün kayıtları", roller: ["patron", "uretim_sorumlusu"], modul: () => window.MODUL_MUSTERI },
  { ad: "Stok Sorgulama", ikon: "📦", alt: "Malzemeyi ve yerini bul", faz: 2, roller: ["patron", "depocu", "uretim_sorumlusu", "muhasebeci"] },
  { ad: "Mal Kabulü ve Çıkış", ikon: "📥", alt: "Giriş, çıkış, iade, fire", faz: 3, roller: ["patron", "depocu"] },
  { ad: "İş Emirleri", ikon: "🧾", alt: "Üretim planlama", faz: 4, roller: TUM },
  { ad: "Üretim Talimatları", ikon: "📋", alt: "Ürüne özel ambalaj ve notlar", faz: 4, roller: TUM, modul: () => window.MODUL_URUN },
  { ad: "Kimyager / Karışım", ikon: "🧪", alt: "Reçete ve esans hazırlama", faz: 5, roller: ["patron", "kimyager"] },
  { ad: "Üretim ve Dolum", ikon: "🧴", alt: "Adet, fire, numune", faz: 6, roller: ["patron", "uretim_sorumlusu", "uretim_calisani"] },
  { ad: "Kalite Kontrol", ikon: "✅", alt: "Test ve onay takibi", faz: 6, roller: ["patron", "uretim_sorumlusu", "kimyager"] },
  { ad: "Sevkiyat ve Raporlar", ikon: "🚚", alt: "Koli ve sevk adetleri", faz: 7, roller: ["patron", "depocu", "muhasebeci"] }
];

function goster(id) {
  for (const x of ["yukleniyor", "giris", "uygulama", "modul"]) $(x).classList.toggle("hidden", x !== id);
}
function girisHata(m) { $("giris-hata").textContent = m || ""; }

function menuCiz(profil) {
  PROFIL = profil;
  $("kullanici-bilgi").textContent = (profil.ad_soyad || profil.kullanici_adi || "") + " • " + (ROL_ADI[profil.rol] || profil.rol);
  const kap = $("moduller");
  kap.replaceChildren();
  $("bilgi").classList.add("hidden");
  for (const m of MODULLER.filter((x) => x.roller.includes(profil.rol))) {
    const b = document.createElement("button");
    b.className = "tile";
    const ikon = document.createElement("span"); ikon.className = "ikon"; ikon.textContent = m.ikon;
    const ad = document.createElement("strong"); ad.textContent = m.ad;
    const alt = document.createElement("small"); alt.textContent = m.alt;
    const durum = document.createElement("em"); durum.textContent = m.modul ? "Aç" : "Henüz eklenmedi";
    b.append(ikon, ad, alt, durum);
    b.addEventListener("click", async () => {
      if (m.modul) { await modulAc(m); return; }
      const bilgi = $("bilgi");
      bilgi.textContent = m.ad + " ekranı henüz hazır değil. Planda " + m.faz + ". aşamada eklenecek.";
      bilgi.classList.remove("hidden");
    });
    kap.append(b);
  }
  goster("uygulama");
}

async function profilYukle(user) {
  const { data, error } = await sb.from("profiller")
    .select("ad_soyad, kullanici_adi, rol, aktif").eq("id", user.id).single();
  if (error || !data || !data.aktif) {
    await sb.auth.signOut();
    girisHata("Hesabınız aktif değil. Yöneticiye başvurun.");
    return goster("giris");
  }
  menuCiz(data);
}

$("giris-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  girisHata("");
  const kadi = $("kadi").value.trim().toLowerCase();
  $("giris-btn").disabled = true;
  try {
    const { data, error } = await sb.auth.signInWithPassword({
      email: kadi + "@" + C.KULLANICI_ALAN_ADI,
      password: $("sifre").value
    });
    if (error) { girisHata("Kullanıcı adı veya şifre hatalı."); return; }
    $("sifre").value = "";
    await profilYukle(data.user);
  } catch (err) {
    girisHata("Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.");
  } finally {
    $("giris-btn").disabled = false;
  }
});

$("cikis").addEventListener("click", async () => {
  await sb.auth.signOut();
  goster("giris");
});

async function modulAc(m) {
  $("modul-baslik").textContent = m.ad;
  const kap = $("modul-icerik");
  kap.replaceChildren();
  goster("modul");
  try { await m.modul().ac(kap, PROFIL, sb); }
  catch (err) { kap.textContent = "Ekran açılamadı: " + err.message; }
}
$("modul-geri").addEventListener("click", () => goster("uygulama"));

(async function baslat() {
  try {
    const { data } = await sb.auth.getSession();
    if (data.session) await profilYukle(data.session.user); else goster("giris");
  } catch (err) {
    goster("giris");
    girisHata("Bağlantı kurulamadı. Sayfayı yenileyin.");
  }
})();
