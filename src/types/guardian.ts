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
  user_id?: string | null
  name: string
  phone?: string | null
  email?: string | null
  relationship?: string | null
  occupation?: string | null
  address?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface StudentGuardian {
  id: string
  tenant_id: string
  guardian_id: string
  student_id: string
  relation?: string | null
  is_primary_contact: boolean
  receives_notifications: boolean
  receives_billing: boolean
  can_pickup: boolean
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface GuardianWithUser {
  id: string
  user_id?: string | null
  name: string
  phone: string | null
  email: string | null
  address: string | null
  occupation: string | null
  relationship?: string | null
  relation?: GuardianRelation
  is_primary_contact?: boolean
  receives_notifications?: boolean
  receives_billing?: boolean
  can_pickup?: boolean
}

export interface CreateGuardianRequest {
  name: string
  phone: string
  email?: string
  relationship?: string
  address?: string
  occupation?: string
  relation?: GuardianRelation
  is_primary_contact?: boolean
  receives_notifications?: boolean
  receives_billing?: boolean
  can_pickup?: boolean
}

export interface UpdateGuardianRequest {
  name?: string
  phone?: string
  email?: string
  relationship?: string
  address?: string
  occupation?: string
}

export interface LinkGuardianToStudentRequest {
  guardian_id: string
  student_id: string
  relation?: GuardianRelation
  is_primary_contact?: boolean
  receives_notifications?: boolean
  receives_billing?: boolean
  can_pickup?: boolean
}
