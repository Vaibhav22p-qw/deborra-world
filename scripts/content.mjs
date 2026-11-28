export const brand = {
  name: 'DEBORRA',
  umbrellaName: 'DEBORRA World',
  tagline: 'Elevate everyday care.',
  phone: '+91 77150 38107',
  phoneHref: 'tel:+917715038107',
  instagramHandle: '@deborra.in',
  freeShippingThreshold: 999,
  standardShippingFee: 60,
  codFee: 0,
  currency: 'INR'
};

export const founder = {
  name: 'Brijesh Mishra',
  linkedInName: 'Brijesh Mishrra',
  linkedInUrl: 'https://www.linkedin.com/in/brijesh-mishrra-91584456/',
  acceletechUrl: 'https://acceletechglobal.com/',
  role: 'Founder, DEBORRA World',
  summary:
    'With over 15 years of commercial, go-to-market and revenue leadership across India, SAARC, Asia and the Middle East, Brijesh founded DEBORRA World to bring operational discipline, transparent communication and thoughtful design to everyday Indian hair care and wellness.',
  highlights: [
    'Founder & CEO of ACCELETECH, advising technology innovators on structured go-to-market execution and sustainable growth across Asia.',
    'Serves as Vice President – Sales & Revenue Leader (India, SAARC & Asia) at SecHard, following senior leadership tenures across global enterprise firms including BluSapphire, Senhasegura, Motadata, MarketsandMarkets, ARCON TechSolutions, Intelliswift and Sophos.',
    'Brings enterprise-grade supply discipline, measurable quality accountability and customer-first execution into building DEBORRA into a trusted Indian consumer brand.'
  ]
};

export const discountCodes = [
  {
    code: 'DEBORRA10',
    type: 'percent',
    value: 10,
    minSubtotal: 0,
    label: '10% off your order'
  },
  {
    code: 'WELCOME15',
    type: 'percent',
    value: 15,
    minSubtotal: 1200,
    label: '15% off on orders ₹1,200+'
  },
  {
    code: 'FREESHIP',
    type: 'shipping',
    value: 100,
    minSubtotal: 0,
    label: 'Free standard shipping across India'
  }
];

export const categories = [
  {
    slug: 'hair-oils',
    name: 'Hair Oils',
    eyebrow: 'Phase 1 · Live',
    title: 'Botanical <em>hair oils.</em>',
    description:
      'Cold-pressed carrier oils paired with rosemary, amla and targeted botanicals in UV-protective amber glass bottles.',
    accent: 'oils',
    launched: true
  },
  {
    slug: 'serums',
    name: 'Serums',
    eyebrow: 'Phase 1 · Live',
    title: 'Targeted <em>scalp serums.</em>',
    description:
      'Fast-absorbing, non-greasy daily drops designed to hydrate the scalp and leave zero heavy residue.',
    accent: 'serums',
    launched: true
  },
  {
    slug: 'wellness',
    name: 'Wellness',
    eyebrow: 'Phase 1 · Live & Upcoming',
    title: 'Everyday <em>wellness.</em>',
    description:
      'Single-ingredient amla powder in portioned stick packs and jars, alongside upcoming gummy concepts undergoing formulation and compliance review.',
    accent: 'wellness',
    launched: true
  },
  {
    slug: 'hair-care',
    name: 'Hair Cream & Care',
    eyebrow: 'Phase 2 · Upcoming',
    title: 'Hair creams <em>&amp; leave-ins.</em>',
    description:
      'Everyday conditioning creams and styling-care formats planned for Phase 2 of our hair-care portfolio. Join the waitlist for release alerts.',
    accent: 'care',
    launched: false
  }
];

