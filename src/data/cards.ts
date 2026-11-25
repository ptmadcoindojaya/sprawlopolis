import { SprawlopolisCard } from '../types';

/**
 * Updated 18 Sprawlopolis Cards based on Official CSV Data:
 * Block index layout in 2x2 grid:
 * 0: Top-Left (NW)    | 1: Top-Right (NE)
 * 2: Bottom-Left (SW) | 3: Bottom-Right (SE)
 */

export const INITIAL_CARDS: SprawlopolisCard[] = [
  {
    id: 1,
    goal: {
      id: 1,
      title: 'THE OUTSKIRTS',
      targetPoints: 1,
      category: 'road',
      description: '1 PT / Road not ending at city edge. -1 PT / Road ending at city edge.',
      descriptionId: '1 PT / Jalan yang tidak berakhir di tepi kota. -1 PT / Jalan yang berakhir di tepi kota.'
    },
    blocks: [
      { zone: 'C', roads: { top: true, left: true } },     // NW: Komersial
      { zone: 'P', roads: {} },                            // NE: Taman
      { zone: 'I', roads: { left: true, right: true } },   // SW: Industri
      { zone: 'R', roads: { left: true, right: true } }    // SE: Perumahan
    ]
  },
  {
    id: 2,
    goal: {
      id: 2,
      title: 'BLOOM BOOM',
      targetPoints: 2,
      category: 'pattern',
      description: '1 PT / Each row & column with exactly 3 Park blocks. -1 PT / Each row & column with exactly 0 Park blocks.',
      descriptionId: '1 PT / Setiap baris & kolom berisi tepat 3 blok Taman. -1 PT / Setiap baris & kolom dengan tepat 0 blok Taman.'
    },
    blocks: [
      { zone: 'I', roads: { top: true, left: true } },     // NW: Industri
      { zone: 'P', roads: {} },                            // NE: Taman
      { zone: 'R', roads: { left: true, right: true } },   // SW: Perumahan
      { zone: 'C', roads: { left: true, right: true } }    // SE: Komersial
    ]
  },
  {
    id: 3,
    goal: {
      id: 3,
      title: 'GO GREEN',
      targetPoints: 3,
      category: 'zone',
      description: '1 PT / Park block in city. -3 PTS / Industrial block in city.',
      descriptionId: '1 PT / Blok Taman di kotamu. -3 PTS / Blok Industri di kotamu.'
    },
    blocks: [
      { zone: 'C', roads: { top: true, bottom: true } },   // NW: Komersial
      { zone: 'P', roads: {} },                            // NE: Taman
      { zone: 'I', roads: { top: true, right: true } },    // SW: Industri
      { zone: 'R', roads: { left: true, right: true } }    // SE: Perumahan
    ]
  },
  {
    id: 4,
    goal: {
      id: 4,
      title: 'BLOCK PARTY',
      targetPoints: 4,
      category: 'pattern',
      description: 'Points per 2x2 same type block cluster: 0 = -8 PTS | 1 = -5 PTS | 2 = -2 PTS | 3 = -1 PT | 4 = 4 PTS | 5+ = 7 PTS.',
      descriptionId: 'Dapatkan poin per kelompok 4 blok (2x2) tipe sama: 0 klaster = -8 PTS | 1 = -5 PTS | 2 = -2 PTS | 3 = -1 PT | 4 = 4 PTS | 5+ = 7 PTS.'
    },
    blocks: [
      { zone: 'I', roads: { top: true, left: true } },     // NW: Industri
      { zone: 'C', roads: { top: true, bottom: true } },   // NE: Komersial
      { zone: 'P', roads: {} },                            // SW: Taman
      { zone: 'R', roads: { top: true, bottom: true } }    // SE: Perumahan
    ]
  },
  {
    id: 5,
    goal: {
      id: 5,
      title: 'STACKS AND SCRAPERS',
      targetPoints: 5,
      category: 'adjacency',
      description: '2 PTS / Industrial block adjacent ONLY to Commercial or Industrial (no Residential / Park).',
      descriptionId: '2 PTS / Blok Industri yang bersebelahan DENGAN Blok Komersial atau Industri saja (tidak menyentuh Perumahan / Taman).'
    },
    blocks: [
      { zone: 'R', roads: { top: true, bottom: true } },   // NW: Perumahan
      { zone: 'P', roads: {} },                            // NE: Taman
      { zone: 'C', roads: { top: true, right: true } },    // SW: Komersial
      { zone: 'I', roads: { left: true, right: true } }    // SE: Industri
    ]
  },
  {
    id: 6,
    goal: {
      id: 6,
      title: 'MASTER PLANNED',
      targetPoints: 6,
      category: 'zone',
      description: 'Subtract size of largest Industrial group from size of largest Residential group.',
      descriptionId: 'Kurangi jumlah blok dalam kelompok Industri terbesar dari jumlah kelompok Perumahan terbesar. Dapatkan poin sebanyak itu.'
    },
    blocks: [
      { zone: 'P', roads: {} },                            // NW: Taman
      { zone: 'C', roads: { top: true, bottom: true } },   // NE: Komersial
      { zone: 'R', roads: { left: true, right: true } },   // SW: Perumahan
      { zone: 'I', roads: { top: true, left: true } }      // SE: Industri
    ]
  },
  {
    id: 7,
    goal: {
      id: 7,
      title: 'CENTRAL PERKS',
      targetPoints: 7,
      category: 'pattern',
      description: '1 PT / Park block in interior. -2 PTS / Park block on edge.',
      descriptionId: '1 PT / Blok Taman yang terletak di bagian dalam kota (interior). -2 PTS / Blok Taman di pinggir kota.'
    },
    blocks: [
      { zone: 'P', roads: {} },                            // NW: Taman
      { zone: 'R', roads: { top: true, bottom: true } },   // NE: Perumahan
      { zone: 'I', roads: { left: true, right: true } },   // SW: Industri
      { zone: 'C', roads: { top: true, left: true } }      // SE: Komersial
    ]
  },
  {
    id: 8,
    goal: {
      id: 8,
      title: "THE 'BURBS",
      targetPoints: 8,
      category: 'adjacency',
      description: '1 PT / Park adjacent to largest Residential group. -2 PTS / Industrial adjacent to largest Residential group.',
      descriptionId: "1 PT / Blok Taman bersebelahan dengan kelompok Perumahan terbesar. -2 PTS / Blok Industri yang berdekatan dengan kelompok Perumahan terbesar."
    },
    blocks: [
      { zone: 'P', roads: {} },                            // NW: Taman
      { zone: 'I', roads: { top: true, bottom: true } },   // NE: Industri
      { zone: 'C', roads: { left: true, bottom: true } },  // SW: Komersial
      { zone: 'R', roads: { top: true, bottom: true } }    // SE: Perumahan
    ]
  },
  {
    id: 9,
    goal: {
      id: 9,
      title: 'CONCRETE JUNGLE',
      targetPoints: 9,
      category: 'adjacency',
      description: '1 PT / Industrial block sharing diagonal corner with at least 1 other Industrial block.',
      descriptionId: '1 PT / Blok Industri yang berbagi sudut (secara diagonal) dengan setidaknya 1 blok Industri lainnya.'
    },
    blocks: [
      { zone: 'P', roads: {} },                            // NW: Taman
      { zone: 'R', roads: { top: true, right: true } },    // NE: Perumahan
      { zone: 'I', roads: { left: true, right: true } },   // SW: Industri
      { zone: 'C', roads: { left: true, right: true } }    // SE: Komersial
    ]
  },
  {
    id: 10,
    goal: {
      id: 10,
      title: 'THE STRIP',
      targetPoints: 10,
      category: 'pattern',
      description: '1 PT / Commercial block in 1 Row or Column of your choice.',
      descriptionId: '1 PT / Blok Komersial di 1 Baris atau Kolom pilihanmu (Hanya dapat mencetak skor untuk 1 Baris atau 1 Kolom).'
    },
    blocks: [
      { zone: 'P', roads: {} },                            // NW: Taman
      { zone: 'R', roads: { top: true, bottom: true } },   // NE: Perumahan
      { zone: 'I', roads: { left: true, bottom: true } },  // SW: Industri
      { zone: 'C', roads: { top: true, bottom: true } }    // SE: Komersial
    ]
  },
  {
    id: 11,
    goal: {
      id: 11,
      title: 'MINI MARTS',
      targetPoints: 11,
      category: 'road',
      description: '2 PTS / Commercial block between two Residential blocks with same road connecting all three.',
      descriptionId: '2 PTS / Blok Komersial yang terletak tepat di antara dua blok Perumahan dengan jalan yang sama menghubungkan ketiga blok.'
    },
    blocks: [
      { zone: 'P', roads: {} },                            // NW: Taman
      { zone: 'C', roads: { top: true, right: true } },    // NE: Komersial
      { zone: 'R', roads: { left: true, right: true } },   // SW: Perumahan
      { zone: 'I', roads: { left: true, right: true } }    // SE: Industri
    ]
  },
  {
    id: 12,
    goal: {
      id: 12,
      title: 'SUPERHIGHWAY',
      targetPoints: 12,
      category: 'road',
      description: '1 PT / Every 2 road segments (rounded down) in your longest road.',
      descriptionId: '1 PT / Setiap 2 bagian jalan (dibulatkan ke bawah) yang merupakan bagian dari jalan terpanjangmu.'
    },
    blocks: [
      { zone: 'P', roads: {} },                            // NW: Taman
      { zone: 'I', roads: { top: true, right: true } },    // NE: Industri
      { zone: 'C', roads: { left: true, right: true } },   // SW: Komersial
      { zone: 'R', roads: { left: true, right: true } }    // SE: Perumahan
    ]
  },
  {
    id: 13,
    goal: {
      id: 13,
      title: 'PARK HOPPING',
      targetPoints: 13,
      category: 'road',
      description: '3 PTS / Road starting at one Park and ending at another Park.',
      descriptionId: '3 PTS / Jalan yang dimulai di satu Taman dan berakhir di Taman lain (Taman berbeda).'
    },
    blocks: [
      { zone: 'R', roads: { top: true, left: true } },     // NW: Perumahan
      { zone: 'I', roads: { top: true, bottom: true } },   // NE: Industri
      { zone: 'P', roads: {} },                            // SW: Taman
      { zone: 'C', roads: { top: true, bottom: true } }    // SE: Komersial
    ]
  },
  {
    id: 14,
    goal: {
      id: 14,
      title: 'LOOPING LANES',
      targetPoints: 14,
      category: 'road',
      description: '1 PT / Road segment in a full loop.',
      descriptionId: '1 PT / Ruas jalan dalam satu putaran penuh (loop). Kamu dapat memperoleh beberapa putaran di kotamu.'
    },
    blocks: [
      { zone: 'P', roads: {} },                            // NW: Taman
      { zone: 'I', roads: { bottom: true, top: true } },   // NE: Industri
      { zone: 'C', roads: { left: true, right: true } },   // SW: Komersial
      { zone: 'R', roads: { left: true, top: true } }      // SE: Perumahan
    ]
  },
  {
    id: 15,
    goal: {
      id: 15,
      title: 'SKID ROW',
      targetPoints: 15,
      category: 'adjacency',
      description: '2 PTS / Residential block adjacent to 2 or more Industrial blocks.',
      descriptionId: '2 PTS / Blok Perumahan yang berdekatan dengan 2 atau lebih blok Industri.'
    },
    blocks: [
      { zone: 'C', roads: { top: true, left: true } },     // NW: Komersial
      { zone: 'R', roads: { top: true, bottom: true } },   // NE: Perumahan
      { zone: 'P', roads: {} },                            // SW: Taman
      { zone: 'I', roads: { top: true, bottom: true } }    // SE: Industri
    ]
  },
  {
    id: 16,
    goal: {
      id: 16,
      title: 'MORNING COMMUTE',
      targetPoints: 16,
      category: 'road',
      description: '2 PTS / Road connecting Residential AND Commercial blocks.',
      descriptionId: '2 PTS / Jalan yang melewati (menghubungkan) blok Perumahan DAN blok Komersial.'
    },
    blocks: [
      { zone: 'I', roads: { top: true, bottom: true } },   // NW: Industri
      { zone: 'P', roads: {} },                            // NE: Taman
      { zone: 'R', roads: { top: true, right: true } },    // SW: Perumahan
      { zone: 'C', roads: { left: true, right: true } }    // SE: Komersial
    ]
  },
  {
    id: 17,
    goal: {
      id: 17,
      title: 'TOURIST TRAPS',
      targetPoints: 17,
      category: 'pattern',
      description: '1 PT / Commercial block on edge. Additional +1 PT if at corner edge.',
      descriptionId: '1 PT / Blok Komersial di pinggir kota. Tambahan 1 PT / Blok Komersial di tepi sudut.'
    },
    blocks: [
      { zone: 'P', roads: {} },                            // NW: Taman
      { zone: 'C', roads: { top: true, bottom: true } },   // NE: Komersial
      { zone: 'R', roads: { left: true, bottom: true } },  // SW: Perumahan
      { zone: 'I', roads: { top: true, bottom: true } }    // SE: Industri
    ]
  },
  {
    id: 18,
    goal: {
      id: 18,
      title: 'SPRAWLOPOLIS',
      targetPoints: 18,
      category: 'pattern',
      description: 'Add blocks in longest Row to blocks in longest Column.',
      descriptionId: 'Tambahkan jumlah blok di Baris terpanjangmu ke Jumlah blok di Kolom terpanjangmu (lewat celah apa pun). Raih poin sebanyak itu.'
    },
    blocks: [
      { zone: 'R', roads: { top: true, left: true } },     // NW: Perumahan
      { zone: 'P', roads: {} },                            // NE: Taman
      { zone: 'C', roads: { left: true, right: true } },   // SW: Komersial
      { zone: 'I', roads: { left: true, right: true } }    // SE: Industri
    ]
  }
];

