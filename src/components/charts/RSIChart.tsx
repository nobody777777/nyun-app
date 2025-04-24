import { Line } from 'react-chartjs-2'
import { useRSI } from '@/hooks/useRSI'
import { ChartOptions } from 'chart.js'

interface RSIChartProps {
  data: number[]
  period?: number
  maxScale?: number
}

type FontWeight = 'normal' | 'bold' | 'bolder' | 'lighter' | number

// Definisikan type untuk context yang sederhana
type CustomContext = {
  tick?: {
    value: number
  }
}

export const RSIChart = ({ data, period = 14, maxScale = 50 }: RSIChartProps) => {
  const rsiData = useRSI(data, period, maxScale)

  const overboughtLevel = Math.round(0.7 * maxScale)
  const oversoldLevel = Math.round(0.3 * maxScale)
  const neutralLevel = Math.round(0.5 * maxScale)
  const neutralHighLevel = Math.round(0.6 * maxScale)
  const neutralLowLevel = Math.round(0.4 * maxScale)

  const chartData = {
    labels: Array(data.length).fill(''),
    datasets: [
      {
        label: 'RSI',
        data: rsiData,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
        fill: true
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y
            if (typeof value !== 'number') return ''
            let label = `RSI: ${value.toFixed(1)}`
            if (value >= overboughtLevel) {
              label += ' (Overbought)'
            } else if (value <= oversoldLevel) {
              label += ' (Oversold)'
            }
            return label
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        display: false,
        grid: {
          display: false
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        min: 0,
        max: maxScale,
        grid: {
          color: (ctx: any) => {
            if (!ctx?.tick?.value) return 'rgba(0, 0, 0, 0.07)'
            if (ctx.tick.value === overboughtLevel) return 'rgba(239, 68, 68, 0.2)'
            if (ctx.tick.value === oversoldLevel) return 'rgba(34, 197, 94, 0.2)'
            return 'rgba(0, 0, 0, 0.07)'
          },
          drawBorder: false
        },
        ticks: {
          color: (ctx: any) => {
            if (!ctx?.tick?.value) return '#6b7280'
            if (ctx.tick.value === overboughtLevel) return 'rgb(239, 68, 68)'
            if (ctx.tick.value === oversoldLevel) return 'rgb(34, 197, 94)'
            return '#6b7280'
          },
          font: {
            size: 11,
            weight: (ctx: any): FontWeight => {
              if (!ctx?.tick?.value) return 400
              return [oversoldLevel, neutralLevel, overboughtLevel].includes(ctx.tick.value) ? 600 : 400
            }
          },
          callback: (value: number) => {
            if (value === overboughtLevel) return 'Overbought'
            if (value === oversoldLevel) return 'Oversold'
            if (value === neutralLevel) return 'Netral'
            return value
          },
          stepSize: Math.max(5, Math.round(maxScale / 10)),
          padding: 8
        }
      }
    }
  } as ChartOptions<'line'>

  const legendItems = [
    { label: `Overbought (${overboughtLevel})`, color: 'rgb(239, 68, 68)' },
    { label: `Netral Atas (${neutralHighLevel})`, color: 'rgb(139, 92, 246)' },
    { label: `Netral (${neutralLevel})`, color: 'rgb(99, 102, 241)' },
    { label: `Netral Bawah (${neutralLowLevel})`, color: 'rgb(139, 92, 246)' },
    { label: `Oversold (${oversoldLevel})`, color: 'rgb(34, 197, 94)' }
  ]

  // Pastikan data valid sebelum render Chart
  const isDataValid = rsiData && rsiData.length > 0 && chartData?.datasets?.[0]?.data?.length > 0

  return (
    <div className="sales-chart__rsi">
      <div className="relative">
        {isDataValid ? (
          <Line 
            data={chartData} 
            options={chartOptions} 
            redraw={false} 
          />
        ) : (
          <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">
            <p className="text-gray-500 text-sm">Tidak cukup data untuk menampilkan RSI</p>
          </div>
        )}
        
        <div className="absolute top-0 right-0 bottom-0 w-20 flex flex-col justify-between p-2 text-xs">
          <div className="text-right text-gray-500">{maxScale}</div>
          <div className="text-right text-red-500">{overboughtLevel}</div>
          <div className="text-right text-purple-500">{neutralHighLevel}</div>
          <div className="text-right text-blue-500">{neutralLevel}</div>
          <div className="text-right text-purple-500">{neutralLowLevel}</div>
          <div className="text-right text-green-500">{oversoldLevel}</div>
          <div className="text-right text-gray-500">0</div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-2 justify-center text-xs">
        {legendItems.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-3 h-3 mr-1 rounded-full" style={{ backgroundColor: item.color }}></div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
} 