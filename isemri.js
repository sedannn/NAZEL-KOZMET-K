window.MODUL_ISEMRI = {
  async ac(kap, profil, sb) {
    const el = (t, o = {}, ...c) => { const e = Object.assign(document.createElement(t), o); e.append(...c); return e; };
    const rol = profil.rol;
    const olusturur = ["patron", "uretim_sorumlusu"].includes(rol);
    const esansGorur = ["patron", "kimyager"].includes(rol);
    const DURUM = { taslak: "Taslak", planlandi: "Planlandı", uretimde: "Üretimde", tamamlandi: "Tamamlandı", iptal: "İptal" };
    const TUR = { sise: "Şişe", kapak: "Kapak", valf_yuzuk: "Valf / Yüzük", etiket: "Etiket", kutu: "Kutu",
      separator: "Separatör", koli: "Koli", baski: "Baskı / Koli baskısı", diger: "Diğer" };
    const mesaj = el("p", { className: "bilgi hidden", role: "status" });
    const bildir = (m) => { mesaj.textContent = m; mesaj.classList.remove("hidden"); mesaj.scrollIntoView({ block: "nearest" }); };
    const hataMetni = (e) => e.code === "23505" ? "Bu iş emri numarası zaten kullanılıyor."
      : e.code === "42501" ? "Bu işlem için yetkiniz yok." : "İşlem yapılamadı: " + e.message;
    const tarih = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("tr-TR") : "-";
    let n = 0, musteriler = [], urunler = [], isler = [];
    const alan = (e, inp) => { inp.id = "ie" + (++n); return el("div", {}, el("label", { htmlFor: inp.id }, e), inp); };
    const liste = el("div", { className: "liste" });
    const detayKap = el("div");
    let form = null;

    function formKur() {
      const mus = el("select", { required: true }), uru = el("select", { required: true });
      const no = el("input", { required: true }), sip = el("input"), parti = el("input", { required: true });
      const adet = el("input", { type: "number", min: 1, required: true }), teslim = el("input", { type: "date" });
      const koli = el("input", { type: "number", min: 1 }), marka = el("input"), nt = el("textarea", { rows: 5 });
      const eK = el("input"), eO = el("input", { type: "number", step: "0.01", min: 0.01, max: 100 });
      const eG = el("input", { type: "number", step: "0.001", min: 0 });
      const f = el("form", { className: "kart-form" }, el("h3", {}, "Yeni iş emri"),
        alan("Müşteri", mus), alan("Ürün", uru), alan("İş emri numarası", no), alan("Sipariş kodu", sip),
        alan("Parti numarası", parti), alan("Planlanan adet", adet), alan("Teslim tarihi", teslim),
        alan("Koli içi adet", koli), alan("Marka", marka), alan("İş emri notu (çalışanlar görür)", nt));
      if (esansGorur) f.append(el("h3", {}, "Esans bilgisi (sadece yönetici ve kimyager görür)"),
        alan("Esans kodu", eK), alan("Esans oranı (%)", eO), alan("Esans miktarı (kg)", eG));
      f.append(el("button", { type: "submit" }, "İş emrini kaydet"));

      const musSec = () => mus.replaceChildren(el("option", { value: "" }, "Müşteri seçin"),
        ...musteriler.filter((x) => x.aktif).map((x) => el("option", { value: x.id }, x.ad)));
      const uruSec = () => uru.replaceChildren(el("option", { value: "" }, "Ürün seçin"),
        ...urunler.filter((x) => x.aktif && x.musteri_id === mus.value).map((x) => el("option", { value: x.id }, x.kod + " • " + x.ad)));
      const yeniNo = async () => {
        const g = new Date().toISOString().slice(2, 10).replace(/-/g, "");
        const { count } = await sb.from("is_emirleri").select("id", { count: "exact", head: true }).like("is_emri_no", "IE-" + g + "-%");
        no.value = "IE-" + g + "-" + String((count || 0) + 1).padStart(2, "0");
      };
      mus.addEventListener("change", uruSec);
      uru.addEventListener("change", () => {
        const u = urunler.find((x) => x.id === uru.value);
        if (u) { marka.value = u.marka || ""; koli.value = u.koli_ici_adet || ""; nt.value = u.uretim_notu || ""; }
      });
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const { data: ie, error } = await sb.from("is_emirleri").insert({
          is_emri_no: no.value.trim(), musteri_id: mus.value, urun_id: uru.value, siparis_kodu: sip.value.trim() || null,
          parti_no: parti.value.trim(), planlanan_adet: Number(adet.value), teslim_tarihi: teslim.value || null,
          koli_ici_adet: koli.value ? Number(koli.value) : null, marka: marka.value.trim() || null,
          is_emri_notu: nt.value.trim() || null, durum: "taslak" }).select("id").single();
        if (error) return bildir(hataMetni(error));
        let uyari = "";
        const { data: amb } = await sb.from("urun_ambalaj").select("tur, aciklama").eq("urun_id", uru.value).order("olusturma");
        if (amb && amb.length) {
          const r = await sb.from("is_emri_ambalaj").insert(amb.map((a, i) => ({ is_emri_id: ie.id, tur: a.tur, aciklama: a.aciklama, sira: i + 1 })));
          if (r.error) uyari += " Ambalaj bilgisi kopyalanamadı: " + r.error.message;
        }
        if (esansGorur && eO.value) {
          const r = await sb.from("is_emri_esans").insert({ is_emri_id: ie.id, esans_kodu: eK.value.trim() || null,
            esans_orani: Number(eO.value), esans_kg: eG.value ? Number(eG.value) : null });
          if (r.error) uyari += " Esans bilgisi kaydedilemedi: " + r.error.message;
        }
        f.reset(); uruSec(); yeniNo();
        bildir("İş emri taslak olarak kaydedildi. Üretime göndermek için listeden açın." + uyari);
        await yenile();
      });
      return { f, musSec, uruSec, yeniNo };
    }

    async function durumDegis(id, yeni, soru) {
      if (soru && !confirm(soru)) return;
      const { data, error } = await sb.from("is_emirleri").update({ durum: yeni }).eq("id", id).select("id");
      if (error) return bildir(hataMetni(error));
      if (!data.length) return bildir("Değiştirilemedi. Yetkinizi kontrol edin.");
      bildir("Durum güncellendi: " + DURUM[yeni]);
      await yenile(); await detay(id);
    }

    async function detay(id) {
      detayKap.replaceChildren();
      const ie = isler.find((x) => x.id === id);
      if (!ie) return;
      const [a, es, at] = await Promise.all([
        sb.from("is_emri_ambalaj").select("tur, aciklama").eq("is_emri_id", id).order("sira"),
        esansGorur ? sb.from("is_emri_esans").select("esans_kodu, esans_orani, esans_kg").eq("is_emri_id", id).maybeSingle() : { data: null },
        rol === "patron" ? sb.from("is_emri_atamalari").select("kullanici_id, profiller(ad_soyad, kullanici_adi)").eq("is_emri_id", id) : { data: null }
      ]);
      const satirlar = [["Müşteri", ie.musteriler && ie.musteriler.ad], ["Marka", ie.marka], ["Sipariş kodu", ie.siparis_kodu],
        ["Parti numarası", ie.parti_no], ["Planlanan adet", ie.planlanan_adet], ["Teslim tarihi", ie.teslim_tarihi ? tarih(ie.teslim_tarihi) : null],
        ["Koli içi adet", ie.koli_ici_adet]];
      detayKap.append(el("h2", {}, "İş emri detayı"),
        el("div", { className: "kart-form" }, el("h3", {}, ie.is_emri_no + " • " + (ie.urunler ? ie.urunler.ad : "")),
          el("span", { className: "rozet" }, DURUM[ie.durum]),
          ...satirlar.map(([k, v]) => el("p", {}, k + ": " + (v || "-"))),
          el("p", { className: "not" }, ie.is_emri_notu || "İş emri notu yok.")));
      const am = el("div", { className: "liste" });
      if (a.error || !a.data.length) am.append(el("p", { className: "bos" }, "Ambalaj bileşeni girilmemiş."));
      else for (const x of a.data) am.append(el("div", { className: "satir" }, el("div", {}, el("strong", {}, TUR[x.tur] || x.tur), el("small", {}, x.aciklama))));
      detayKap.append(el("h2", {}, "Ambalaj ve malzemeler"), am);

      if (esansGorur) {
        const d = es.data;
        detayKap.append(el("h2", {}, "Esans (gizli)"), el("div", { className: "kart-form" },
          el("p", {}, d ? "Kod: " + (d.esans_kodu || "-") + " • Oran: %" + d.esans_orani + " • Miktar: " + (d.esans_kg || "-") + " kg" : "Esans bilgisi girilmemiş.")));
      }
      if (rol === "patron" && at.data) {
        const liste2 = el("div", { className: "liste" });
        if (!at.data.length) liste2.append(el("p", { className: "bos" }, "Henüz çalışan atanmamış."));
        for (const x of at.data) {
          const b = el("button", { type: "button", className: "ikincil-koyu" }, "Kaldır");
          b.addEventListener("click", async () => {
            const { error } = await sb.from("is_emri_atamalari").delete().eq("is_emri_id", id).eq("kullanici_id", x.kullanici_id);
            if (error) return bildir(hataMetni(error));
            detay(id);
          });
          const p = x.profiller || {};
          liste2.append(el("div", { className: "satir" }, el("div", {}, el("strong", {}, p.ad_soyad || p.kullanici_adi || "Çalışan")), b));
        }
        const { data: cal } = await sb.from("profiller").select("id, ad_soyad, kullanici_adi").eq("rol", "uretim_calisani").eq("aktif", true);
        const sec = el("select", { ariaLabel: "Çalışan" }, el("option", { value: "" }, "Çalışan seçin"),
          ...(cal || []).map((c) => el("option", { value: c.id }, c.ad_soyad || c.kullanici_adi)));
        const ata = el("button", { type: "button" }, "Çalışanı ata");
        ata.addEventListener("click", async () => {
          if (!sec.value) return bildir("Önce bir çalışan seçin.");
          const { error } = await sb.from("is_emri_atamalari").insert({ is_emri_id: id, kullanici_id: sec.value });
          if (error) return bildir(error.code === "23505" ? "Bu çalışan zaten atanmış." : hataMetni(error));
          detay(id);
        });
        detayKap.append(el("h2", {}, "Atanan çalışanlar"), liste2, el("div", { className: "kart-form" }, sec, ata));
      }
      if (olusturur) {
        const k = el("div", { className: "kart-form" }, el("h3", {}, "Durum"));
        const dugme = (yazi, yeni, soru) => { const b = el("button", { type: "button" }, yazi); b.addEventListener("click", () => durumDegis(id, yeni, soru)); k.append(b); };
        if (["taslak", "planlandi"].includes(ie.durum)) dugme("Üretime gönder", "uretimde",
          "İş emri üretime gönderilsin mi? Atanan çalışanlar talimatı görebilir.");
        if (ie.durum === "uretimde") dugme("Tamamlandı olarak işaretle", "tamamlandi", "İş emri tamamlandı olarak işaretlensin mi?");
        if (!["tamamlandi", "iptal"].includes(ie.durum)) dugme("İş emrini iptal et", "iptal", "İş emri iptal edilsin mi?");
        if (k.children.length > 1) detayKap.append(k);
      }
      detayKap.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    async function yenile() {
      const [m, u, i] = await Promise.all([
        olusturur ? sb.from("musteriler").select("id, ad, aktif").order("ad") : { data: [] },
        olusturur ? sb.from("urunler").select("id, kod, ad, aktif, musteri_id, marka, koli_ici_adet, uretim_notu").order("ad") : { data: [] },
        sb.from("is_emirleri").select("id, is_emri_no, durum, planlanan_adet, teslim_tarihi, parti_no, siparis_kodu, marka, koli_ici_adet, is_emri_notu, musteriler(ad), urunler(kod, ad)")
          .order("olusturma", { ascending: false })
      ]);
      const hata = m.error || u.error || i.error;
      if (hata) return bildir("Yüklenemedi: " + hata.message);
      musteriler = m.data; urunler = u.data; isler = i.data;
      if (form) { form.musSec(); form.uruSec(); }
      liste.replaceChildren(...(isler.length ? isler.map((x) => {
        const b = el("button", { type: "button", className: "satir satir-btn" }, el("div", {},
          el("strong", {}, x.is_emri_no + " • " + (x.urunler ? x.urunler.ad : "")),
          el("small", {}, (x.musteriler ? x.musteriler.ad : "") + " • " + x.planlanan_adet + " adet • teslim " + tarih(x.teslim_tarihi)),
          el("span", { className: "rozet" }, DURUM[x.durum])));
        b.addEventListener("click", () => detay(x.id));
        return b;
      }) : [el("p", { className: "bos" }, olusturur ? "Henüz iş emri yok." : "Size atanmış iş emri yok.")]));
    }

    kap.append(mesaj);
    if (olusturur) { form = formKur(); kap.append(form.f); }
    kap.append(el("h2", {}, "İş emirleri"), liste, detayKap);
    await yenile();
    if (form) await form.yeniNo();
  }
};
