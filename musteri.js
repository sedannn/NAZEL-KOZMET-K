window.MODUL_MUSTERI = {
  async ac(kap, profil, sb) {
    const el = (t, o = {}, ...c) => { const e = Object.assign(document.createElement(t), o); e.append(...c); return e; };
    const mesaj = el("p", { className: "bilgi hidden", role: "status" });
    const bildir = (m) => { mesaj.textContent = m; mesaj.classList.remove("hidden"); };
    const hataMetni = (e) => e.code === "23505" ? "Bu kayıt zaten var (aynı ad veya kod)."
      : e.code === "42501" ? "Bu işlem için yetkiniz yok." : "Kayıt yapılamadı: " + e.message;

    const mAd = el("input", { required: true, placeholder: "Müşteri adı", ariaLabel: "Müşteri adı" });
    const mYetkili = el("input", { placeholder: "Yetkili kişi (isteğe bağlı)", ariaLabel: "Yetkili kişi" });
    const mTel = el("input", { type: "tel", placeholder: "Telefon (isteğe bağlı)", ariaLabel: "Telefon" });
    const mForm = el("form", { className: "kart-form" }, el("h3", {}, "Yeni müşteri"), mAd, mYetkili, mTel,
      el("button", { type: "submit" }, "Müşteriyi kaydet"));
    const mListe = el("div", { className: "liste" });

    const uMus = el("select", { required: true, ariaLabel: "Müşteri" });
    const uKod = el("input", { required: true, placeholder: "Ürün kodu", ariaLabel: "Ürün kodu" });
    const uAd = el("input", { required: true, placeholder: "Ürün adı", ariaLabel: "Ürün adı" });
    const uForm = el("form", { className: "kart-form" }, el("h3", {}, "Yeni ürün"), uMus, uKod, uAd,
      el("button", { type: "submit" }, "Ürünü kaydet"));
    const uListe = el("div", { className: "liste" });

    const satir = (baslik, alt, aktif, tablo, id) => {
      const b = el("button", { type: "button", className: "ikincil-koyu" }, aktif ? "Pasife al" : "Aktif et");
      b.addEventListener("click", async () => {
        const { error } = await sb.from(tablo).update({ aktif: !aktif }).eq("id", id);
        if (error) return bildir(hataMetni(error));
        yenile();
      });
      return el("div", { className: "satir" + (aktif ? "" : " pasif") },
        el("div", {}, el("strong", {}, baslik), el("small", {}, alt)), b);
    };
    const bos = (t) => el("p", { className: "bos" }, t);

    async function yenile() {
      const [m, u] = await Promise.all([
        sb.from("musteriler").select("id, ad, yetkili, telefon, aktif").order("ad"),
        sb.from("urunler").select("id, kod, ad, aktif, musteriler(ad)").order("ad")
      ]);
      const hata = m.error || u.error;
      if (hata) return bildir("Liste yüklenemedi: " + hata.message);
      mListe.replaceChildren(...(m.data.length
        ? m.data.map((x) => satir(x.ad, [x.yetkili, x.telefon].filter(Boolean).join(" • ") || "Yetkili bilgisi yok", x.aktif, "musteriler", x.id))
        : [bos("Henüz müşteri eklenmedi.")]));
      uListe.replaceChildren(...(u.data.length
        ? u.data.map((x) => satir(x.kod + " • " + x.ad, x.musteriler ? x.musteriler.ad : "", x.aktif, "urunler", x.id))
        : [bos("Henüz ürün eklenmedi.")]));
      uMus.replaceChildren(el("option", { value: "" }, "Müşteri seçin"),
        ...m.data.filter((x) => x.aktif).map((x) => el("option", { value: x.id }, x.ad)));
    }

    mForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const { error } = await sb.from("musteriler").insert({
        ad: mAd.value.trim(), yetkili: mYetkili.value.trim() || null, telefon: mTel.value.trim() || null });
      if (error) return bildir(hataMetni(error));
      mForm.reset(); bildir("Müşteri kaydedildi."); yenile();
    });
    uForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const { error } = await sb.from("urunler").insert({
        musteri_id: uMus.value, kod: uKod.value.trim(), ad: uAd.value.trim() });
      if (error) return bildir(hataMetni(error));
      uForm.reset(); bildir("Ürün kaydedildi."); yenile();
    });

    kap.append(mesaj, el("h2", {}, "Müşteriler"), mForm, mListe, el("h2", {}, "Ürünler"), uForm, uListe);
    await yenile();
  }
};
