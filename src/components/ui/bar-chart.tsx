'use client'

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'

interface BarChartProps {
  title?: string
  description?: string
  data: any[]
  xKey: string
  bars: {
    dataKey: string
    name: string
    color?: string
  }[]
  height?: number
  valueFormatter?: (value: number) => string
  layout?: 'horizontal' | 'vertical'
}

export function BarChart({
  title,
  description,
  data,
  xKey,
  bars,
  height = 300,
  valueFormatter,
  layout = 'horizontal'
}: BarChartProps) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

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
          <RechartsBarChart
            data={data}
            layout={layout}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            {layout === 'horizontal' ? (
              <>
                <XAxis
                  dataKey={xKey}
                  className="text-sm"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis
                  className="text-sm"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                  tickFormatter={valueFormatter}
                />
              </>
            ) : (
              <>
                <XAxis
                  type="number"
                  className="text-sm"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                  tickFormatter={valueFormatter}
                />
                <YAxis
                  type="category"
                  dataKey={xKey}
                  className="text-sm"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
              </>
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={valueFormatter ? (value: any) => valueFormatter(value) : undefined}
            />
            <Legend />
            {bars.map((bar, index) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                name={bar.name}
                fill={bar.color || colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
