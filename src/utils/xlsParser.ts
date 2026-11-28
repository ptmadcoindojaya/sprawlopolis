import * as XLSX from 'xlsx';
import { SprawlopolisCard, ZoneType } from '../types';
import { INITIAL_CARDS } from '../data/cards';

export interface ParsedXlsResult {
  cards: SprawlopolisCard[];
  errors: string[];
  successCount: number;
}

/**
 * Parses custom rules/cards from an uploaded Excel (.xls, .xlsx, .csv) file
 */
export function parseRulesFromXls(file: File): Promise<ParsedXlsResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

        const errors: string[] = [];
        const updatedCards = [...INITIAL_CARDS];
        let successCount = 0;

        jsonData.forEach((row, index) => {
          const cardId = Number(row.CardID || row.ID || row.id || row.CardId);
          if (!cardId || isNaN(cardId) || cardId < 1 || cardId > 18) {
            errors.push(`Baris ${index + 2}: ID Kartu tidak valid (harus angka 1-18).`);
            return;
          }

          const cardIndex = updatedCards.findIndex((c) => c.id === cardId);
          if (cardIndex === -1) {
            errors.push(`Baris ${index + 2}: ID Kartu ${cardId} tidak ditemukan.`);
            return;
          }

          const existingCard = updatedCards[cardIndex];

          const goalTitle = String(row.GoalTitle || row.Title || row.Judul || existingCard.goal.title);
          const targetPoints = Number(row.TargetPoints || row.Points || row.TargetPoin || cardId);
          const descId = String(row.DescriptionID || row.Deskripsi || row.Description || existingCard.goal.descriptionId);

          const parseZone = (val: any, defaultZone: ZoneType): ZoneType => {
            const z = String(val || '').trim().toUpperCase();
            if (['R', 'C', 'I', 'P'].includes(z)) return z as ZoneType;
            return defaultZone;
          };

          const b0Zone = parseZone(row.Block0_Zone || row.BlockTL, existingCard.blocks[0].zone);
          const b1Zone = parseZone(row.Block1_Zone || row.BlockTR, existingCard.blocks[1].zone);
          const b2Zone = parseZone(row.Block2_Zone || row.BlockBL, existingCard.blocks[2].zone);
          const b3Zone = parseZone(row.Block3_Zone || row.BlockBR, existingCard.blocks[3].zone);

          updatedCards[cardIndex] = {
            ...existingCard,
            goal: {
              ...existingCard.goal,
              title: goalTitle,
              targetPoints: isNaN(targetPoints) ? cardId : targetPoints,
              descriptionId: descId
            },
            blocks: [
              { ...existingCard.blocks[0], zone: b0Zone },
              { ...existingCard.blocks[1], zone: b1Zone },
              { ...existingCard.blocks[2], zone: b2Zone },
              { ...existingCard.blocks[3], zone: b3Zone }
            ]
          };

          successCount++;
        });

        resolve({
          cards: updatedCards,
          errors,
          successCount
        });
      } catch (err) {
        resolve({
          cards: INITIAL_CARDS,
          errors: [`Gagal membaca file XLS: ${(err as Error).message}`],
          successCount: 0
        });
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Downloads a pre-formatted XLS template for Sprawlopolis custom rules
 */
export function downloadSampleXlsTemplate() {
  const templateData = INITIAL_CARDS.map((c) => ({
    CardID: c.id,
    GoalTitle: c.goal.title,
    TargetPoints: c.goal.targetPoints,
    DescriptionID: c.goal.descriptionId,
    Block0_Zone: c.blocks[0].zone,
    Block1_Zone: c.blocks[1].zone,
    Block2_Zone: c.blocks[2].zone,
    Block3_Zone: c.blocks[3].zone
  }));

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sprawlopolis_Rules');

  XLSX.writeFile(workbook, 'Sprawlopolis_Custom_Rules_Template.xlsx');
}
