'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { withServerAction } from '@/lib/server-action-helpers'

export interface BookItem {
  id: string
  title: string
  author: string | null
  barcode: string | null
  active: boolean
  created_at: string
}

const createBookSchema = z.object({
  title: z.string().trim().min(1, '도서명은 필수입니다.').max(200),
  author: z.string().trim().max(100).optional().nullable(),
  barcode: z.string().trim().max(100).optional().nullable(),
})

const bulkCreateBooksSchema = z.object({
  books: z.array(createBookSchema).min(1, '등록할 도서가 없습니다.').max(1000),
})

export async function getBooks() {
  return withServerAction(
    async ({ tenantId, serviceClient }) => {
      const { data, error } = await serviceClient
        .from('books')
        .select('id, title, author, barcode, active, created_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as BookItem[]
    },
    { actionName: 'getBooks', defaultValue: [] as BookItem[] }
  )
}

export async function bulkCreateBooks(input: z.infer<typeof bulkCreateBooksSchema>) {
  return withServerAction(
    async ({ tenantId, serviceClient }) => {
      const validated = bulkCreateBooksSchema.parse(input)

      const normalized = validated.books.map((book) => ({
        title: book.title.trim(),
        author: book.author?.trim() || null,
        barcode: book.barcode?.trim() || null,
      }))

      const barcodes = normalized
        .map((book) => book.barcode)
        .filter((code): code is string => Boolean(code))

      const dedupedBarcodes = Array.from(new Set(barcodes))

      let existingBarcodeSet = new Set<string>()
      if (dedupedBarcodes.length > 0) {
        const { data: existingBooks, error: existingError } = await serviceClient
          .from('books')
          .select('barcode')
          .eq('tenant_id', tenantId)
          .in('barcode', dedupedBarcodes)
          .is('deleted_at', null)

        if (existingError) throw existingError

        existingBarcodeSet = new Set(
          (existingBooks || [])
            .map((book) => book.barcode)
            .filter((code): code is string => Boolean(code))
        )
      }

      const inputBarcodeSet = new Set<string>()
      const duplicateBarcodes: string[] = []
      const rowsToInsert: Array<{
        tenant_id: string
        title: string
        author: string | null
        barcode: string | null
      }> = []

      for (const book of normalized) {
        const barcode = book.barcode

        if (barcode) {
          if (existingBarcodeSet.has(barcode) || inputBarcodeSet.has(barcode)) {
            duplicateBarcodes.push(barcode)
            continue
          }
          inputBarcodeSet.add(barcode)
        }

        rowsToInsert.push({
          tenant_id: tenantId,
          title: book.title,
          author: book.author,
          barcode,
        })
      }

      if (rowsToInsert.length === 0) {
        return {
          insertedCount: 0,
          skippedCount: normalized.length,
          duplicateBarcodes: Array.from(new Set(duplicateBarcodes)),
        }
      }

      const { error: insertError } = await serviceClient.from('books').insert(rowsToInsert)
      if (insertError) throw insertError

      revalidatePath('/library/materials')
      revalidatePath('/library/lendings')
      revalidatePath('/library')

      return {
        insertedCount: rowsToInsert.length,
        skippedCount: normalized.length - rowsToInsert.length,
        duplicateBarcodes: Array.from(new Set(duplicateBarcodes)),
      }
    },
    {
      actionName: 'bulkCreateBooks',
      defaultValue: { insertedCount: 0, skippedCount: 0, duplicateBarcodes: [] as string[] },
    }
  )
}
