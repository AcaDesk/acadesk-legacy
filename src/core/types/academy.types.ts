/**
 * Academy (tenant) 도메인 타입.
 *
 * getAcademyInfo() 가 반환하는 데이터 구조 — tenants 테이블 row 에
 * settings JSON 의 일부 필드를 top-level 로 flatten 한 형태.
 */
export interface AcademyInfo {
  id: string
  name: string
  timezone: string
  currency: string
  settings: Record<string, unknown> | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  // settings 에서 top-level 로 flatten 된 필드
  address: string | null
  business_number: string | null
  phone: string | null
  email: string | null
  website: string | null
}
