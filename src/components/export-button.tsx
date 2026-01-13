'use client'

import { Button } from './ui/button'
import { Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ExportButtonProps {
  endpoint: string
  filename: string
  label?: string
}

export function ExportButton({ endpoint, filename, label = 'Export CSV' }: ExportButtonProps) {
  const { toast } = useToast()

  const handleExport = async () => {
    try {
      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error('Export failed')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({
        title: 'Success',
        description: 'Data exported successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive',
      })
    }
  }

  return (
    <Button onClick={handleExport} variant="outline">
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  )
}
