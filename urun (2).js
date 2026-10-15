window.MODUL_URUN = {
  async ac(kap, profil, sb) {
    const el = (t, o = {}, ...c) => { const e = Object.assign(document.createElement(t), o); e.append(...c); return e; };
    const duzenler = ["patron", "uretim_sorumlusu"].includes(profil.rol);
    const TUR = { sise: "Şişe", kapak: "Kapak", valf_yuzuk: "Valf / Yüzük", etiket: "Etiket", kutu: "Kutu",
      separator: "Separatör", koli: "Koli", baski: "Baskı / Koli baskısı", diger: "Diğer" };
    const mesaj = el("p", { className: "bilgi hidden", role: "status" });
    const bildir = (m) => { mesaj.textContent = m; mesaj.classList.remove("hidden"); };
    const hataMetni = (e) => e.code === "42501" ? "Bu işlem için yetkiniz yok." : "İşlem yapılamadı: " + e.message;

    const sec = el("select", { ariaLabel: "Ürün" });
    const panel = el("div");
    let urunler = [];

    async function listele() {
      const { data, error } = await sb.from("urunler")
        .select("id, kod, ad, marka, koli_ici_adet, uretim_notu, musteriler(ad)").eq("aktif", true).order("ad");
      if (error) return bildir("Ürünler yüklenemedi: " + error.message);
      urunler = data;
      sec.replaceChildren(el("option", { value: "" }, "Ürün seçin"),
        ...data.map((x) => el("option", { value: x.id }, x.kod + " • " + x.ad + (x.musteriler ? " (" + x.musteriler.ad + ")" : ""))));
      if (!data.length) panel.replaceChildren(el("p", { className: "bos" },
        "Henüz ürün yok. Önce Müşteriler ve Ürünler ekranından ürün ekleyin."));
    }

    async function detay(id) {
      panel.replaceChildren();
      const u = urunler.find((x) => x.id === id);
      if (!u) return;
      const { data: amb, error } = await sb.from("urun_ambalaj")
        .select("id, tur, aciklama").eq("urun_id", id).order("olusturma");
      if (error) return bildir("Talimat yüklenemedi: " + error.message);

      if (duzenler) {
        const ma = el("input", { value: u.marka || "", placeholder: "Marka", ariaLabel: "Marka" });
        const ka = el("input", { type: "number", min: 1, value: u.koli_ici_adet || "", placeholder: "Koli içi adet", ariaLabel: "Koli içi adet" });
        const nt = el("textarea", { rows: 6, value: u.uretim_notu || "", placeholder: "Üretim notu ve uygulama adımları", ariaLabel: "Üretim notu" });
        const f = el("form", { className: "kart-form" }, el("h3", {}, u.ad + " • genel bilgi"), ma, ka, nt,
          el("button", { type: "submit" }, "Bilgileri kaydet"));
        f.addEventListener("submit", async (e) => {
          e.preventDefault();
          const { data: d, error: er } = await sb.from("urunler").update({
            marka: ma.value.trim() || null, koli_ici_adet: ka.value ? Number(ka.value) : null,
            uretim_notu: nt.value.trim() || null }).eq("id", id).select("id");
          if (er) return bildir(hataMetni(er));
          if (!d.length) return bildir("Kaydedilemedi. Yetkinizi kontrol edin.");
          bildir("Bilgiler kaydedildi.");
          await listele(); sec.value = id; await detay(id);
        });
        panel.append(f);
      } else {
        panel.append(el("div", { className: "kart-form" }, el("h3", {}, u.ad),
          el("p", {}, "Marka: " + (u.marka || "-")), el("p", {}, "Koli içi adet: " + (u.koli_ici_adet || "-")),
          el("p", { className: "not" }, u.uretim_notu || "Üretim notu girilmemiş.")));
      }

      panel.append(el("h2", {}, "Ambalaj bileşenleri"));
      const liste = el("div", { className: "liste" });
      if (!amb.length) liste.append(el("p", { className: "bos" }, "Henüz bileşen girilmemiş."));
      for (const a of amb) {
        const sag = duzenler ? el("button", { type: "button", className: "ikincil-koyu" }, "Sil") : "";
        if (duzenler) sag.addEventListener("click", async () => {
          const { error: er } = await sb.from("urun_ambalaj").delete().eq("id", a.id);
          if (er) return bildir(hataMetni(er));
          detay(id);
        });
        liste.append(el("div", { className: "satir" }, el("div", {}, el("strong", {}, TUR[a.tur] || a.tur), el("small", {}, a.aciklama)), sag));
      }
      panel.append(liste);

      if (duzenler) {
        const tur = el("select", { ariaLabel: "Bileşen türü" }, ...Object.entries(TUR).map(([k, v]) => el("option", { value: k }, v)));
        const ac = el("input", { required: true, placeholder: "Açıklama (örnek: 50 ml Paris şişe, Erbatur)", ariaLabel: "Açıklama" });
        const f = el("form", { className: "kart-form" }, el("h3", {}, "Bileşen ekle"), tur, ac,
          el("button", { type: "submit" }, "Bileşeni ekle"));
        f.addEventListener("submit", async (e) => {
          e.preventDefault();
          const { error: er } = await sb.from("urun_ambalaj").insert({ urun_id: id, tur: tur.value, aciklama: ac.value.trim() });
          if (er) return bildir(hataMetni(er));
          detay(id);
        });
        panel.append(f);
      }
    }

    sec.addEventListener("change", () => detay(sec.value));
    kap.append(mesaj, el("h2", {}, "Ürün seçin"), sec, panel);
    await listele();
  }
};
