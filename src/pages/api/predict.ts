import type { NextApiRequest, NextApiResponse } from 'next';

interface SalesItem {
  value: number;
  date: string;
}

interface ReqBody {
  sales?: SalesItem[];
  data?: number[];
  lastDateStr?: string;
  oversold_level?: number;
  overbought_level?: number;
}

type PredictionApiResponse = {
  prediction_value: number;
  confidence: number;
  trend_direction: 'up' | 'down' | 'sideways';
  reasoning: string[];
  percent_change: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PredictionApiResponse | { error: string; raw?: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  // Validasi input baru: sales (array objek) atau data (array angka)
  const { sales, data, lastDateStr, oversold_level, overbought_level } = req.body as ReqBody;
  let values: number[] = [];
  let dates: string[] = [];

  if (Array.isArray(sales) && sales.length > 0) {
    values = sales.map(s => s.value);
    dates = sales.map(s => s.date);
  } else if (Array.isArray(data) && data.length > 0) {
    values = data;
    // Jika tidak ada sales, generate tanggal dummy
    const today = new Date();
    for (let i = data.length - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - (data.length - 1 - i));
      dates.push(date.toISOString().split('T')[0]);
    }
  } else {
    return res.status(400).json({ error: 'Invalid input: expected sales (array of {value, date}) atau data (array angka)' });
  }

  const modelId = process.env.HF_MODEL_ID || 'Esperanto/Mistral-7B-TimeSeriesReasoner';
  const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing Hugging Face API key' });
  }

  // Tanggal terakhir diambil dari sales terakhir atau lastDateStr
  const dateStr = lastDateStr || dates[dates.length - 1] || new Date().toISOString().split('T')[0];

  // Bangun prompt dengan instruksi yang sangat jelas agar model hanya mengeluarkan angka penjualan dan mempertimbangkan level jenuh jual/beli
  let salesStr = values.map((v, i) => `${dates[i]}: ${v}`).join(', ');
  let levelStr = '';
  if (typeof oversold_level === 'number' && typeof overbought_level === 'number') {
    levelStr = ` The oversold (jenuh jual) level is ${oversold_level} and the overbought (jenuh beli) level is ${overbought_level}.`;
  } else if (typeof oversold_level === 'number') {
    levelStr = ` The oversold (jenuh jual) level is ${oversold_level}.`;
  } else if (typeof overbought_level === 'number') {
    levelStr = ` The overbought (jenuh beli) level is ${overbought_level}.`;
  }
  const prompt = `Given the following sales data: [${salesStr}],${levelStr} Analyze the data and predict the next sales value after ${dateStr}. Also, consider whether the sales are currently in an oversold or overbought condition, and provide reasoning. Only output the predicted sales value as a number. Do not output a date, text, or any explanation, only the number.`;
  const body = { inputs: prompt };

  const apiUrl = `https://api-inference.huggingface.co/models/${modelId}`;
  
  try {
    // First check if model is ready
    const statusRes = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    if (!statusRes.ok) {
      return res.status(424).json({ 
        error: 'Model not ready', 
        raw: await statusRes.text() 
      });
    }

    // Make prediction request
    const hfRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!hfRes.ok) {
      const errorText = await hfRes.text();
      return res.status(hfRes.status).json({ 
        error: 'Prediction failed', 
        raw: errorText 
      });
    }

    const prediction = await hfRes.json();
    
    // Parsing respons model Hugging Face
    let rawText = '';
    if (typeof prediction === 'string') {
      rawText = prediction;
    } else if (prediction.generated_text) {
      rawText = prediction.generated_text;
    } else if (prediction[0]?.generated_text) {
      rawText = prediction[0].generated_text;
    } else if (prediction.prediction_value?.generated_text) {
      rawText = prediction.prediction_value.generated_text;
    } else {
      rawText = JSON.stringify(prediction);
    }

    // Jika output model berupa 'YYYY-MM-DD: angka', ambil angka setelah titik dua
    let predValue = 0;
    let match = rawText.match(/\d{4}-\d{2}-\d{2}:?\s*([-+]?[0-9]*\.?[0-9]+)/);
    if (match) {
      predValue = parseFloat(match[1]);
    } else {
      // Jika tidak, ambil angka pertama dari output
      match = rawText.match(/([-+]?[0-9]*\.?[0-9]+)/);
      if (match) {
        predValue = parseFloat(match[1]);
      } else {
        return res.status(422).json({
          error: 'Model output tidak mengandung angka penjualan yang valid. Silakan coba lagi atau perbaiki prompt/model.',
          raw: rawText
        });
      }
    }
    const lastValue = values[values.length-1] || 1;
    const percentChange = lastValue !== 0 ? ((predValue - lastValue) / lastValue) * 100 : 0;
    const trend = predValue > lastValue ? 'up' : predValue < lastValue ? 'down' : 'sideways';

    const result: PredictionApiResponse = {
      prediction_value: predValue,
      confidence: 0.9,
      trend_direction: trend as 'up' | 'down' | 'sideways',
      reasoning: ['Model output processed', `Raw output: ${rawText}`],
      percent_change: percentChange
    };

    return res.status(200).json(result);

  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ 
      error: 'Internal server error', 
      raw: e.message 
    });
  }
}
