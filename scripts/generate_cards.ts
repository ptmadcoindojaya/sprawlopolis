import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Card definition interface matching src/data/cards.ts
interface Block {
  zone: 'R' | 'C' | 'I' | 'P';
  roads: {
    top?: boolean;
    right?: boolean;
    bottom?: boolean;
    left?: boolean;
  };
}

interface Goal {
  id: number;
  title: string;
  targetPoints: number;
  descriptionId: string;
}

interface Card {
  id: number;
  goal: Goal;
  blocks: Block[];
}

const CARDS: Card[] = [
  {
    id: 1,
    goal: { id: 1, title: 'THE OUTSKIRTS', targetPoints: 1, descriptionId: '1 PT / Jalan yang tidak berakhir di tepi kota. -1 PT / Jalan yang berakhir di tepi kota.' },
    blocks: [
      { zone: 'C', roads: { top: true, left: true } },
      { zone: 'P', roads: {} },
      { zone: 'I', roads: { left: true, right: true } },
      { zone: 'R', roads: { left: true, right: true } }
    ]
  },
  {
    id: 2,
    goal: { id: 2, title: 'BLOOM BOOM', targetPoints: 2, descriptionId: '1 PT / Setiap baris & kolom berisi tepat 3 blok Taman. -1 PT / Setiap baris & kolom dengan tepat 0 blok Taman.' },
    blocks: [
      { zone: 'I', roads: { top: true, left: true } },
      { zone: 'P', roads: {} },
      { zone: 'R', roads: { left: true, right: true } },
      { zone: 'C', roads: { left: true, right: true } }
    ]
  },
  {
    id: 3,
    goal: { id: 3, title: 'GO GREEN', targetPoints: 3, descriptionId: '1 PT / Blok Taman di kotamu. -3 PTS / Blok Industri di kotamu.' },
    blocks: [
      { zone: 'C', roads: { top: true, bottom: true } },
      { zone: 'P', roads: {} },
      { zone: 'I', roads: { top: true, right: true } },
      { zone: 'R', roads: { left: true, right: true } }
    ]
  },
  {
    id: 4,
    goal: { id: 4, title: 'BLOCK PARTY', targetPoints: 4, descriptionId: 'Dapatkan poin per kelompok 4 blok (2x2) tipe sama: 0 klaster = -8 PTS | 1 = -5 PTS | 2 = -2 PTS | 3 = -1 PT | 4 = 4 PTS | 5+ = 7 PTS.' },
    blocks: [
      { zone: 'I', roads: { top: true, left: true } },
      { zone: 'C', roads: { top: true, bottom: true } },
      { zone: 'P', roads: {} },
      { zone: 'R', roads: { top: true, bottom: true } }
    ]
  },
  {
    id: 5,
    goal: { id: 5, title: 'STACKS AND SCRAPERS', targetPoints: 5, descriptionId: '2 PTS / Blok Industri yang bersebelahan DENGAN Blok Komersial atau Industri saja (tidak menyentuh Perumahan / Taman).' },
    blocks: [
      { zone: 'R', roads: { top: true, bottom: true } },
      { zone: 'P', roads: {} },
      { zone: 'C', roads: { top: true, right: true } },
      { zone: 'I', roads: { left: true, right: true } }
    ]
  },
  {
    id: 6,
    goal: { id: 6, title: 'MASTER PLANNED', targetPoints: 6, descriptionId: 'Kurangi jumlah blok dalam kelompok Industri terbesar dari jumlah kelompok Perumahan terbesar. Dapatkan poin sebanyak itu.' },
    blocks: [
      { zone: 'P', roads: {} },
      { zone: 'C', roads: { top: true, bottom: true } },
      { zone: 'R', roads: { left: true, right: true } },
      { zone: 'I', roads: { top: true, left: true } }
    ]
  },
  {
    id: 7,
    goal: { id: 7, title: 'CENTRAL PERKS', targetPoints: 7, descriptionId: '1 PT / Blok Taman yang terletak di bagian dalam kota (interior). -2 PTS / Blok Taman di pinggir kota.' },
    blocks: [
      { zone: 'P', roads: {} },
      { zone: 'R', roads: { top: true, bottom: true } },
      { zone: 'I', roads: { left: true, right: true } },
      { zone: 'C', roads: { top: true, left: true } }
    ]
  },
  {
    id: 8,
    goal: { id: 8, title: "THE 'BURBS", targetPoints: 8, descriptionId: '1 PT / Blok Taman bersebelahan dengan kelompok Perumahan terbesar. -2 PTS / Blok Industri yang berdekatan dengan kelompok Perumahan terbesar.' },
    blocks: [
      { zone: 'P', roads: {} },
      { zone: 'I', roads: { top: true, bottom: true } },
      { zone: 'C', roads: { left: true, bottom: true } },
      { zone: 'R', roads: { top: true, bottom: true } }
    ]
  },
  {
    id: 9,
    goal: { id: 9, title: 'CONCRETE JUNGLE', targetPoints: 9, descriptionId: '1 PT / Blok Industri yang berbagi sudut (secara diagonal) dengan setidaknya 1 blok Industri lainnya.' },
    blocks: [
      { zone: 'P', roads: {} },
      { zone: 'R', roads: { top: true, right: true } },
      { zone: 'I', roads: { left: true, right: true } },
      { zone: 'C', roads: { left: true, right: true } }
    ]
  },
  {
    id: 10,
    goal: { id: 10, title: 'THE STRIP', targetPoints: 10, descriptionId: '1 PT / Blok Komersial di 1 Baris atau Kolom pilihanmu (Hanya dapat mencetak skor untuk 1 Baris atau 1 Kolom).' },
    blocks: [
      { zone: 'P', roads: {} },
      { zone: 'R', roads: { top: true, bottom: true } },
      { zone: 'I', roads: { left: true, bottom: true } },
      { zone: 'C', roads: { top: true, bottom: true } }
    ]
  },
  {
    id: 11,
    goal: { id: 11, title: 'MINI MARTS', targetPoints: 11, descriptionId: '2 PTS / Blok Komersial yang terletak tepat di antara dua blok Perumahan dengan jalan yang sama menghubungkan ketiga blok.' },
    blocks: [
      { zone: 'P', roads: {} },
      { zone: 'C', roads: { top: true, right: true } },
      { zone: 'R', roads: { left: true, right: true } },
      { zone: 'I', roads: { left: true, right: true } }
    ]
  },
  {
    id: 12,
    goal: { id: 12, title: 'SUPERHIGHWAY', targetPoints: 12, descriptionId: '1 PT / Setiap 2 bagian jalan (dibulatkan ke bawah) yang merupakan bagian dari jalan terpanjangmu.' },
    blocks: [
      { zone: 'P', roads: {} },
      { zone: 'I', roads: { top: true, right: true } },
      { zone: 'C', roads: { left: true, right: true } },
      { zone: 'R', roads: { left: true, right: true } }
    ]
  },
  {
    id: 13,
    goal: { id: 13, title: 'PARK HOPPING', targetPoints: 13, descriptionId: '3 PTS / Jalan yang dimulai di satu Taman dan berakhir di Taman lain (Taman berbeda).' },
    blocks: [
      { zone: 'R', roads: { top: true, left: true } },
      { zone: 'I', roads: { top: true, bottom: true } },
      { zone: 'P', roads: {} },
      { zone: 'C', roads: { top: true, bottom: true } }
    ]
  },
  {
    id: 14,
    goal: { id: 14, title: 'LOOPING LANES', targetPoints: 14, descriptionId: '1 PT / Ruas jalan dalam satu putaran penuh (loop). Kamu dapat memperoleh beberapa putaran di kotamu.' },
    blocks: [
      { zone: 'P', roads: {} },
      { zone: 'I', roads: { bottom: true, top: true } },
      { zone: 'C', roads: { left: true, right: true } },
      { zone: 'R', roads: { left: true, top: true } }
    ]
  },
  {
    id: 15,
    goal: { id: 15, title: 'SKID ROW', targetPoints: 15, descriptionId: '2 PTS / Blok Perumahan yang berdekatan dengan 2 atau lebih blok Industri.' },
    blocks: [
      { zone: 'C', roads: { top: true, left: true } },
      { zone: 'R', roads: { top: true, bottom: true } },
      { zone: 'P', roads: {} },
      { zone: 'I', roads: { top: true, bottom: true } }
    ]
  },
  {
    id: 16,
    goal: { id: 16, title: 'MORNING COMMUTE', targetPoints: 16, descriptionId: '2 PTS / Jalan yang melewati (menghubungkan) blok Perumahan DAN blok Komersial.' },
    blocks: [
      { zone: 'I', roads: { top: true, bottom: true } },
      { zone: 'P', roads: {} },
      { zone: 'R', roads: { top: true, right: true } },
      { zone: 'C', roads: { left: true, right: true } }
    ]
  },
  {
    id: 17,
    goal: { id: 17, title: 'TOURIST TRAPS', targetPoints: 17, descriptionId: '1 PT / Blok Komersial di pinggir kota. Tambahan 1 PT / Blok Komersial di tepi sudut.' },
    blocks: [
      { zone: 'P', roads: {} },
      { zone: 'C', roads: { top: true, bottom: true } },
      { zone: 'R', roads: { left: true, bottom: true } },
      { zone: 'I', roads: { top: true, bottom: true } }
    ]
  },
  {
    id: 18,
    goal: { id: 18, title: 'SPRAWLOPOLIS', targetPoints: 18, descriptionId: 'Tambahkan jumlah blok di Baris terpanjangmu ke Jumlah blok di Kolom terpanjangmu (lewat celah apa pun). Raih poin sebanyak itu.' },
    blocks: [
      { zone: 'R', roads: { top: true, left: true } },
      { zone: 'P', roads: {} },
      { zone: 'C', roads: { left: true, right: true } },
      { zone: 'I', roads: { left: true, right: true } }
    ]
  }
];

