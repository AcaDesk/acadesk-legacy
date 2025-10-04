export type GuardianRelation =
  | 'father'
  | 'mother'
  | 'grandfather'
  | 'grandmother'
  | 'uncle'
  | 'aunt'
  | 'other'

export interface Guardian {
  id: string
  tenant_id: string
  user_id: string
  occupation: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface GuardianStudent {
  id: string
  tenant_id: string
  guardian_id: string
  student_id: string
  relation: GuardianRelation
  is_primary: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface GuardianWithUser {
  id: string
  user_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  occupation: string | null
  relation?: GuardianRelation
  is_primary?: boolean
}

export interface CreateGuardianRequest {
  name: string
  phone: string
  email?: string
  address?: string
  occupation?: string
  relation: GuardianRelation
  is_primary: boolean
}

export interface UpdateGuardianRequest {
  name?: string
  phone?: string
  email?: string
  address?: string
  occupation?: string
}

export interface LinkGuardianToStudentRequest {
  guardian_id: string
  student_id: string
  relation: GuardianRelation
  is_primary: boolean
}
