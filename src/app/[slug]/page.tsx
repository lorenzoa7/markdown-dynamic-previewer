/* eslint-disable @typescript-eslint/no-unused-vars */
// app/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { getMarkdownFileBySlugFromPublico } from '@/lib/googleDrive'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

// Força a renderização dinâmica a cada requisição
export const dynamic = 'force-dynamic'

interface PageProps {
  params: { slug: string }
}

export default async function EpisodePage({ params }: PageProps) {
  const { slug } = await Promise.resolve(params)

  // Busca o arquivo Markdown com base no slug (nome da subpasta)
  const fileData = await getMarkdownFileBySlugFromPublico(slug)
  if (!fileData) {
    notFound()
  }

  const { file, content } = fileData
  // O título da página será o nome da subpasta (ou do arquivo, removendo a extensão .md)
  const title = file.name.replace(/\.md$/, '')

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-4xl">
        <h1 className="mb-6 text-center text-3xl font-bold">{title}</h1>
        <article className="prose prose-slate mx-auto max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              br: ({ node: _, ...props }) => (
                <span {...props} className="my-4 block" />
              ),
              del: ({ node: _, ...props }) => (
                <del {...props} className="line-through" />
              ),
              ul: ({ node: _, ...props }) => (
                <ul {...props} className="ml-1 list-disc" />
              ),
              ol: ({ node: _, ...props }) => (
                <ol {...props} className="ml-1 list-decimal" />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
