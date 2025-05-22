/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type * as React from "react"
import { XAxis, YAxis, Tooltip, BarChart, Bar, ResponsiveContainer } from "recharts"

interface ChartContainerProps {
  className?: string
  data: any[]
  xField: string
  yField: string
  // categories: string[] // TODO: Implement or remove if not needed
  children: React.ReactNode
}

function ChartContainer({ className, data, xField, yField, /* categories, */ children }: ChartContainerProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis dataKey={xField} />
        <YAxis dataKey={yField} />
        <Tooltip />
        {children}
      </BarChart>
    </ResponsiveContainer>
  )
}

interface ChartBarsProps {
  color?: string
}

function ChartBars({ color = "#8884d8" }: ChartBarsProps) {
  // Ensure dataKey matches what's used in the ChartContainer's yField or a specific category
  // For simplicity, assuming 'value' is the key for bar height as in the scaffold.
  // This might need to be dynamic based on `categories` in a more complex chart.
  return <Bar dataKey="value" fill={color} />
}

export { ChartContainer, ChartBars } 