export const products = [
  {
    slug: 'rosemary-hair-oil',
    name: 'Rosemary Hair Oil',
    category: 'hair-oils',
    group: 'Hair Oils',
    format: 'Hair oil · 100 ml Amber Glass & Carton',
    status: 'in-stock',
    stage: 'Flagship · In Stock',
    image: 'rosemary-bottle.webp',
    alt: 'DEBORRA Rosemary Hair Oil 100 ml amber glass bottle and deep forest-green outer carton with fresh rosemary sprigs',
    secondaryImage: 'rosemary.webp',
    secondaryAlt: 'Fresh rosemary sprigs and golden botanical oil drops on warm travertine stone',
    summary:
      'Our flagship botanical oil in UV-protective 100 ml amber glass with outer carton, balanced for pre-wash scalp massage and softer lengths.',
    detail:
      'Developed as DEBORRA’s foundational hair-care ritual, Rosemary Hair Oil combines aromatic rosemary leaf oil with cold-pressed sesame, sweet almond and coconut oils. Bottled in 100 ml amber glass with an outer carton to preserve botanical integrity without mineral oils or silicones.',
    claims:
      'Helps nourish dry scalps, reduce combing friction after wash day and leave hair noticeably softer and easier to manage with regular pre-wash oiling.',
    ingredients:
      'Sesamum indicum (Cold-Pressed Sesame) Seed Oil, Prunus amygdalus dulcis (Sweet Almond) Oil, Cocos nucifera (Virgin Coconut) Oil, Rosmarinus officinalis (Rosemary) Leaf Oil, Tocopherol (Vitamin E). Free from mineral oil, paraffin, parabens and synthetic fragrance.',
    usage:
      'Best suited for pre-wash scalp massages and conditioning mid-lengths to dry ends, 2 to 3 times a week.',
    directions:
      'Part dry or slightly damp hair into sections. Apply 4–6 drops along the scalp and massage gently with fingertips for 3–5 minutes. Smooth a small quantity down the lengths. Leave on for 45–60 minutes (or overnight) before washing with a gentle cleanser.',
    warnings:
      'For external use only. Perform a patch test on the inner forearm 24 hours before first application. Avoid direct contact with eyes. Store tightly capped below 30°C away from direct sunlight.',
    variants: [
      {
        id: 'DEB-RHO-100',
        sku: 'DEB-RHO-100',
        label: '100 ml · Amber Glass Bottle',
        price: 649,
        mrp: 749,
        stock: 25
      },
      {
        id: 'DEB-RHO-200',
        sku: 'DEB-RHO-200',
        label: 'Duo · 2 × 100 ml',
        price: 1199,
        mrp: 1498,
        stock: 12
      }
    ],
    productFaqs: [
      [
        'Why is it packaged in amber glass with an outer carton?',
        'Amber glass limits UV light exposure that can degrade natural oils and rosemary volatiles, while the outer carton protects the bottle during transit and storage.'
      ],
      [
        'Is it suitable for both men and women?',
        'Yes. DEBORRA formulations are designed to be gender-inclusive and adaptable to different scalp types and wash schedules.'
      ]
    ],
    featured: true
  },
  {
    slug: 'amla-hair-oil',
    name: 'Amla Hair Oil',
    category: 'hair-oils',
    group: 'Hair Oils',
    format: 'Hair oil · 100 ml Amber Glass & Carton',
    status: 'in-stock',
    stage: 'In Stock',
    image: 'amla-bottle.webp',
    alt: 'DEBORRA Amla Hair Oil 100 ml amber glass bottle and dark-green carton beside fresh green Indian gooseberries',
    secondaryImage: 'amla.webp',
    secondaryAlt: 'Fresh green Indian gooseberries arranged on warm sandstone',
    summary:
      'A classic Indian gooseberry infusion in light cold-pressed oils for dull, dry or frizz-prone hair.',
    detail:
      'Inspired by time-tested Indian oiling traditions, Amla Hair Oil infuses nutrient-rich Emblica officinalis (amla) and bhringraj extracts into cold-pressed coconut and sesame oils—delivering conditioning slip that rinses cleanly without heaviness.',
    claims:
      'Helps soften coarse strands, improve manageability and support natural surface shine without artificial colourants or sticky residue.',
    ingredients:
      'Cocos nucifera (Coconut) Oil, Sesamum indicum (Sesame) Seed Oil, Emblica officinalis (Amla) Fruit Extract, Eclipta alba (Bhringraj) Leaf Extract, Tocopherol (Natural Vitamin E). No mineral oil, synthetic dyes or silicones.',
    usage:
      'Ideal for weekly pre-wash conditioning rituals and dry or sun-exposed hair lengths.',
    directions:
      'Warm 1–2 teaspoons between your palms and massage evenly into the scalp and hair lengths. Leave on for at least 60 minutes, then wash thoroughly with a mild shampoo.',
    warnings:
      'For external use only. Patch test recommended for sensitive skin. Natural herbal extracts may vary slightly in hue across harvests without affecting quality.',
    variants: [
      {
        id: 'DEB-AHO-100',
        sku: 'DEB-AHO-100',
        label: '100 ml · Amber Glass Bottle',
        price: 549,
        mrp: 649,
        stock: 20
      },
      {
        id: 'DEB-AHO-200',
        sku: 'DEB-AHO-200',
        label: '200 ml · Value Bottle',
        price: 999,
        mrp: 1298,
        stock: 10
      }
    ],
    productFaqs: [
      [
        'How is this different from DEBORRA Amla Powder?',
        'Amla Hair Oil is an external topical oil for hair and scalp conditioning, while Amla Powder is a food-grade wellness supplement.'
      ],
      [
        'Does it contain artificial green colour?',
        'No. Our oil gets its natural warm golden-green tone strictly from botanical extracts and carrier oils.'
      ]
    ],
    featured: true
  },
  {
    slug: 'botanical-oil-blends',
    name: 'Botanical Oil Blends',
    category: 'hair-oils',
    group: 'Hair Oils',
    format: 'Targeted Blend · 100 ml Amber Glass',
    status: 'in-stock',
    stage: 'In Stock',
    image: 'oil-blends.webp',
    alt: 'Two DEBORRA Botanical Oil Blend 100 ml amber glass bottles with rosemary, amla berries and curry leaves on stone',
    secondaryImage: 'botanical-blend-study.webp',
    secondaryAlt: 'Golden botanical oil droplets on dark textured stone',
    summary:
      'Balanced multi-botanical blends combining rosemary, amla and lighter carrier oils for effortless wash-off.',
    detail:
      'Created for consumers who want the benefits of traditional hair oiling with a lighter, faster-rinsing feel. Choose between the Rosemary & Amla Dual Blend or our Light Daily Balance formula with jojoba and curry leaf.',
    claims:
      'Conditions dry hair fibres and helps maintain scalp comfort while rinsing cleanly in one gentle wash.',
    ingredients:
      'Simmondsia chinensis (Jojoba) Seed Oil, Prunus amygdalus dulcis (Sweet Almond) Oil, Helianthus annuus (Sunflower) Seed Oil, Rosmarinus officinalis (Rosemary) Oil, Emblica officinalis (Amla) Extract, Murraya koenigii (Curry Leaf) Extract, Tocopherol.',
    usage:
      'Suited for fine-to-medium hair types or humid Indian climates where heavier oils feel overly dense.',
    directions:
      'Apply 1 teaspoon across the scalp and through mid-lengths before washing, or smooth 1–2 drops over damp ends after towel-drying to tame flyaways.',
    warnings:
      'For external use only. Avoid contact with eyes. Store in a cool, dark place with the cap secured.',
    variants: [
      {
        id: 'DEB-BOB-RMA',
        sku: 'DEB-BOB-RMA',
        label: 'Rosemary & Amla Blend · 100 ml',
        price: 699,
        mrp: 799,
        stock: 18
      },
      {
        id: 'DEB-BOB-LGT',
        sku: 'DEB-BOB-LGT',
        label: 'Light Daily Balance · 100 ml',
        price: 679,
        mrp: 779,
        stock: 14
      }
    ],
    productFaqs: [
      [
        'Which blend should I choose if I wash my hair every alternate day?',
        'Light Daily Balance uses higher jojoba and sunflower fractions for faster rinse-off; Rosemary & Amla Blend offers richer nourishment for twice-weekly rituals.'
      ],
      [
        'Can I apply a drop on dry ends without rinsing?',
        'Yes—1 to 2 drops smoothed strictly over the bottom ends helps soften dryness between washes.'
      ]
    ],
    featured: false
  },
  {
    slug: 'hair-scalp-serum',
    name: 'Hair & Scalp Serum',
    category: 'serums',
    group: 'Serums',
    format: 'Leave-in Serum · 30 ml Dropper',
    status: 'in-stock',
    stage: 'In Stock',
    image: 'serum-bottle.webp',
    alt: 'DEBORRA Hair and Scalp Serum 30 ml amber glass dropper bottle beside a serum droplet in a ceramic dish',
    secondaryImage: 'serum.webp',
    secondaryAlt: 'A glass pipette releasing a golden serum droplet above an ivory ceramic dish',
    summary:
      'A featherlight, water-based leave-in serum formulated to hydrate the scalp and support stronger-feeling roots without oiliness.',
    detail:
      'Designed for daily routines where heavy oiling isn’t practical. Our Hair & Scalp Serum pairs rosemary leaf hydrosol with niacinamide (Vitamin B3), pro-vitamin B5 and plant peptides in a calibrated amber glass dropper.',
    claims:
      'Calms dry scalp tightness, supports scalp barrier hydration and leaves hair roots weightless and clean—ideal for overnight or daytime wear.',
    ingredients:
      'Aqua (Purified Water), Propanediol, Rosmarinus officinalis (Rosemary) Leaf Water, Niacinamide, Panthenol (Pro-Vitamin B5), Hydrolysed Pea Protein, Pisum sativum Sprout Extract, Sodium Gluconate, Phenoxyethanol, Ethylhexylglycerin.',
    usage:
      'Daily leave-in scalp care suitable for oily, balanced or dry scalps across all hair textures.',
    directions:
      'On a clean, dry or towel-dried scalp, use the dropper to dispense 1–2 ml in thin partings. Gently tap and massage with fingertips for 60 seconds. Leave in; do not rinse.',
    warnings:
      'External scalp use only. Do not apply to broken, abraded or inflamed skin. Discontinue use if irritation occurs.',
    variants: [
      {
        id: 'DEB-HSS-030',
        sku: 'DEB-HSS-030',
        label: '30 ml · Glass Dropper',
        price: 799,
        mrp: 899,
        stock: 16
      },
      {
        id: 'DEB-HSS-050',
        sku: 'DEB-HSS-050',
        label: '50 ml · Glass Dropper',
        price: 1199,
        mrp: 1399,
        stock: 9
      }
    ],
    productFaqs: [
      [
        'Will this serum make my hair look flat or greasy during the day?',
        'No. Because it is water-based rather than silicone- or oil-heavy, it dries cleanly at the root within minutes.'
      ],
      [
        'Can I use both Rosemary Hair Oil and Hair & Scalp Serum?',
        'Yes. Use the serum daily on clean scalp between washes, and use Rosemary Hair Oil as a pre-wash conditioning massage 1–2 times a week.'
      ]
    ],
    featured: true
  },
  {
    slug: 'amla-powder',
    name: 'Amla Powder',
    category: 'wellness',
    group: 'Wellness',
    format: '5 g Stick Packs & Amber Jar',
    status: 'in-stock',
    stage: 'In Stock',
    image: 'amla-sticks.webp',
    alt: 'DEBORRA Amla Powder 5 g forest-green stick packs, amber glass jar and stoneware scoop on organic linen',
    secondaryImage: 'wellness.webp',
    secondaryAlt: 'Finely milled botanical amla powder in a stoneware scoop beside fresh gooseberries',
    summary:
      'Single-ingredient, shade-dried Indian gooseberry powder in convenient pre-portioned 5 g stick packs or an airtight jar.',
    detail:
      'Sourced from mature Indian gooseberries and gently shade-dried to preserve natural polyphenols and tart botanical character. Available in travel-ready 5 g stick packs for consistent daily servings without measuring spoons, or a 150 g amber jar for home routines.',
    claims:
      'Provides naturally occurring plant antioxidants and vitamin C as part of a balanced daily diet, with zero fillers, sweeteners or preservatives.',
    ingredients:
      '100% Pure Shade-Dried Emblica officinalis (Indian Gooseberry / Amla) Fruit Powder. Packed in a facility that handles botanical powders.',
    usage:
      'Everyday wellness mix-in for adults seeking a simple, unflavoured botanical ritual.',
    directions:
      'Tear one 5 g stick pack (or measure 1 level teaspoon) and whisk thoroughly into 150–200 ml of lukewarm water or a morning smoothie, once daily after food.',
    warnings:
      'Nutritional food product for adults (18+). Not intended to diagnose, treat, cure or prevent any disease. If pregnant, nursing or on prescription medication, consult your physician before regular intake.',
    variants: [
      {
        id: 'DEB-AMP-S15',
        sku: 'DEB-AMP-S15',
        label: '15 Stick Packs (15 × 5 g)',
        price: 499,
        mrp: 599,
        stock: 22
      },
      {
        id: 'DEB-AMP-S30',
        sku: 'DEB-AMP-S30',
        label: '30 Stick Packs (30 × 5 g)',
        price: 899,
        mrp: 1099,
        stock: 15
      },
      {
        id: 'DEB-AMP-J150',
        sku: 'DEB-AMP-J150',
        label: '150 g · Amber Glass Jar',
        price: 599,
        mrp: 699,
        stock: 11
      }
    ],
    productFaqs: [
      [
        'Why offer portioned stick packs alongside a jar?',
        'Stick packs prevent moisture clumping in humid Indian weather and keep each 5 g serving hygienic and portable.'
      ],
      [
        'Does it contain added sugar or flavourings?',
        'No. It is 100% single-ingredient dried amla fruit powder with a naturally brisk, tangy taste.'
      ]
    ],
    featured: false
  },
  {
    slug: 'hair-creams',
    name: 'Hair Creams & Leave-ins',
    category: 'hair-care',
    group: 'Hair Cream & Care',
    format: 'Leave-in Cream · 100 ml (Phase 2)',
    status: 'coming-soon',
    stage: 'Phase 2 · Upcoming',
    image: 'hair-cream.webp',
    alt: 'DEBORRA Leave-In Hair Cream 100 ml matte ivory tube beside a smooth cream texture swipe on travertine stone',
    secondaryImage: 'hair-care-still-life.webp',
    secondaryAlt: 'Minimalist botanical cream texture study on travertine stone',
    summary:
      'Lightweight botanical leave-in cream engineered to tame frizz and soften mid-lengths between washes—launching in Phase 2.',
    detail:
      'Currently completing stability and humidity-performance trials as part of DEBORRA’s second hair-care release. Designed to bridge post-wash moisture and everyday styling control without silicone buildup.',
    claims:
      'Target performance under evaluation: frizz smoothing, easier detangling and soft hold for waves, curls and dry ends.',
    ingredients:
      'Botanical emollients, plant-derived conditioning agents, oat lipids and rosemary hydrosol base. Full INCI list will publish on launch.',
    usage:
      'Planned as a pea-sized post-wash leave-in applied to damp lengths and ends.',
    directions:
      'Final application guidance and pack directions will accompany the confirmed Phase 2 release.',
    warnings:
      'For external hair care use only. Join the waitlist below to receive launch availability alerts.',
    variants: [
      {
        id: 'DEB-HCL-100',
        sku: 'DEB-HCL-100',
        label: '100 ml · Matte Tube (Phase 2)',
        price: 649,
        mrp: 749,
        stock: 0
      }
    ],
    productFaqs: [
      [
        'When will Hair Creams & Leave-ins be available to order?',
        'DEBORRA launches in disciplined phases. Once Phase 1 hair oils and serums are established, Hair Creams will open for direct orders. Enter your email below to be notified first.'
      ]
    ],
    featured: false
  },
  {
    slug: 'botanical-gummies',
    name: 'Botanical Gummies',
    category: 'wellness',
    group: 'Wellness',
    format: 'Nutritional Gummies · 30 Count (Phase 2)',
    status: 'coming-soon',
    stage: 'Phase 2 · Compliance Review',
    image: 'gummies-jar.webp',
    alt: 'DEBORRA Botanical Gummies amber glass jar beside three natural pectin gummies and fresh green amla berries',
    secondaryImage: 'amla.webp',
    secondaryAlt: 'Fresh Indian gooseberries representing DEBORRA botanical wellness ingredients',
    summary:
      'Amla and Chawanprash-inspired daily gummies advancing strictly through expert formulation, lab testing and FSSAI review.',
    detail:
      'Our wellness gummy roadmap explores convenient, pectin-based amla and traditional chawanprash-inspired blends—with shilajit gummies remaining strictly exploratory subject to rigorous heavy-metal sourcing checks, safety testing and regulatory clearance.',
    claims:
      'Zero launch shortcuts: every gummy SKU will carry full nutritional disclosure, batch testing records and age-appropriate adult (18+) suitability labelling before going on sale.',
    ingredients:
      'Under expert formulation and regulatory verification. Confirmed ingredients, standardised extract amounts and allergen declarations will publish prior to ordering.',
    usage:
      'Designed as an easy, measured alternative for adults who prefer chewable daily nutrition.',
    directions:
      'Serving size, maximum daily intake and age guidance will be printed on the approved label.',
    warnings:
      'Intended for adults (18+) only. Not yet available for purchase pending safety, stability and regulatory sign-off.',
    variants: [
      {
        id: 'DEB-BGU-30',
        sku: 'DEB-BGU-30',
        label: 'Amla & Chawanprash · 30 Gummies (Phase 2)',
        price: 699,
        mrp: 799,
        stock: 0
      }
    ],
    productFaqs: [
      [
        'Why are Botanical Gummies not sold on Day 1?',
        'Oral wellness formats require strict stability testing, ingredient verification and FSSAI compliance review. We prefer transparent timelines over rushing an unverified supplement to market.'
      ],
      [
        'Are Shilajit gummies confirmed?',
        'Shilajit gummies are strictly in early research and will only move forward if sourcing purity, safety testing and regulatory standards are fully met.'
      ]
    ],
    featured: false
  }
];

