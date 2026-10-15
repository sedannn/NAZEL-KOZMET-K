(function () {
  const el = (t, o = {}, ...c) => { const e = Object.assign(document.createElement(t), o); e.append(...c); return e; };
  let n = 0;
  const alan = (e, inp) => { inp.id = "dp" + (++n); return el("div", {}, el("label", { htmlFor: inp.id }, e), inp); };
  const doldur = (s, bos, liste) => s.replaceChildren(el("option", { value: "" }, bos), ...liste.map(([v, t]) => el("option", { value: v }, t)));
  const sec = (bos, liste, o = {}) => { const s = el("select", o); doldur(s, bos, liste); return s; };
  const kur = (kap) => {
    const m = el("p", { className: "bilgi hidden", role: "status" }); kap.append(m);
    return (t) => { m.textContent = t; m.classList.remove("hidden"); m.scrollIntoView({ block: "nearest" }); };
  };
  const hataMetni = (e) => e.code === "23505" ? "Bu kayıt zaten var (aynı kod veya adres)."
    : e.code === "42501" ? "Bu işlem için yetkiniz yok." : "İşlem yapılamadı: " + e.message;
  const bosYazi = (t) => el("p", { className: "bos" }, t);
  const TUR = { sise: "Şişe", kapak: "Kapak", valf: "Valf", pompa: "Pompa", etiket: "Etiket", kutu: "Kutu", koli: "Koli", diger: "Diğer" };
  const BIRIM = ["adet", "kg", "g", "lt", "ml", "metre"];
  const HAREKET = { mal_kabulu: "Mal kabulü", transfer: "Transfer", uretime_cikis: "Üretime çıkış", uretimden_iade: "Üretimden iade",
    fire: "Fire", sevkiyat: "Sevkiyat", sayim_eksik: "Sayım eksik", sayim_artis: "Sayım fazla", duzeltme: "Düzeltme" };
  const satir = (sb, tablo, id, baslik, alt, aktif, yenile, bildir) => {
    const b = el("button", { type: "button", className: "ikincil-koyu" }, aktif ? "Pasife al" : "Aktif et");
    b.addEventListener("click", async () => {
      const { error } = await sb.from(tablo).update({ aktif: !aktif }).eq("id", id);
      if (error) return bildir(hataMetni(error));
      yenile();
    });
    return el("div", { className: "satir" + (aktif ? "" : " pasif") }, el("div", {}, el("strong", {}, baslik), el("small", {}, alt)), b);
  };

  window.MODUL_MALZEME = {
    async ac(kap, profil, sb) {
      const bildir = kur(kap);
      const aA = el("input", { required: true }), aR = el("input", { required: true }), aG = el("input", { required: true });
      const aForm = el("form", { className: "kart-form" }, el("h3", {}, "Yeni depo adresi"), alan("Alan (örnek: A)", aA),
        alan("Raf (örnek: 01)", aR), alan("Göz (örnek: 03)", aG), el("button", { type: "submit" }, "Adresi kaydet"));
      const aListe = el("div", { className: "liste" });
      const mK = el("input", { required: true }), mAd = el("input", { required: true });
      const mTur = sec("Tür seçin", Object.entries(TUR), { required: true });
      const mBirim = sec("Birim seçin", BIRIM.map((b) => [b, b]), { required: true });
      const mMus = sec("Ortak (müşteriye bağlı değil)", []), mAdr = sec("Varsayılan adres (isteğe bağlı)", []);
      const mKrit = el("input", { type: "number", min: 0, step: "any", placeholder: "0" });
      const mForm = el("form", { className: "kart-form" }, el("h3", {}, "Yeni malzeme kartı"), alan("Malzeme kodu", mK),
        alan("Malzeme adı", mAd), alan("Tür", mTur), alan("Birim", mBirim), alan("Müşteri", mMus), alan("Varsayılan adres", mAdr),
        alan("Kritik stok seviyesi", mKrit), el("button", { type: "submit" }, "Malzemeyi kaydet"));
      const mListe = el("div", { className: "liste" });

      async function yenile() {
        const [ad, mu, ma] = await Promise.all([
          sb.from("depo_adresleri").select("id, kod, aktif").order("kod"),
          sb.from("musteriler").select("id, ad, aktif").order("ad"),
          sb.from("malzemeler").select("id, kod, ad, tur, birim, aktif, kritik_stok, musteriler(ad), depo_adresleri(kod)").order("kod")
        ]);
        const hata = ad.error || mu.error || ma.error;
        if (hata) return bildir("Liste yüklenemedi: " + hata.message);
        aListe.replaceChildren(...(ad.data.length ? ad.data.map((x) => satir(sb, "depo_adresleri", x.id, x.kod, "Depo adresi", x.aktif, yenile, bildir)) : [bosYazi("Henüz depo adresi yok.")]));
        mListe.replaceChildren(...(ma.data.length ? ma.data.map((x) => satir(sb, "malzemeler", x.id, x.kod + " • " + x.ad,
          (TUR[x.tur] || x.tur) + " • " + x.birim + (x.musteriler ? " • " + x.musteriler.ad : "") + (x.depo_adresleri ? " • " + x.depo_adresleri.kod : "")
          + (Number(x.kritik_stok) > 0 ? " • kritik " + x.kritik_stok : ""), x.aktif, yenile, bildir)) : [bosYazi("Henüz malzeme kartı yok.")]));
        doldur(mMus, "Ortak (müşteriye bağlı değil)", mu.data.filter((x) => x.aktif).map((x) => [x.id, x.ad]));
        doldur(mAdr, "Varsayılan adres (isteğe bağlı)", ad.data.filter((x) => x.aktif).map((x) => [x.id, x.kod]));
      }
      aForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const { error } = await sb.from("depo_adresleri").insert({ alan: aA.value.trim().toUpperCase(), raf: aR.value.trim().toUpperCase(), goz: aG.value.trim().toUpperCase() });
        if (error) return bildir(hataMetni(error));
        aForm.reset(); bildir("Depo adresi kaydedildi."); yenile();
      });
      mForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const { error } = await sb.from("malzemeler").insert({ kod: mK.value.trim(), ad: mAd.value.trim(), tur: mTur.value, birim: mBirim.value,
          musteri_id: mMus.value || null, varsayilan_adres_id: mAdr.value || null, kritik_stok: Number(mKrit.value || 0) });
        if (error) return bildir(hataMetni(error));
        mForm.reset(); bildir("Malzeme kartı kaydedildi."); yenile();
      });
      kap.append(el("h2", {}, "Malzeme kartları"), mForm, mListe, el("h2", {}, "Depo adresleri"), aForm, aListe);
      await yenile();
    }
  };

  window.MODUL_KABUL = {
    async ac(kap, profil, sb) {
      const bildir = kur(kap);
      let malz = [], adr = new Map(), anahtar = crypto.randomUUID();
      const mSec = sec("Malzeme seçin", [], { required: true }), pNo = el("input", { required: true });
      const aSec = sec("Depo adresi seçin", [], { required: true });
      const miktar = el("input", { type: "number", min: 0, step: "any", required: true, inputMode: "decimal" });
      const birim = el("small", {}), tSec = sec("Tedarikçi (isteğe bağlı)", []);
      const maliyet = el("input", { type: "number", min: 0, step: "any" }), acik = el("input");
      const mk = alan("Miktar", miktar); mk.append(birim);
      const f = el("form", { className: "kart-form" }, el("h3", {}, "Mal kabulü (depoya giriş)"), alan("Malzeme", mSec),
        alan("Parti numarası", pNo), alan("Depo adresi", aSec), mk, alan("Tedarikçi", tSec),
        alan("Birim maliyet (isteğe bağlı)", maliyet), alan("Açıklama", acik), el("button", { type: "submit" }, "Girişi kaydet"));
      const liste = el("div", { className: "liste" });
      mSec.addEventListener("change", () => { const x = malz.find((y) => y.id === mSec.value); birim.textContent = x ? "Birim: " + x.birim : ""; });

      async function yenile() {
        const [m, a, t, h] = await Promise.all([
          sb.from("malzemeler").select("id, kod, ad, birim").eq("aktif", true).order("kod"),
          sb.from("depo_adresleri").select("id, kod, aktif").order("kod"),
          sb.from("tedarikciler").select("id, ad").eq("aktif", true).order("ad"),
          sb.from("stok_hareketleri").select("id, tur, miktar, zaman, kaynak_adres_id, hedef_adres_id, malzemeler(kod, ad, birim), partiler(parti_no)")
            .order("zaman", { ascending: false }).limit(15)
        ]);
        const hata = m.error || a.error || t.error || h.error;
        if (hata) return bildir("Yüklenemedi: " + hata.message);
        malz = m.data; adr = new Map(a.data.map((x) => [x.id, x.kod]));
        doldur(mSec, "Malzeme seçin", m.data.map((x) => [x.id, x.kod + " • " + x.ad]));
        doldur(aSec, "Depo adresi seçin", a.data.filter((x) => x.aktif).map((x) => [x.id, x.kod]));
        doldur(tSec, "Tedarikçi (isteğe bağlı)", t.data.map((x) => [x.id, x.ad]));
        if (!m.data.length || !a.data.length) bildir("Önce Malzeme ve Depo Adresleri ekranından en az bir malzeme kartı ve bir depo adresi ekleyin.");
        liste.replaceChildren(...(h.data.length ? h.data.map((x) => el("div", { className: "satir" }, el("div", {},
          el("strong", {}, (x.malzemeler ? x.malzemeler.kod + " • " + x.malzemeler.ad : "")),
          el("small", {}, (HAREKET[x.tur] || x.tur) + " • " + x.miktar + " " + (x.malzemeler ? x.malzemeler.birim : "") + " • parti " + (x.partiler ? x.partiler.parti_no : "-")
            + " • " + [adr.get(x.kaynak_adres_id), adr.get(x.hedef_adres_id)].filter(Boolean).join(" → ") + " • " + new Date(x.zaman).toLocaleString("tr-TR"))))) : [bosYazi("Henüz stok hareketi yok.")]));
      }
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const m = malz.find((y) => y.id === mSec.value), no = pNo.value.trim();
        let { data: p } = await sb.from("partiler").select("id").eq("malzeme_id", m.id).eq("parti_no", no).maybeSingle();
        if (!p) {
          const r = await sb.from("partiler").insert({ malzeme_id: m.id, parti_no: no, tedarikci_id: tSec.value || null,
            birim_maliyet: maliyet.value ? Number(maliyet.value) : null }).select("id").single();
          if (r.error) return bildir(hataMetni(r.error));
          p = r.data;
        }
        const { error } = await sb.rpc("hareket_ekle", { p_islem_anahtari: anahtar, p_tur: "mal_kabulu", p_malzeme_id: m.id, p_parti_id: p.id,
          p_miktar: Number(miktar.value), p_hedef: aSec.value, p_aciklama: acik.value.trim() || null });
        if (error) return bildir(hataMetni(error));
        anahtar = crypto.randomUUID(); f.reset(); birim.textContent = "";
        bildir("Mal kabulü kaydedildi: " + m.kod + " • " + miktar.value + " " + m.birim);
        yenile();
      });
      kap.append(f, el("h2", {}, "Son hareketler"), liste);
      await yenile();
    }
  };

  window.MODUL_STOK = {
    async ac(kap, profil, sb) {
      const bildir = kur(kap);
      const ara = el("input", { type: "search", placeholder: "Malzeme kodu veya adı ara", ariaLabel: "Ara" });
      const liste = el("div", { className: "liste" });
      let satirlar = [], kritik = new Map(), birimler = new Map();
      function ciz() {
        const q = ara.value.trim().toLowerCase(), grup = new Map();
        for (const x of satirlar) {
          if (q && !(x.malzeme_kodu + " " + x.malzeme_adi).toLowerCase().includes(q)) continue;
          if (!grup.has(x.malzeme_id)) grup.set(x.malzeme_id, []);
          grup.get(x.malzeme_id).push(x);
        }
        liste.replaceChildren(...(grup.size ? [...grup.values()].map((g) => {
          const id = g[0].malzeme_id, toplam = g.reduce((t, x) => t + Number(x.miktar), 0), bir = birimler.get(id) || "";
          const k = kritik.get(id) || 0;
          return el("div", { className: "satir" }, el("div", {},
            el("strong", {}, g[0].malzeme_kodu + " • " + g[0].malzeme_adi),
            el("small", {}, "Toplam: " + toplam + " " + bir),
            ...g.map((x) => el("small", {}, "Parti " + x.parti_no + " • " + x.adres_kodu + " • " + x.miktar + " " + bir)),
            k > 0 && toplam <= k ? el("span", { className: "rozet" }, "Kritik stok (" + k + ")") : ""));
        }) : [bosYazi(satirlar.length ? "Aramaya uyan stok yok." : "Henüz stok kaydı yok. Mal kabulü yaparak stok girişi yapın.")]));
      }
      ara.addEventListener("input", ciz);
      kap.append(ara, liste);
      const [s, m] = await Promise.all([
        sb.from("guncel_stok").select("malzeme_id, malzeme_kodu, malzeme_adi, parti_no, adres_kodu, miktar").order("malzeme_kodu"),
        sb.from("malzemeler").select("id, birim, kritik_stok")
      ]);
      if (s.error || m.error) return bildir("Stok yüklenemedi: " + (s.error || m.error).message);
      satirlar = s.data; birimler = new Map(m.data.map((x) => [x.id, x.birim])); kritik = new Map(m.data.map((x) => [x.id, Number(x.kritik_stok)]));
      ciz();
    }
  };
})();
