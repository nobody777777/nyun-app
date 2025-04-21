from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import pandas as pd
from prophet import Prophet

app = FastAPI()

class SalesItem(BaseModel):
    value: float
    date: str  # format: YYYY-MM-DD

class PredictRequest(BaseModel):
    sales: List[SalesItem]
    periods: int = 1  # jumlah hari prediksi ke depan

@app.post("/predict_prophet")
def predict_prophet(req: PredictRequest):
    if not req.sales or len(req.sales) < 2:
        raise HTTPException(status_code=400, detail="Data penjualan minimal 2 baris.")
    df = pd.DataFrame([{"ds": s.date, "y": s.value} for s in req.sales])
    model = Prophet()
    model.fit(df)
    future = model.make_future_dataframe(periods=req.periods)
    forecast = model.predict(future)
    # Ambil prediksi terakhir sesuai periods
    next_pred = forecast.iloc[-req.periods:][["ds", "yhat"]].to_dict(orient="records")
    return {"prediction": next_pred}
