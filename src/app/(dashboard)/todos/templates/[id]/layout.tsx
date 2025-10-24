import { notFound } from 'next/navigation'
import { getTodoTemplateById } from '@/app/actions/todo-templates'
import type { Metadata } from 'next'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params

  const result = await getTodoTemplateById(id)

  if (!result.success || !result.data) {
    return {
      title: '템플릿을 찾을 수 없습니다',
    }
  }

  return {
    title: `${result.data.title} - 과제 템플릿`,
  }
}

export default async function TemplateLayout({ children, params }: LayoutProps) {
  return children
}