const ZONE_COLORS: Record<string, { bg: string; name: string; icon: string }> = {
  R: { bg: '#f59e0b', name: 'PERUMAHAN', icon: '🏡' },
  C: { bg: '#0284c7', name: 'KOMERSIAL', icon: '🏬' },
  I: { bg: '#475569', name: 'INDUSTRI', icon: '🏭' },
  P: { bg: '#10b981', name: 'TAMAN', icon: '🌲' }
};

// Generate Front (Blocks Side - sp_{id}_1.png)
function renderCardFrontSVG(card: Card): string {
  const width = 400;
  const height = 560;
  const cardRadius = 24;

  const blockPositions = [
    { x: 20, y: 80, w: 170, h: 210 },  // NW (0)
    { x: 210, y: 80, w: 170, h: 210 }, // NE (1)
    { x: 20, y: 310, w: 170, h: 210 }, // SW (2)
    { x: 210, y: 310, w: 170, h: 210 } // SE (3)
  ];

  let blocksSvg = '';

  card.blocks.forEach((block, idx) => {
    const pos = blockPositions[idx];
    const zone = ZONE_COLORS[block.zone];
    const cx = pos.x + pos.w / 2;
    const cy = pos.y + pos.h / 2;

    let roadsSvg = '';
    const roadWidth = 32;

    if (block.roads.top) {
      roadsSvg += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${pos.y}" stroke="#334155" stroke-width="${roadWidth}" stroke-linecap="square"/>`;
      roadsSvg += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${pos.y}" stroke="#facc15" stroke-width="4" stroke-dasharray="8 6"/>`;
    }
    if (block.roads.right) {
      roadsSvg += `<line x1="${cx}" y1="${cy}" x2="${pos.x + pos.w}" y2="${cy}" stroke="#334155" stroke-width="${roadWidth}" stroke-linecap="square"/>`;
      roadsSvg += `<line x1="${cx}" y1="${cy}" x2="${pos.x + pos.w}" y2="${cy}" stroke="#facc15" stroke-width="4" stroke-dasharray="8 6"/>`;
    }
    if (block.roads.bottom) {
      roadsSvg += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${pos.y + pos.h}" stroke="#334155" stroke-width="${roadWidth}" stroke-linecap="square"/>`;
      roadsSvg += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${pos.y + pos.h}" stroke="#facc15" stroke-width="4" stroke-dasharray="8 6"/>`;
    }
    if (block.roads.left) {
      roadsSvg += `<line x1="${cx}" y1="${cy}" x2="${pos.x}" y2="${cy}" stroke="#334155" stroke-width="${roadWidth}" stroke-linecap="square"/>`;
      roadsSvg += `<line x1="${cx}" y1="${cy}" x2="${pos.x}" y2="${cy}" stroke="#facc15" stroke-width="4" stroke-dasharray="8 6"/>`;
    }
    if (block.roads.top || block.roads.right || block.roads.bottom || block.roads.left) {
      roadsSvg += `<circle cx="${cx}" cy="${cy}" r="16" fill="#334155"/>`;
    }

    blocksSvg += `
      <g>
        <rect x="${pos.x}" y="${pos.y}" width="${pos.w}" height="${pos.h}" rx="12" fill="${zone.bg}" />
        <text x="${pos.x + 12}" y="${pos.y + 32}" font-family="sans-serif" font-weight="900" font-size="28" fill="#ffffff" opacity="0.9">${zone.icon}</text>
        <text x="${pos.x + pos.w - 12}" y="${pos.y + 28}" text-anchor="end" font-family="monospace" font-weight="bold" font-size="16" fill="#ffffff" opacity="0.85">${block.zone}</text>
        <text x="${pos.x + 12}" y="${pos.y + pos.h - 12}" font-family="sans-serif" font-weight="bold" font-size="12" fill="#ffffff" opacity="0.9">${zone.name}</text>
        ${roadsSvg}
      </g>
    `;
  });

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" rx="${cardRadius}" fill="url(#cardBg)" stroke="#38bdf8" stroke-width="4"/>
      <rect x="8" y="8" width="${width - 16}" height="${height - 16}" rx="${cardRadius - 4}" fill="none" stroke="#0284c7" stroke-width="1.5" opacity="0.6"/>

      <!-- Header Tag -->
      <rect x="20" y="24" width="100" height="36" rx="10" fill="#f59e0b"/>
      <text x="70" y="48" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="20" fill="#0f172a">SP #${card.id}</text>
      <text x="${width - 24}" y="48" text-anchor="end" font-family="sans-serif" font-weight="bold" font-size="14" fill="#38bdf8">SPRAWLOPOLIS</text>

      ${blocksSvg}

      <!-- Bottom Card ID -->
      <text x="${width / 2}" y="${height - 18}" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="14" fill="#94a3b8">KARTU #${card.id} (BLOK &amp; JALAN)</text>
    </svg>
  `;
}

// Generate Back (Goal / Rule Side - sp_{id}_2.png)
function renderCardBackSVG(card: Card): string {
  const width = 400;
  const height = 560;
  const cardRadius = 24;

  // Escape XML special characters
  const safeTitle = card.goal.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeDesc = card.goal.descriptionId.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Split description text into lines
  const words = safeDesc.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + word).length > 28) {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });
  if (currentLine) lines.push(currentLine.trim());

  let linesSvg = '';
  lines.forEach((line, idx) => {
    linesSvg += `<text x="200" y="${280 + idx * 28}" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="17" fill="#f1f5f9">${line}</text>`;
  });

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goalBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1e1b4b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" rx="${cardRadius}" fill="url(#goalBg)" stroke="#f59e0b" stroke-width="5"/>
      <rect x="8" y="8" width="${width - 16}" height="${height - 16}" rx="${cardRadius - 4}" fill="none" stroke="#d97706" stroke-width="1.5" opacity="0.6"/>

      <!-- Header Label -->
      <rect x="30" y="30" width="340" height="40" rx="10" fill="#f59e0b" opacity="0.15"/>
      <text x="200" y="56" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="16" fill="#fbbf24" letter-spacing="2">TARGET &amp; ATURAN SKOR</text>

      <!-- Goal Title -->
      <text x="200" y="115" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="24" fill="#ffffff">${safeTitle}</text>

      <!-- Target Points Circle -->
      <circle cx="200" cy="180" r="42" fill="#f59e0b" stroke="#fef08a" stroke-width="3"/>
      <text x="200" y="188" text-anchor="middle" font-family="monospace" font-weight="900" font-size="34" fill="#0f172a">${card.goal.targetPoints}</text>
      <text x="200" y="238" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="13" fill="#fbbf24">TARGET SKOR</text>

      <!-- Description Box -->
      <rect x="30" y="250" width="340" height="${Math.max(160, lines.length * 30 + 40)}" rx="16" fill="#0284c7" opacity="0.15" stroke="#38bdf8" stroke-width="1.5"/>
      ${linesSvg}

      <!-- Bottom Card Identifier -->
      <rect x="30" y="490" width="340" height="40" rx="10" fill="#0f172a" stroke="#334155" stroke-width="1"/>
      <text x="200" y="515" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="15" fill="#f59e0b">SPRAWLOPOLIS KARTU #${card.id}</text>
    </svg>
  `;
}

async function generateAllCards() {
  const outDir = path.join(process.cwd(), 'public', 'cards');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const card of CARDS) {
    const frontSvg = renderCardFrontSVG(card);
    const backSvg = renderCardBackSVG(card);

    const frontPath = path.join(outDir, `sp_${card.id}_1.png`);
    const backPath = path.join(outDir, `sp_${card.id}_2.png`);

    await sharp(Buffer.from(frontSvg)).png().toFile(frontPath);
    await sharp(Buffer.from(backSvg)).png().toFile(backPath);

    console.log(`Generated sp_${card.id}_1.png and sp_${card.id}_2.png`);
  }
  console.log('All card images successfully generated in /public/cards/');
}

generateAllCards().catch(err => {
  console.error('Error generating cards:', err);
  process.exit(1);
});