export const articles = [
  {
    slug: 'a-simpler-hair-care-routine',
    title: 'A simpler hair-care routine',
    category: 'Hair care',
    image: 'everyday-routine.webp',
    alt: 'Everyday Indian hair-care routine in soft morning light',
    summary: 'A practical way to structure scalp oiling, daily serums and wash days around the time you actually have.',
    sections: [
      [
        'Start with the routine you already keep',
        'Before adding another bottle to your shelf, look at how often you actually wash your hair each week. Most routines work better with two dependable steps performed consistently than six steps abandoned after ten days.'
      ],
      [
        'Give each product a clear job',
        'Pre-wash botanical oils soften dry strands and reduce friction during massage; water-light scalp serums hydrate between wash days without weighing down roots. Keep each step distinct so products complement rather than compete.'
      ],
      [
        'Track texture and wash-off over four weeks',
        'Notice how your scalp feels the morning after application and how cleanly your hair rinses in one mild shampoo pass. Adjust drop count—not pressure—to suit seasonal humidity.'
      ]
    ]
  },
  {
    slug: 'reading-an-ingredient-label',
    title: 'How to read an ingredient label',
    category: 'Ingredients',
    image: 'ingredient-detail.webp',
    alt: 'Fresh rosemary sprigs and Indian gooseberries on natural linen',
    summary: 'What to check beyond the hero ingredient on the front of a bottle or pouch.',
    sections: [
      [
        'Check the base, not just the headline',
        'The front label often celebrates one botanical like rosemary or amla, while the base oils or solvents make up most of the formula. Always read the full INCI list to see whether a product relies on cold-pressed plant oils or cheap mineral-oil fillers.'
      ],
      [
        'Match directions to format',
        'Oil-based formulas are generally best suited for pre-wash conditioning and dry ends, while water-based serums belong on clean scalps as leave-ins. Comparing directions helps prevent buildup.'
      ],
      [
        'Look for measured, honest claims',
        'Careful brands explain what a formula supports—hydration, softness, reduced breakage from brushing—without promising overnight miracles. Transparency on cautions and patch testing is a sign of formulation respect.'
      ]
    ]
  },
  {
    slug: 'rosemary-and-amla-in-hair-oiling',
    title: 'Rosemary & amla in modern hair oiling',
    category: 'Ingredients',
    image: 'botanical-blend-study.webp',
    alt: 'Golden botanical oil droplets on dark textured stone',
    summary: 'Why pairing traditional Indian botanicals with UV-protective amber glass makes pre-wash oiling cleaner and more consistent.',
    sections: [
      [
        'Balanced dilution matters',
        'Pure essential oils like rosemary should never be applied undiluted directly onto skin. Blending precise aromatic concentrations into stable carrier oils such as sesame, sweet almond and coconut provides pleasant slip without irritation.'
      ],
      [
        'Why packaging protects potency',
        'Clear plastic bottles expose plant lipids to light and oxygen every day on a bathroom shelf. Dark amber glass bottles housed inside an outer carton help shield light-sensitive botanical compounds until the last drop.'
      ],
      [
        'Less oil, gentler massage',
        'Saturating hair excessively only forces harsher shampooing later. Four to six drops along the scalp followed by a light fingertip massage and a mild wash keeps hair soft without stripping moisture.'
      ]
    ]
  },
  {
    slug: 'choosing-between-hair-oil-and-scalp-serum',
    title: 'Hair oil vs. scalp serum: which do you need?',
    category: 'Routine Guide',
    image: 'serum.webp',
    alt: 'Calibrated glass pipette releasing a droplet of lightweight scalp serum',
    summary: 'How oil blends and water-light serums serve different moments in the week—and how to layer both cleanly.',
    sections: [
      [
        'When to reach for hair oil',
        'Choose a hair oil 45 minutes to a few hours before showering when hair lengths feel brittle, dry or tangled. Oils lubricate the hair shaft and cushion strands during washing.'
      ],
      [
        'When to use a leave-in scalp serum',
        'Reach for a water-based scalp serum on busy weekday mornings or after washing when you want lightweight scalp comfort, niacinamide and pro-vitamin B5 nourishment with zero visible shine at the roots.'
      ],
      [
        'Using both without buildup',
        'Reserve oil for pre-wash nights once or twice a week, and keep the dropper serum for clean-scalp days. Both fit effortlessly into a low-clutter bathroom routine.'
      ]
    ]
  }
];

