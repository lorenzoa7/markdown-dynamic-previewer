/* eslint-disable @typescript-eslint/no-unused-vars */
import { notFound } from 'next/navigation'
import { getMarkdownFileByUrlPath } from '@/lib/google-drive'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<{ p?: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const urlPath = slug.join('/')

  const fileData = await getMarkdownFileByUrlPath(urlPath)
  if (!fileData) {
    return {}
  }
  const title = fileData.file.name.replace(/\.md$/i, '')

  return {
    title,
  }
}

export default async function EpisodePage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const urlPath = slug.join('/')

  const fileData = await getMarkdownFileByUrlPath(urlPath)
  if (!fileData) {
    notFound()
  }

  const { p: urlPassword } = await searchParams

  if (fileData.password) {
    if (urlPassword !== fileData.password) {
      notFound()
    }
  }

  const title = fileData.file.name.replace(/\.md$/i, '')

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-center rounded-lg border-2 border-slate-300 p-6 text-center">
          <h1 className="text-center font-title text-3xl font-bold ">
            {title}
          </h1>
        </div>

        <article className="prose prose-slate mx-auto w-full max-w-none rounded-lg border-2 border-slate-300 p-6">
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
            {fileData.content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
