/**
 * PDF Generator - Infrastructure Layer
 *
 * @react-pdf/renderer를 사용하여 PDF 생성
 */

import { renderToBuffer } from '@react-pdf/renderer'
import { ReportPDFTemplate } from './ReportPDFTemplate'
import { Report } from '@/domain/entities/Report'
import { logError } from '@/lib/error-handlers'

export interface PDFGeneratorOptions {
  academyName?: string
  academyPhone?: string
}

/**
 * PDF 생성기
 */
export class PDFGenerator {
  /**
   * Report 엔티티를 PDF Buffer로 변환
   *
   * @param report - Report 엔티티
   * @param options - 옵션 (학원명, 전화번호 등)
   * @returns PDF Buffer
   */
  static async generateReportPDF(
    report: Report,
    options: PDFGeneratorOptions = {}
  ): Promise<Buffer> {
    try {
      // React 컴포넌트를 PDF Buffer로 렌더링
      const element = ReportPDFTemplate({
        data: report.data,
        academyName: options.academyName,
        academyPhone: options.academyPhone,
      }) as any // @react-pdf/renderer의 타입 이슈 회피

      const buffer = await renderToBuffer(element)

      return buffer
    } catch (error) {
      logError(error, {
        tag: 'PDFGenerator',
        method: 'generateReportPDF',
        reportId: report.id,
      })
      throw new Error('PDF 생성 실패')
    }
  }

  /**
   * PDF를 Base64로 인코딩
   *
   * @param buffer - PDF Buffer
   * @returns Base64 문자열
   */
  static toBase64(buffer: Buffer): string {
    return buffer.toString('base64')
  }

  /**
   * PDF 파일명 생성
   *
   * @param report - Report 엔티티
   * @returns 파일명 (예: report_홍길동_2025-01.pdf)
   */
  static generateFilename(report: Report): string {
    const studentName = report.data.studentName
    const date = report.data.endDate.substring(0, 7) // YYYY-MM
    return `report_${studentName}_${date}.pdf`
  }
}
