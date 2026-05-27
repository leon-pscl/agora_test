import type { RentalUnit } from '@/types';
import { prisma } from '@/lib/db';

const EMBEDDING_SIZE = 128;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

export function createEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_SIZE).fill(0);
  const tokens = tokenize(text);

  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i += 1) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    const index = hash % EMBEDDING_SIZE;
    vector[index] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) return vector;
  return vector.map((value) => value / magnitude);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
  }
  return dot;
}

function parseEmbedding(value: string): number[] {
  try {
    return JSON.parse(value) as number[];
  } catch {
    return [];
  }
}

function chunkUnit(unit: RentalUnit): Array<{ chunkType: string; content: string }> {
  const chunks: Array<{ chunkType: string; content: string }> = [
    {
      chunkType: 'summary',
      content: [
        `Unit: ${unit.name}`,
        `Type: ${unit.type}`,
        `Monthly rent: PHP ${unit.price.toLocaleString()}`,
        `Availability: ${unit.availability}`,
        `Address: ${unit.address}`,
        `Max occupants: ${unit.max_occupants}`,
        `Pets allowed: ${unit.pets_allowed ? 'Yes' : 'No'}`,
      ].join('\n'),
    },
  ];

  if (unit.rules.length > 0) {
    chunks.push({
      chunkType: 'rules',
      content: `Rules for ${unit.name}:\n${unit.rules.join('\n')}`,
    });
  }

  if (unit.requirements.length > 0) {
    chunks.push({
      chunkType: 'requirements',
      content: `Move-in requirements for ${unit.name}:\n${unit.requirements.join('\n')}`,
    });
  }

  for (const faq of unit.faqs) {
    chunks.push({
      chunkType: 'faq',
      content: `Unit: ${unit.name}\nQ: ${faq.question}\nA: ${faq.answer}`,
    });
  }

  if (unit.viewing_slots.length > 0) {
    const slots = unit.viewing_slots
      .filter((slot) => slot.available)
      .map((slot) => `- ${slot.datetime}`)
      .join('\n');
    chunks.push({
      chunkType: 'schedule',
      content: `Available viewing slots for ${unit.name}:\n${slots}`,
    });
  }

  return chunks;
}

export async function indexLandlordKnowledge(
  landlordId: string,
  units: RentalUnit[],
): Promise<void> {
  await prisma.knowledgeChunk.deleteMany({ where: { landlordId } });

  const rows = units.flatMap((unit) =>
    chunkUnit(unit).map((chunk) => ({
      landlordId,
      unitId: unit.unit_id,
      chunkType: chunk.chunkType,
      content: chunk.content,
      embedding: JSON.stringify(createEmbedding(chunk.content)),
    })),
  );

  if (rows.length > 0) {
    await prisma.knowledgeChunk.createMany({ data: rows });
  }
}

export async function retrieveKnowledgeContext(options: {
  landlordId: string;
  unitId?: string;
  query?: string;
  limit?: number;
}): Promise<string[]> {
  const { landlordId, unitId, query, limit = 8 } = options;
  const chunks = await prisma.knowledgeChunk.findMany({
    where: {
      landlordId,
      ...(unitId ? { unitId } : {}),
    },
  });

  if (chunks.length === 0) return [];

  if (!query) {
    return chunks.slice(0, limit).map((chunk) => chunk.content);
  }

  const queryEmbedding = createEmbedding(query);
  return chunks
    .map((chunk) => ({
      content: chunk.content,
      score: cosineSimilarity(queryEmbedding, parseEmbedding(chunk.embedding)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((chunk) => chunk.content);
}
