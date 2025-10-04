import { useState, useMemo, useCallback } from 'react'

interface UsePaginationProps<T> {
  data: T[]
  itemsPerPage?: number
}

// Client-side pagination (for backward compatibility)
export function usePagination<T>({ data, itemsPerPage = 10 }: UsePaginationProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(data.length / itemsPerPage)

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }, [data, currentPage, itemsPerPage])

  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(pageNumber)
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const resetPage = () => {
    setCurrentPage(1)
  }

  return {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    nextPage,
    previousPage,
    resetPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    startIndex: (currentPage - 1) * itemsPerPage + 1,
    endIndex: Math.min(currentPage * itemsPerPage, data.length),
    totalItems: data.length,
  }
}

// Server-side pagination
interface UseServerPaginationProps {
  totalCount: number
  itemsPerPage?: number
  initialPage?: number
}

export function useServerPagination({
  totalCount,
  itemsPerPage = 10,
  initialPage = 1,
}: UseServerPaginationProps) {
  const [currentPage, setCurrentPage] = useState(initialPage)

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const goToPage = useCallback((page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(pageNumber)
  }, [totalPages])

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }, [currentPage, totalPages])

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }, [currentPage])

  const resetPage = useCallback(() => {
    setCurrentPage(1)
  }, [])

  // Calculate range for Supabase query
  const from = (currentPage - 1) * itemsPerPage
  const to = from + itemsPerPage - 1

  return {
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    previousPage,
    resetPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    startIndex: from + 1,
    endIndex: Math.min(to + 1, totalCount),
    totalItems: totalCount,
    // Supabase range parameters
    from,
    to,
  }
}
