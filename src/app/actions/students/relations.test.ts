import { describe, expect, it, vi } from 'vitest'
import { detachStudentActiveRelations } from './relations'

/**
 * detachStudentActiveRelations는 원자화 RPC(detach_student_relations)의 래퍼다.
 * 관계 해제/소프트삭제 로직 자체는 migration 20260717000006의 SQL에 있으므로,
 * 여기서는 파라미터 매핑·결과 파싱·빈 입력 처리를 검증한다.
 */

const TENANT_ID = 'tenant-uuid-001'

function createRpcMock(resolveWith: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(resolveWith)
  return { client: { rpc }, rpc }
}

describe('detachStudentActiveRelations', () => {
  it('빈 studentIds — RPC 호출 없이 빈 결과 반환', async () => {
    const { client, rpc } = createRpcMock({ data: null, error: null })

    const result = await detachStudentActiveRelations(client, {
      tenantId: TENANT_ID,
      studentIds: [],
    })

    expect(result).toEqual({ classIds: [], affectedCount: 0 })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('중복/빈 값 id는 정리 후 전달, 기본 옵션 매핑', async () => {
    const { client, rpc } = createRpcMock({
      data: { affected_count: 2, class_ids: ['class-1'] },
      error: null,
    })

    const result = await detachStudentActiveRelations(client, {
      tenantId: TENANT_ID,
      studentIds: ['s1', 's2', 's1', ''],
    })

    expect(rpc).toHaveBeenCalledWith('detach_student_relations', expect.objectContaining({
      p_tenant_id: TENANT_ID,
      p_student_ids: ['s1', 's2'],
      p_reason: null,
      p_unlink_guardians: false,
      p_close_open_todos: false,
      p_soft_delete_students: false,
      p_withdrawal_date: null,
    }))
    expect(result).toEqual({ classIds: ['class-1'], affectedCount: 2 })
  })

  it('삭제 흐름 옵션 매핑 (softDeleteStudents/unlinkGuardians/closeOpenTodos)', async () => {
    const { client, rpc } = createRpcMock({
      data: { affected_count: 1, class_ids: [] },
      error: null,
    })

    await detachStudentActiveRelations(client, {
      tenantId: TENANT_ID,
      studentIds: ['s1'],
      reason: '학생 삭제로 인한 자동 해제',
      unlinkGuardians: true,
      closeOpenTodos: true,
      softDeleteStudents: true,
    })

    expect(rpc).toHaveBeenCalledWith('detach_student_relations', expect.objectContaining({
      p_reason: '학생 삭제로 인한 자동 해제',
      p_unlink_guardians: true,
      p_close_open_todos: true,
      p_soft_delete_students: true,
    }))
  })

  it('퇴원 흐름 옵션 매핑 (withdrawalDate/endDate)', async () => {
    const { client, rpc } = createRpcMock({
      data: { affected_count: 1, class_ids: ['class-9'] },
      error: null,
    })

    await detachStudentActiveRelations(client, {
      tenantId: TENANT_ID,
      studentIds: ['s1'],
      endDate: '2026-07-31',
      withdrawalDate: '2026-07-31T00:00:00.000Z',
      closeOpenTodos: true,
    })

    expect(rpc).toHaveBeenCalledWith('detach_student_relations', expect.objectContaining({
      p_end_date: '2026-07-31',
      p_withdrawal_date: '2026-07-31T00:00:00.000Z',
      p_soft_delete_students: false,
    }))
  })

  it('RPC 에러는 그대로 throw', async () => {
    const { client } = createRpcMock({
      data: null,
      error: { message: 'boom' },
    })

    await expect(
      detachStudentActiveRelations(client, {
        tenantId: TENANT_ID,
        studentIds: ['s1'],
      })
    ).rejects.toEqual({ message: 'boom' })
  })

  it('data가 null이어도 안전한 기본값 반환', async () => {
    const { client } = createRpcMock({ data: null, error: null })

    const result = await detachStudentActiveRelations(client, {
      tenantId: TENANT_ID,
      studentIds: ['s1'],
    })

    expect(result).toEqual({ classIds: [], affectedCount: 0 })
  })
})
