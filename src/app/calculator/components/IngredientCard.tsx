interface IngredientCardProps {
  id: string
  name: string
  price: number
  unit: string
  category: string
  quantity: number
  icon?: string
  onIncrement: (id: string) => void
  onReset: (id: string) => void
}

export default function IngredientCard({
  id,
  name,
  price,
  unit,
  category,
  quantity,
  icon,
  onIncrement,
  onReset
}: IngredientCardProps) {
  // Fungsi untuk menentukan warna border berdasarkan kategori
  const getBorderColor = () => {
    switch (category) {
      case 'baku':
        return 'border-blue-400'
      case 'bumbu':
        return 'border-green-400'
      case 'kemasan':
        return 'border-yellow-400'
      default:
        return 'border-gray-400'
    }
  }

  return (
    <div
      onClick={() => onIncrement(id)}
      className={`
        bg-white rounded-xl shadow-md p-5 
        cursor-pointer transition-all duration-200
        hover:shadow-lg hover:scale-[1.02] 
        border-l-4 ${getBorderColor()}
        relative
      `}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {icon && <span className="text-2xl">{icon}</span>}
          <h3 className="text-xl font-semibold text-gray-800">{name}</h3>
        </div>
        <span className="text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
          Rp {price.toLocaleString()}
        </span>
      </div>
      
      <div className="flex justify-between items-center mt-3">
        <div className="flex items-center gap-2">
          <span className={`
            text-sm px-2 py-1 rounded-full capitalize
            ${category === 'baku' ? 'bg-blue-50 text-blue-600' : 
              category === 'bumbu' ? 'bg-green-50 text-green-600' :
              'bg-yellow-50 text-yellow-600'}
          `}>
            {category}
          </span>
          <span className="text-sm text-gray-500">{unit}</span>
        </div>
        <div className="flex items-center space-x-3">
          {quantity > 0 && (
            <>
              <span className="text-lg font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                x{quantity}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onReset(id)
                }}
                className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-full transition-colors"
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>

      {quantity > 0 && (
        <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow-md">
          {quantity}
        </div>
      )}
    </div>
  )
} 