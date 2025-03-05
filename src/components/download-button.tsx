'use client'

import React from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

type DownloadButtonProps = {
  content: string
  filename: string
}

export function DownloadButton({ content, filename }: DownloadButtonProps) {
  function handleDownload() {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Button
      variant="link"
      onClick={handleDownload}
      className="flex w-fit items-center gap-2"
    >
      <Download className="size-4" />
      Download file (.md)
    </Button>
  )
}
