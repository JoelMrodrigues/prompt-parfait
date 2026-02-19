import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronUp, ChevronDown } from 'lucide-react'

export const StatsTable = ({ data, columns }) => {
  const [sortKey, setSortKey] = useState(null)
  const [sortDirection, setSortDirection] = useState('desc')

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0

    const aVal = typeof a[sortKey] === 'number' ? a[sortKey] : String(a[sortKey]).toLowerCase()
    const bVal = typeof b[sortKey] === 'number' ? b[sortKey] : String(b[sortKey]).toLowerCase()

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })

  const formatValue = (value, column) => {
    if (typeof value === 'number') {
      if (column.type === 'percentage') {
        return `${value.toFixed(1)}%`
      }
      if (column.type === 'decimal') {
        return value.toFixed(2)
      }
      return value
    }
    return value
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-dark-bg">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-dark-card transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {sortKey === column.key && (
                      <span>
                        {sortDirection === 'asc' ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, idx) => (
              <motion.tr
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                className="border-t border-dark-border hover:bg-dark-bg/50 transition-colors"
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm">
                    {column.render
                      ? column.render(row[column.key], row)
                      : formatValue(row[column.key], column)}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {sortedData.length === 0 && (
        <div className="text-center py-12 text-gray-400">Aucune donnée disponible</div>
      )}
    </div>
  )
}
