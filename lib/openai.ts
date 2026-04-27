import OpenAI from "openai";

// Lazy init — 빌드 타임에 env undefined일 때 모듈 top-level 평가가 throw되지 않도록.
let _client: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY 환경변수가 설정되지 않았습니다");
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536차원

export async function createEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: 1536,
  });
  return response.data[0].embedding;
}

// 배치 임베딩 (대량 매물 처리용)
export async function createEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  const BATCH_SIZE = 100;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await getOpenAI().embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: 1536,
    });
    results.push(...response.data.map((d) => d.embedding));
  }
  return results;
}

// Whisper STT (F8 음성메모용 — Week 5)
export async function transcribeAudio(audioFile: File | Blob): Promise<string> {
  const response = await getOpenAI().audio.transcriptions.create({
    file: audioFile as File,
    model: "whisper-1",
    language: "ko",
  });
  return response.text;
}
