'use client'

import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'

interface PieChartProps {
  title?: string
  description?: string
  data: any[]
  dataKey: string
  nameKey: string
  height?: number
  valueFormatter?: (value: number) => string
  showLabels?: boolean
}

export function PieChart({
  title,
  description,
  data,
  dataKey,
  nameKey,
  height = 300,
  valueFormatter,
  showLabels = true
}: PieChartProps) {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

  const renderCustomLabel = (entry: any) => {
    if (!showLabels) return ''
    const value = valueFormatter ? valueFormatter(entry.value) : entry.value
    return `${entry.name}: ${value}`
  }

  return (
    <Card>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsPieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={renderCustomLabel}
              labelLine={showLabels}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={valueFormatter ? (value: any) => valueFormatter(value) : undefined}
            />
            <Legend />
          </RechartsPieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
