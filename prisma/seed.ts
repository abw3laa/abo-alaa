import {
  PrismaClient,
  UserRole,
  PublishStatus,
  ProductGender,
  CouponType,
  OrderStatus,
  PaymentStatus,
} from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { ROLE_PERMISSIONS, PERMISSIONS } from "../src/lib/auth/permissions";

const prisma = new PrismaClient();

const ARGON_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

function slugify(text: string): string {
  return text
    .toString()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, "")
    .toLowerCase();
}

async function main() {
  console.log("🌱 بدء زراعة البيانات التجريبية...");

  // ---------- الصلاحيات ----------
  console.log("→ إنشاء الصلاحيات والأدوار");
  const permissionKeys = Object.values(PERMISSIONS);
  for (const key of permissionKeys) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: key },
    });
  }
  const allPermissions = await prisma.permission.findMany();
  const permMap = new Map(allPermissions.map((p) => [p.key, p.id]));

  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
    for (const permKey of perms) {
      const permissionId = permMap.get(permKey);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: { role: role as UserRole, permissionId },
        },
        update: {},
        create: { role: role as UserRole, permissionId },
      });
    }
  }

  // ---------- حساب المدير ----------
  console.log("→ إنشاء حساب المدير");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@abo-alaa.com";
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe_Strong#2026";
  const adminHash = await hash(adminPassword, ARGON_OPTS);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.SUPER_ADMIN },
    create: {
      email: adminEmail,
      name: process.env.SEED_ADMIN_NAME ?? "مدير المتجر",
      passwordHash: adminHash,
      role: UserRole.SUPER_ADMIN,
      emailVerified: new Date(),
    },
  });

  // ---------- التصنيفات الرئيسية والفرعية ----------
  console.log("→ إنشاء التصنيفات");
  const mainCategories = [
    { name: "ملابس", nameEn: "Clothing", subs: ["رجالي", "نسائي", "أطفال"] },
    { name: "أحذية", nameEn: "Shoes", subs: ["رياضية", "كلاسيكية"] },
    { name: "إكسسوارات", nameEn: "Accessories", subs: ["حقائب", "ساعات"] },
    {
      name: "إلكترونيات خفيفة",
      nameEn: "Electronics",
      subs: ["سماعات", "ملحقات"],
    },
    { name: "منتجات المنزل", nameEn: "Home", subs: ["مفروشات"] },
  ];

  const categoryMap = new Map<string, string>();
  let catOrder = 0;
  for (const main of mainCategories) {
    const parent = await prisma.category.upsert({
      where: { slug: slugify(main.nameEn) },
      update: {},
      create: {
        name: main.name,
        nameEn: main.nameEn,
        slug: slugify(main.nameEn),
        sortOrder: catOrder++,
        isActive: true,
      },
    });
    categoryMap.set(main.name, parent.id);

    for (const sub of main.subs) {
      const subCat = await prisma.category.upsert({
        where: { slug: slugify(`${main.nameEn}-${sub}`) },
        update: {},
        create: {
          name: sub,
          slug: slugify(`${main.nameEn}-${sub}`),
          parentId: parent.id,
          sortOrder: catOrder++,
          isActive: true,
        },
      });
      categoryMap.set(`${main.name}-${sub}`, subCat.id);
    }
  }

  // ---------- الماركات ----------
  console.log("→ إنشاء الماركات");
  const brandNames = ["أناقة", "نخبة", "ستايل", "لمسة", "فخامة"];
  const brandIds: string[] = [];
  for (const name of brandNames) {
    const brand = await prisma.brand.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name), isActive: true },
    });
    brandIds.push(brand.id);
  }

  // ---------- المنتجات ----------
  console.log("→ إنشاء 30 منتجاً");
  const colors = [
    { name: "أسود", hex: "#000000" },
    { name: "أبيض", hex: "#FFFFFF" },
    { name: "كحلي", hex: "#0F172A" },
    { name: "أحمر", hex: "#DC2626" },
    { name: "بيج", hex: "#D9C5A0" },
  ];
  const sizes = ["S", "M", "L", "XL"];
  const productNames = [
    "قميص قطني كلاسيكي",
    "بنطال جينز عصري",
    "فستان سهرة أنيق",
    "حذاء رياضي مريح",
    "جاكيت شتوي دافئ",
    "تيشيرت أساسي",
    "حقيبة يد جلدية",
    "ساعة يد فاخرة",
    "سماعات لاسلكية",
    "عباءة مطرزة",
    "بلوزة حريرية",
    "معطف طويل",
    "حذاء كلاسيكي جلد",
    "نظارة شمسية",
    "حزام جلد طبيعي",
    "قبعة صيفية",
    "وشاح قطني",
    "بيجاما قطنية",
    "طقم رياضي",
    "قميص رسمي",
    "تنورة قصيرة",
    "شورت صيفي",
    "سترة صوفية",
    "حذاء كعب عالٍ",
    "محفظة جلدية",
    "قفازات شتوية",
    "جوارب قطنية",
    "ربطة عنق",
    "مفرش سرير قطني",
    "وسادة زينة",
  ];

  const createdProductIds: string[] = [];
  for (let i = 0; i < productNames.length; i++) {
    const name = productNames[i]!;
    const basePrice = 150 + Math.floor(Math.random() * 850);
    const hasDiscount = i % 3 === 0;
    const compareAt = hasDiscount ? Math.round(basePrice * 1.3) : null;
    const isOutOfStock = i % 7 === 0;
    const catKeys = Array.from(categoryMap.values());
    const categoryId = catKeys[i % catKeys.length]!;

    const product = await prisma.product.upsert({
      where: { slug: slugify(`${name}-${i}`) },
      update: {},
      create: {
        name,
        slug: slugify(`${name}-${i}`),
        shortDescription: `${name} بخامة عالية الجودة وتصميم عصري يناسب جميع المناسبات.`,
        description: `يتميز ${name} بجودة تصنيع فائقة وخامات مختارة بعناية. مثالي للاستخدام اليومي، متوفر بألوان ومقاسات متعددة. سهل العناية ومريح للارتداء طوال اليوم.`,
        material: "قطن 100%",
        careInstructions: "غسيل على 30 درجة، تجنب المبيّض",
        gender:
          i % 3 === 0
            ? ProductGender.MEN
            : i % 3 === 1
              ? ProductGender.WOMEN
              : ProductGender.UNISEX,
        price: basePrice,
        compareAtPrice: compareAt,
        cost: Math.round(basePrice * 0.6),
        currency: "TRY",
        sku: `SKU-${1000 + i}`,
        barcode: `690${1000000 + i}`,
        status: PublishStatus.PUBLISHED,
        isFeatured: i < 8,
        ratingAverage: 3.5 + (i % 3) * 0.5,
        ratingCount: 5 + i,
        viewCount: 100 + i * 13,
        salesCount: i % 7 === 0 ? 0 : 20 + i * 3,
        brandId: brandIds[i % brandIds.length]!,
        seoTitle: name,
        seoDescription: `اشترِ ${name} الآن بأفضل سعر مع شحن سريع`,
        categories: { create: { categoryId } },
        images: {
          create: [
            {
              url: `https://picsum.photos/seed/aboalaa${i}a/800/1000`,
              altText: `${name} - صورة أمامية`,
              sortOrder: 0,
            },
            {
              url: `https://picsum.photos/seed/aboalaa${i}b/800/1000`,
              altText: `${name} - صورة جانبية`,
              sortOrder: 1,
            },
          ],
        },
      },
    });
    createdProductIds.push(product.id);

    // المتغيرات (لون × مقاس) مع المخزون
    const productColors = colors.slice(0, 2 + (i % 3));
    const productSizes = sizes.slice(0, 2 + (i % 2));
    let variantIdx = 0;
    for (const color of productColors) {
      for (const size of productSizes) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: `SKU-${1000 + i}-${variantIdx}`,
            color: color.name,
            colorHex: color.hex,
            size,
            inventory: {
              create: {
                quantity: isOutOfStock ? 0 : 10 + ((i + variantIdx) % 40),
                lowStockThreshold: 5,
              },
            },
          },
        });
        variantIdx++;
      }
    }
  }

  // ---------- العملاء ----------
  console.log("→ إنشاء 10 عملاء");
  const customerHash = await hash("Customer#2026", ARGON_OPTS);
  const customerIds: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const customer = await prisma.user.upsert({
      where: { email: `customer${i}@example.com` },
      update: {},
      create: {
        email: `customer${i}@example.com`,
        name: `عميل رقم ${i}`,
        phone: `+9055500000${i.toString().padStart(2, "0")}`,
        passwordHash: customerHash,
        role: UserRole.CUSTOMER,
        emailVerified: new Date(),
        addresses: {
          create: {
            fullName: `عميل رقم ${i}`,
            phone: `+9055500000${i.toString().padStart(2, "0")}`,
            country: "TR",
            city: "إسطنبول",
            street: `شارع رقم ${i}`,
            isDefault: true,
          },
        },
      },
    });
    customerIds.push(customer.id);
  }

  // ---------- الكوبونات ----------
  console.log("→ إنشاء الكوبونات");
  const coupons = [
    {
      code: "WELCOME10",
      type: CouponType.PERCENTAGE,
      value: 10,
      firstOrderOnly: true,
    },
    { code: "SAVE50", type: CouponType.FIXED, value: 50, minOrderAmount: 300 },
    {
      code: "FREESHIP",
      type: CouponType.FREE_SHIPPING,
      value: 0,
      minOrderAmount: 200,
    },
  ];
  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: {
        code: c.code,
        type: c.type,
        value: c.value,
        minOrderAmount: c.minOrderAmount ?? null,
        firstOrderOnly: c.firstOrderOnly ?? false,
        isActive: true,
        maxUses: 1000,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // ---------- طلبات بحالات مختلفة ----------
  console.log("→ إنشاء طلبات تجريبية");
  const statuses: OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ];
  for (let i = 0; i < statuses.length; i++) {
    const status = statuses[i]!;
    const customerId = customerIds[i % customerIds.length]!;
    const unitPrice = 200 + i * 50;
    const qty = 1 + (i % 3);
    const subtotal = unitPrice * qty;
    const shipping = subtotal > 500 ? 0 : 30;
    const tax = Math.round(subtotal * 0.1);
    await prisma.order.create({
      data: {
        orderNumber: `AB-${20260000 + i}`,
        userId: customerId,
        customerName: `عميل رقم ${(i % 10) + 1}`,
        status,
        paymentStatus:
          status === OrderStatus.CANCELLED
            ? PaymentStatus.FAILED
            : PaymentStatus.PAID,
        subtotal,
        shippingTotal: shipping,
        taxTotal: tax,
        grandTotal: subtotal + shipping + tax,
        currency: "TRY",
        items: {
          create: {
            productId: createdProductIds[i]!,
            productName: productNames[i]!,
            variantInfo: "أسود / M",
            sku: `SKU-${1000 + i}`,
            unitPrice,
            quantity: qty,
            lineTotal: subtotal,
          },
        },
      },
    });
  }

  // ---------- المراجعات ----------
  console.log("→ إنشاء المراجعات");
  for (let i = 0; i < 10; i++) {
    await prisma.review.create({
      data: {
        productId: createdProductIds[i]!,
        userId: customerIds[i % customerIds.length]!,
        rating: 4 + (i % 2),
        title: "منتج ممتاز",
        comment: "جودة رائعة ومطابق للوصف، أنصح بالشراء.",
        isApproved: true,
        isVerifiedPurchase: true,
      },
    });
  }

  // ---------- المدونة ----------
  console.log("→ إنشاء مقالات المدونة");
  const posts = [
    { title: "أحدث صيحات الموضة لعام 2026", category: "موضة" },
    { title: "كيف تختار المقاس المناسب", category: "نصائح" },
    { title: "دليل العناية بالملابس", category: "نصائح" },
  ];
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i]!;
    await prisma.blogPost.upsert({
      where: { slug: slugify(`${p.title}-${i}`) },
      update: {},
      create: {
        title: p.title,
        slug: slugify(`${p.title}-${i}`),
        excerpt: `مقال عن ${p.title}`,
        content: `<p>محتوى تفصيلي حول ${p.title}. نصائح عملية ومعلومات مفيدة للقارئ العربي.</p>`,
        category: p.category,
        status: PublishStatus.PUBLISHED,
        publishAt: new Date(),
      },
    });
  }

  // ---------- البانرات ----------
  console.log("→ إنشاء البانرات");
  const banners = [
    {
      title: "تشكيلة الشتاء الجديدة",
      subtitle: "خصومات تصل إلى 50%",
      image: "https://picsum.photos/seed/banner1/1600/600",
      buttonText: "تسوق الآن",
      link: "/products",
      sortOrder: 0,
    },
    {
      title: "أحدث الإكسسوارات",
      subtitle: "وصل حديثاً",
      image: "https://picsum.photos/seed/banner2/1600/600",
      buttonText: "اكتشف المجموعة",
      link: "/products?sort=newest",
      sortOrder: 1,
    },
    {
      title: "عروض حصرية",
      subtitle: "لفترة محدودة",
      image: "https://picsum.photos/seed/banner3/1600/600",
      buttonText: "شاهد العروض",
      link: "/deals",
      sortOrder: 2,
    },
  ];
  for (const b of banners) {
    await prisma.banner.create({
      data: { ...b, position: "home_hero", isActive: true },
    });
  }

  // ---------- طرق الدفع ----------
  console.log("→ إنشاء طرق الدفع");
  const paymentMethods = [
    {
      code: "cod",
      name: "الدفع عند الاستلام",
      description: "ادفع نقداً عند استلام طلبك",
      provider: "manual",
      sortOrder: 0,
    },
    {
      code: "bank_transfer",
      name: "تحويل بنكي",
      description: "حوّل المبلغ إلى حسابنا البنكي",
      instructions:
        "IBAN: TR00 0000 0000 0000 0000 0000 00 — باسم متجر أبو علاء",
      provider: "manual",
      sortOrder: 1,
    },
    {
      code: "card",
      name: "بطاقة ائتمان",
      description: "دفع آمن عبر البطاقة البنكية",
      provider: "stripe",
      sortOrder: 2,
    },
  ];
  for (const pm of paymentMethods) {
    await prisma.paymentMethodOption.upsert({
      where: { code: pm.code },
      update: {},
      create: { ...pm, isActive: true },
    });
  }

  // ---------- الإعدادات الأساسية ----------
  console.log("→ إنشاء الإعدادات");
  const settings = [
    { key: "store.name", value: { ar: "أبو علاء", en: "Abo-alaa" } },
    { key: "store.currency", value: "TRY" },
    { key: "store.maintenanceMode", value: false },
    { key: "shipping.freeThreshold", value: 500 },
    { key: "tax.rate", value: 0.1 },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }

  // ---------- الأسئلة الشائعة ----------
  const faqs = [
    {
      question: "كم تستغرق مدة التوصيل؟",
      answer: "عادة بين 2 إلى 5 أيام عمل حسب المنطقة.",
    },
    {
      question: "هل يمكنني إرجاع المنتج؟",
      answer: "نعم، خلال 14 يوماً من الاستلام بشرط أن يكون بحالته الأصلية.",
    },
    {
      question: "ما طرق الدفع المتاحة؟",
      answer: "البطاقات البنكية والدفع عند الاستلام والمحافظ الإلكترونية.",
    },
  ];
  for (let i = 0; i < faqs.length; i++) {
    const f = faqs[i]!;
    await prisma.faqItem.create({
      data: { question: f.question, answer: f.answer, sortOrder: i },
    });
  }

  console.log("✅ اكتملت زراعة البيانات بنجاح");
  console.log(`   المدير: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error("❌ خطأ أثناء الزراعة:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