export const ZONE_NAMES: Record<
  string,
  { id: string; en: string; bg: string; text: string; hex: string; lipHex: string; motifHex: string; icon: string }
> = {
  R: {
    id: 'Perumahan',
    en: 'Residential',
    bg: 'bg-[#f4a28c]',
    text: 'text-[#4e2218]',
    hex: '#f4a28c',
    lipHex: '#d37e68',
    motifHex: '#e28870',
    icon: '🏡'
  },
  C: {
    id: 'Bisnis / Komersial',
    en: 'Commercial',
    bg: 'bg-[#8ec5e8]',
    text: 'text-[#193b52]',
    hex: '#8ec5e8',
    lipHex: '#679fc4',
    motifHex: '#76b0d6',
    icon: '🏬'
  },
  I: {
    id: 'Industri',
    en: 'Industrial',
    bg: 'bg-[#d8c39e]',
    text: 'text-[#453620]',
    hex: '#d8c39e',
    lipHex: '#b39b74',
    motifHex: '#c3ac85',
    icon: '🏭'
  },
  P: {
    id: 'Taman',
    en: 'Park',
    bg: 'bg-[#9fd3a8]',
    text: 'text-[#1e4627]',
    hex: '#9fd3a8',
    lipHex: '#76ae80',
    motifHex: '#84be8f',
    icon: '🌲'
  }
};