export const faqs = [
  [
    'Which DEBORRA products are available to order right now?',
    'Phase 1 launch products—Rosemary Hair Oil (100 ml & Duo), Amla Hair Oil, Botanical Oil Blends, Hair & Scalp Serum and Amla Powder (Stick Packs & Jar)—are in stock and ready to ship across India. Hair Creams and Botanical Gummies are scheduled for Phase 2.'
  ],
  [
    'How do I place an order and which payment methods are accepted?',
    'Select your size or pack on any product page, click Add to bag, review your bag and proceed to checkout. We support UPI, credit/debit cards, net banking and wallets via Razorpay, as well as Cash on Delivery (COD) across India.'
  ],
  [
    'Can I use a discount code on my order?',
    'Yes. Enter DEBORRA10 (10% off), WELCOME15 (15% off orders ₹1,200+) or FREESHIP in your shopping bag or on the checkout page before completing your order.'
  ],
  [
    'What are shipping charges and delivery timelines across India?',
    'Orders of ₹999 or above qualify for free standard shipping across India. Orders below ₹999 carry a flat ₹60 delivery fee. Orders typically dispatch within 1–2 business days and arrive in 2–4 business days in metro cities or 4–7 business days elsewhere.'
  ],
  [
    'How do I track my DEBORRA order?',
    'Every order receives a unique Order ID (e.g. DEB-2026-...) on confirmation. Visit the Track Order page in the footer or header and enter your Order ID alongside your phone number or email to inspect live status.'
  ],
  [
    'What is your return and refund policy?',
    'If an item arrives damaged, leaking, defective or incorrect, contact us within 7 days of delivery with your Order ID and photos. Eligible replacements or full refunds are processed within 5–7 business days.'
  ],
  [
    'Where can I inspect full ingredients, directions and cautions?',
    'Every individual product page publishes the full ingredient breakdown, intended usage, step-by-step directions, safety warnings and product-specific FAQs—mirroring what appears on our cartons and bottle labels.'
  ],
  [
    'How can I contact DEBORRA customer support?',
    'Call us on +91 77150 38107 (Monday–Saturday, 10:00 AM–6:30 PM IST) or submit a message directly through the Contact & Support page.'
  ]
];
