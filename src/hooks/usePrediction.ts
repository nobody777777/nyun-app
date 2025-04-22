export type PredictionResult = {
  predictionValue: number;
  confidence: number;
  trendDirection: 'up' | 'down' | 'sideways';
  reasoning: string[];
  nextDate: string;
  percentChange: number;
}

export interface HuggingFaceConfig {
  apiKey: string;
  modelId: string;
  url?: string;
}

/**
 * Fungsi async untuk memprediksi nilai penjualan untuk hari berikutnya (besok)
 * menggunakan model AI dari Hugging Face
 */
export const usePrediction = async (
  data: number[],
  periods: { ema: number; sma: number; rsi: number } = { ema: 14, sma: 7, rsi: 14 },
  lastDateStr?: string,
  huggingFaceConfig?: HuggingFaceConfig
): Promise<PredictionResult> => {
  if (!data || data.length < 3 || !huggingFaceConfig?.apiKey || !huggingFaceConfig?.modelId) {
    throw new Error('Data atau konfigurasi tidak valid');
  }

  // Tentukan tanggal besok
  const baseDate = new Date(lastDateStr ? `${lastDateStr}T00:00:00+07:00` : new Date().toISOString());
  const tomorrow = new Date(baseDate);
  tomorrow.setDate(baseDate.getDate() + 1);
  const nextDateStr = tomorrow.toISOString().split('T')[0];

  // Buat prompt dengan tag <JSON> untuk mengunci keluaran JSON
  const prompt = `
Anda akan menerima data penjualan harian dalam bentuk angka.
Prediksikan nilai penjualan untuk tanggal ${nextDateStr}.
Balas hanya dengan tag <JSON> diikuti objek JSON, tanpa teks penjelas lainnya.
<JSON>
{
  "prediction_value": <number>,
  "confidence": <number>,
  "trend_direction": "up"|"down"|"sideways",
  "reasoning": ["..."],
  "percent_change": <number>
}
</JSON>
`.trim();

  // Panggil API internal untuk menghindari CORS dan mengelola Hugging Face secara server-side
  const response = await fetch('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, lastDateStr })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Predict API error ${response.status}: ${text}`);
  }
  const parsed = await response.json();
  return {
    predictionValue: parsed.prediction_value,
    confidence: parsed.confidence,
    trendDirection: parsed.trend_direction,
    reasoning: parsed.reasoning,
    nextDate: nextDateStr,
    percentChange: parsed.percent_change
  };
};

/**
 * Fungsi utility untuk digunakan dengan hook usePrediction
 */
export const createHuggingFaceConfig = (
  apiKey: string,
  modelId: string = 'google/flan-t5-large',
  url?: string
): HuggingFaceConfig => {
  return {
    apiKey,
    modelId,
    url
  };
};