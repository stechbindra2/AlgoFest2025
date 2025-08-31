'use client'

import { useMemo } from 'react'

interface AnalyticsChartProps {
  data: any
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  // Mock chart data for demo
  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      engagement: Math.floor(Math.random() * 40) + 60,
      completion: Math.floor(Math.random() * 30) + 70,
    }))
  }, [])

  const maxValue = Math.max(
    ...chartData.map(d => Math.max(d.engagement, d.completion))
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Engagement</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Completion</span>
          </div>
        </div>
      </div>

      <div className="h-48 flex items-end justify-between space-x-2">
        {chartData.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center space-y-2">
            <div className="w-full flex space-x-1 items-end" style={{ height: '120px' }}>
              <div
                className="bg-blue-500 rounded-t w-1/2 transition-all duration-500"
                style={{
                  height: `${(item.engagement / maxValue) * 100}%`
                }}
              ></div>
              <div
                className="bg-green-500 rounded-t w-1/2 transition-all duration-500"
                style={{
                  height: `${(item.completion / maxValue) * 100}%`
                }}
              ></div>
            </div>
            <span className="text-xs text-gray-500">{item.day}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">
            {Math.round(chartData.reduce((sum, d) => sum + d.engagement, 0) / chartData.length)}%
          </div>
          <p className="text-xs text-gray-500">Avg Engagement</p>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">
            {Math.round(chartData.reduce((sum, d) => sum + d.completion, 0) / chartData.length)}%
          </div>
          <p className="text-xs text-gray-500">Avg Completion</p>
        </div>
      </div>
    </div>
  )
}
