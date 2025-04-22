'use client'

interface ChartControlsProps {
  activeDataset: string[]
  setActiveDataset: (dataset: string[]) => void
  showSMA: boolean
  setShowSMA: (show: boolean) => void
  showEMA: boolean
  setShowEMA: (show: boolean) => void
  showRSI: boolean
  setShowRSI: (show: boolean) => void
  showPrediction: boolean
  setShowPrediction: (show: boolean) => void
  displayMode: 'daily' | 'cumulative'
  setDisplayMode: (mode: 'daily' | 'cumulative') => void
  isFullscreen: boolean
  toggleFullscreen: () => Promise<void>
}

export const ChartControls = ({
  activeDataset,
  setActiveDataset,
  showSMA,
  setShowSMA,
  showEMA,
  setShowEMA,
  showRSI,
  setShowRSI,
  showPrediction,
  setShowPrediction,
  displayMode,
  setDisplayMode,
  isFullscreen,
  toggleFullscreen
}: ChartControlsProps) => {
  return (
    <div className="chart-controls">
      <button
        className={`toggle-btn ${activeDataset.includes('roti') ? 'active' : ''}`}
        onClick={() => {
          const newDataset = activeDataset.includes('roti')
            ? activeDataset.filter(item => item !== 'roti')
            : [...activeDataset, 'roti'];
          setActiveDataset(newDataset);
        }}
        data-type="dataset"
      >
        Roti
      </button>
      
      <button
        className={`toggle-btn ${activeDataset.includes('omset') ? 'active' : ''}`}
        onClick={() => {
          const newDataset = activeDataset.includes('omset')
            ? activeDataset.filter(item => item !== 'omset')
            : [...activeDataset, 'omset'];
          setActiveDataset(newDataset);
        }}
        data-type="dataset"
      >
        Omset
      </button>
      
      <button
        className={`toggle-btn ${showSMA ? 'active' : ''}`}
        onClick={() => setShowSMA(!showSMA)}
        title="SMA-7"
        data-type="indicator"
      >
        SMA
      </button>
      
      <button
        className={`toggle-btn ${showEMA ? 'active' : ''}`}
        onClick={() => setShowEMA(!showEMA)}
        title="EMA-14"
        data-type="indicator"
      >
        EMA
      </button>
      
      <button
        className={`toggle-btn ${showRSI ? 'active' : ''}`}
        onClick={() => setShowRSI(!showRSI)}
        title="RSI-14"
        data-type="indicator"
      >
        RSI
      </button>
      
      <button
        className={`toggle-btn ${showPrediction ? 'active' : ''}`}
        onClick={() => {
          setShowPrediction(!showPrediction);
        }}
        title="Prediksi"
        style={{ 
          backgroundColor: showPrediction ? '#8b5cf6' : '', 
          color: showPrediction ? 'white' : '',
          position: 'relative',
          overflow: 'hidden'
        }}
        data-type="indicator"
      >
        Prediksi
        {showPrediction && (
          <span style={{ 
            position: 'absolute', 
            top: '2px', 
            right: '2px', 
            height: '8px', 
            width: '8px', 
            backgroundColor: '#fbbf24', 
            borderRadius: '50%'
          }}></span>
        )}
      </button>
      
      <button
        className={`toggle-btn ${displayMode === 'daily' ? 'active' : ''}`}
        onClick={() => setDisplayMode('daily')}
        data-type="view"
      >
        Harian
      </button>
      
      <button
        className={`toggle-btn ${displayMode === 'cumulative' ? 'active' : ''}`}
        onClick={() => setDisplayMode('cumulative')}
        data-type="view"
      >
        Kumulatif
      </button>
      
      <button
        className={`toggle-btn ${isFullscreen ? 'bg-orange-500 text-white border-orange-600' : ''}`}
        onClick={toggleFullscreen}
        data-type="view"
        title={isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? (
          <span style={{ fontSize: '1.25rem' }}>⤓</span>
        ) : (
          <span style={{ fontSize: '1.25rem' }}>⤢</span>
        )}
      </button>
    </div>
  )
} 