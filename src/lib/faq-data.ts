// SSS içeriği — Zarina Hotels & Hamam (referans site + OTA listeleri).
// Üç dil: tr / en / ka. Kategori rozetleriyle gruplanır.

export type FaqCategory = "booking" | "rooms" | "facilities" | "policies";

export type FaqEntry = {
  q: { tr: string; en: string; ka: string };
  a: { tr: string; en: string; ka: string };
  category: FaqCategory;
};

export const FAQ_CATEGORY_LABELS: Record<FaqCategory, { tr: string; en: string; ka: string }> = {
  booking: { tr: "Rezervasyon", en: "Booking", ka: "ჯავშანი" },
  rooms: { tr: "Odalar", en: "Rooms", ka: "ოთახები" },
  facilities: { tr: "Tesis & Hizmetler", en: "Facilities", ka: "მომსახურება" },
  policies: { tr: "Kurallar", en: "Policies", ka: "წესები" },
};

export const FAQ_ITEMS: FaqEntry[] = [
  // ── REZERVASYON ──
  {
    category: "booking",
    q: {
      tr: "Giriş ve çıkış saatleri kaçtır?",
      en: "What are the check-in and check-out times?",
      ka: "რა არის ჩასვლისა და გასვლის დრო?",
    },
    a: {
      tr: "Giriş saat 14:00'ten itibaren, çıkış ise en geç 12:00'de yapılmalıdır. Erken giriş veya geç çıkış için resepsiyonla iletişime geçebilirsiniz — müsaitliğe bağlı olarak ücretsiz veya küçük bir ücretle ayarlanabilir.",
      en: "Check-in starts at 14:00 and check-out is required by 12:00. For early check-in or late check-out, contact reception — subject to availability, free or for a small fee.",
      ka: "ჩასვლა იწყება 14:00-დან, გასვლა აუცილებელია 12:00-მდე. ადრეული ჩასვლისთვის ან გვიან გასვლისთვის დაუკავშირდით რეცეფციას.",
    },
  },
  {
    category: "booking",
    q: {
      tr: "Rezervasyonumu nasıl iptal edebilirim?",
      en: "How can I cancel my booking?",
      ka: "როგორ შემიძლია ჯავშნის გაუქმება?",
    },
    a: {
      tr: "İptal koşulları seçtiğiniz fiyat planına bağlıdır: esnek planlarda belirtilen son tarihe kadar ücretsiz iptal mümkündür, iade edilemez (non-refundable) planlarda ücret iadesi yapılmaz. Rezervasyon onay e-postanızdaki bağlantıdan veya 'Rezervasyonumu Yönet' sayfasından iptal edebilirsiniz.",
      en: "Cancellation terms depend on your rate plan: flexible plans can be cancelled free of charge until the stated deadline; non-refundable plans cannot be refunded. Cancel via the link in your confirmation email or the Manage Booking page.",
      ka: "გაუქმების პირობები დამოკიდებულია თქვენს ფასის გეგმაზე: მოქნილი გეგმები უფასოდ გაუქმდება მითითებულ ვადამდე; დაბრუნებადი გეგმები არ აბრუნებს თანხას.",
    },
  },
  {
    category: "booking",
    q: {
      tr: "Ödemeyi nasıl yapabilirim?",
      en: "What payment methods do you accept?",
      ka: "რა გადახდის მეთოდებს იღებთ?",
    },
    a: {
      tr: "Online rezervasyonlarda kredi/banka kartı ile güvenli ödeme alıyoruz. Tesiste nakit ve kart ile ödeme yapabilirsiniz. Tüm online ödemeler PCI uyumlu ödeme sağlayıcısı üzerinden gerçekleştirilir; kart bilgileriniz sistemimizde saklanmaz.",
      en: "Online bookings are paid securely by credit/debit card. At the property you can pay cash or by card. All online payments go through a PCI-compliant provider; we never store card details.",
      ka: "ონლაინ ჯავშნები უსაფრთხოდ გადაიხდის საკრედიტო/სადებეტო ბარათით. ობიექტში შეგიძლიათ გადაიხადოთ ნაღდი ან ბარათით.",
    },
  },
  {
    category: "booking",
    q: {
      tr: "Havaalanı servisi var mı?",
      en: "Is there an airport shuttle?",
      ka: "არის თუ არა აეროპორტის ტრანსფერი?",
    },
    a: {
      tr: "Evet, havaalanı servisi talep üzerine sağlanır. Rezervasyon sırasında 'özel istekler' alanına uçuş bilgilerinizi yazın veya resepsiyonu arayın; personel transferinizi organize eder. Batumi Havalimanı hotele yaklaşık 10 km uzaklıktadır.",
      en: "Yes, an airport shuttle is available on request. Add your flight details in the special-requests box during booking or call reception; the 24-hour staff will organise your transfer. Batumi Airport is about 10 km away.",
      ka: "დიახ, აეროპორტის ტრანსფერი ხელმისაწვდომია მოთხოვნით. დაამატეთ თქვენი ფრენის დეტალები ჯავშნის დროს ან დარეკეთ რეცეფციაში.",
    },
  },
  // ── ODALAR ──
  {
    category: "rooms",
    q: {
      tr: "Oda tipleri nelerdir?",
      en: "What room types are available?",
      ka: "რა ოთახის ტიპებია ხელმისაწვდომი?",
    },
    a: {
      tr: "Beş oda tipimiz var: Standart Çift Kişilik (30 m²), Çift/Twin (30 m², iki tek yatak), Konfor Üç Kişilik (35 m², 3 tam yatak), Junior Suite (40 m², iki ayrı yatak odası) ve Family Suite (45 m², iki yatak odası + çekyatlı salon). Tüm odalarda balkon, klima, düz ekran TV ve ücretsiz Wi-Fi vardır.",
      en: "We have five room types: Standard Double (30 m²), Double/Twin (30 m², two single beds), Comfort Triple (35 m², 3 full beds), Junior Suite (40 m², two separate bedrooms) and Family Suite (45 m², two bedrooms + living room with sofa bed). All come with a balcony, air conditioning, flat-screen TV and free Wi-Fi.",
      ka: "ჩვენ გვაქვს ხუთი ოთახის ტიპი: სტანდარტული ორადგილიანი (30 მ²), ორადგილიანი/ტყუპი (30 მ²), კომფორტი სამადგილიანი (35 მ²), ჯუნიორ სუიტი (40 მ²) და ოჯახური სუიტი (45 მ²).",
    },
  },
  {
    category: "rooms",
    q: {
      tr: "Ekstra yatak veya bebek yatağı temin edilebilir mi?",
      en: "Can I get an extra bed or a baby cot?",
      ka: "შეიძლება თუ არა დამატებითი საწოლი ან ბავშვის საწოლი?",
    },
    a: {
      tr: "Evet. Junior Suite ve Family Suite'lerde ekstra yatak, talep üzerine bebek yatağı (0–2 yaş) ücretsiz sağlanabilir. Lütfen rezervasyon sırasında isteklerinizi belirtin.",
      en: "Yes. Extra beds are available in the Junior Suite and Family Suite; a baby cot (0–2 years) can be provided free on request. Please note your requests when booking.",
      ka: "დიახ. დამატებითი საწოლები ხელმისაწვდომია ჯუნიორ სუიტსა და ოჯახურ სუიტში; ბავშვის საწოლი (0–2 წელი) უფასოდ შეიძლება მოთხოვნით.",
    },
  },
  {
    category: "rooms",
    q: {
      tr: "Odalar deniz manzaralı mı?",
      en: "Do rooms have a sea view?",
      ka: "ოთახებს ზღვის ხედი აქვთ?",
    },
    a: {
      tr: "Odaların bir kısmı şehir, bir kısmı dağ veya iç avlu manzaralıdır. Tüm odalarda balkon bulunur. Belirli bir manzara talebiniz varsa rezervasyon sırasında belirtin — müsaitliğe göre değerlendirilir.",
      en: "Some rooms face the city, others the mountains or the inner courtyard. All rooms have a balcony. If you have a view preference, mention it when booking — subject to availability.",
      ka: "ოთახების ნაწილი ქალაქის, ნაწილი მთების ან შიდა ეზოს ხედითაა. ყველა ოთახს აივანი აქვს.",
    },
  },
  // ── TESİS & HİZMETLER ──
  {
    category: "facilities",
    q: {
      tr: "Havuz var mı?",
      en: "Is there a pool area?",
      ka: "არის თუ არა აუზი?",
    },
    a: {
      tr: "Açık yüzme havuzumuz yoktur. Bunun yerine adımızı taşıyan hamam ve spa & sağlık merkezimiz vardır: ısıtmalı mermer göbek taşlı Türk hamamı, sauna ve sıcak havuz (hot tub) günün her saati konuklarımızın kullanımındadır.",
      en: "We don't have a swimming pool. Instead, the hotel's namesake hamam and spa & wellness centre are at your service: a heated-marble Turkish hamam, sauna and hot tub, available around the clock.",
      ka: "ჩვენ არ გვაქვს საცურაო აუზი. ამის ნაცვლად, სასტუმროს აბანო და სპა & ჯანმრთელობის ცენტრი თქვენს სამსახურშია: გათბობილი მარმარილოს თურქული აბანო, საუნა და ცხარე აუზი.",
    },
  },
  {
    category: "facilities",
    q: {
      tr: "Evcil hayvan kabul ediliyor mu?",
      en: "Are pets allowed?",
      ka: "ნებდება თუ არა შინაური ცხოველები?",
    },
    a: {
      tr: "Hayır, maalesef evcil hayvan kabul edilmiyor.",
      en: "No, unfortunately pets are not allowed.",
      ka: "არა, სამწუხაროდ შინაური ცხოველები არ ნებდება.",
    },
  },
  {
    category: "facilities",
    q: {
      tr: "Otopark var mı?",
      en: "Is parking available?",
      ka: "არის თუ არა პარკირება?",
    },
    a: {
      tr: "Evet, konuklarımız için ücretsiz otopark mevcuttur. Rezervasyon için ayrı bir işlem gerekmez; giriş sırasında resepsiyona bildirmeniz yeterlidir.",
      en: "Yes, free parking is available for guests. No reservation needed — just let reception know at check-in.",
      ka: "დიახ, სტუმრებისთვის უფასო პარკირება ხელმისაწვდომია. რეზერვაცია არ არის საჭირო — უბრალოდ აცნობეთ რეცეფციას ჩასვლისას.",
    },
  },
  {
    category: "facilities",
    q: {
      tr: "Restoran ve kahvaltı hizmeti var mı?",
      en: "Is there a restaurant and breakfast?",
      ka: "არის თუ არა რესტორანი და საუზმე?",
    },
    a: {
      tr: "Tesisimizde restoran ve bar bulunmaktadır. Bazı fiyat planlarında kahvaltı dahildir; oda tipi seçerken 'kahvaltı dahil' seçeneğini görebilirsiniz. Ayrıca odalara oda servisi verilmektedir.",
      en: "The property has an on-site restaurant and bar. Breakfast is included in some rate plans — you'll see the 'breakfast included' option when choosing a room. Room service is also available.",
      ka: "ობიექტს აქვს რესტორანი და ბარი. საუზმე ზოგიერთ ფასის გეგმაშია შეტანილი — ოთახის არჩევისას ნახავთ 'საუზმე შეტანილია' ვარიანტს.",
    },
  },
  {
    category: "facilities",
    q: {
      tr: "Wi-Fi ücretli mi?",
      en: "Is Wi-Fi free?",
      ka: "არის თუ არა Wi-Fi უფასო?",
    },
    a: {
      tr: "Hayır, tüm odalarda ve ortak alanlarda Wi-Fi ücretsizdir.",
      en: "No, Wi-Fi is free in all rooms and public areas.",
      ka: "არა, Wi-Fi უფასოა ყველა ოთახში და საზოგადოებრივ ზონაში.",
    },
  },
  // ── KURALLAR ──
  {
    category: "policies",
    q: {
      tr: "Sigara içmek serbest mi?",
      en: "Is smoking allowed?",
      ka: "მოწევა ნებდება?",
    },
    a: {
      tr: "Odalarımız sigara içilmeyen odalardır. Belirli açık alanlarda (teras, bahçe) sigara içilebilir.",
      en: "Our rooms are non-smoking. Smoking is permitted in designated outdoor areas (terrace, garden).",
      ka: "ჩვენი ოთახები მოწევის გარეშეა. მოწევა ნებდება განსაზღვრულ ღია სივრცეებში (ტერასა, ბაღი).",
    },
  },
  {
    category: "policies",
    q: {
      tr: "Çocuklar için yaş sınırı var mı?",
      en: "Are there age restrictions for children?",
      ka: "არის თუ არა ასაკობრივი შეზღუდვა ბავშვებისთვის?",
    },
    a: {
      tr: "Her yaştan çocuk kabul edilir. 2 yaş ve altı ücretsiz bebek yatağıyla konaklayabilir; yaş politikası fiyat planına göre değişebilir, rezervasyon adımında detayları görebilirsiniz.",
      en: "Children of all ages are welcome. Children 2 and under can stay free in a baby cot; specific policies may vary by rate plan — details are shown at booking.",
      ka: "ყველა ასაკის ბავშვი მისასალმებელია. 2 წლის და ქვემოთ ბავშვებს შეუძლიათ უფასოდ დარჩენა ბავშვის საწოლში.",
    },
  },
  {
    category: "policies",
    q: {
      tr: "Kimlik veya pasaport göstermem gerekiyor mu?",
      en: "Do I need to show ID or a passport?",
      ka: "უნდა ვაჩვენო პირადობა ან პასპორტი?",
    },
    a: {
      tr: "Evet, Gürcistan mevzuatı gereği giriş sırasında tüm konukların kimlik veya pasaportu resepsiyona gösterilmesi zorunludur.",
      en: "Yes, Georgian law requires all guests to present a valid ID or passport at reception upon check-in.",
      ka: "დიახ, საქართველოს კანონმდებლობა მოითხოვს ყველა სტუმარმა წარადგინოს მოქმედი პირადობა ან პასპორტი რეცეფციაში ჩასვლისას.",
    },
  },
];
