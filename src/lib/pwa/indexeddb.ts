import { openDB, type IDBPDatabase } from 'idb'

// ============================================================================
// Schema
// ============================================================================

const DB_NAME = 'acadesk-offline'
const DB_VERSION = 1

interface AcadeskDB {
  roster: {
    key: [string, string] // [tenantId, studentId]
    value: RosterEntry
    indexes: { 'by-tenant': string }
  }
  attendanceRecords: {
    key: [string, string, string] // [tenantId, date, studentId]
    value: AttendanceRecord
    indexes: { 'by-tenant-date': [string, string] }
  }
  mutationQueue: {
    key: string // nanoid
    value: QueuedMutation
    indexes: { 'by-tenant': string; 'by-created': number }
  }
  kioskTodos: {
    key: [string, string, string] // [tenantId, studentId, todoId]
    value: KioskTodo
    indexes: { 'by-tenant-student': [string, string] }
  }
}

export interface RosterEntry {
  tenantId: string
  studentId: string
  studentName: string
  className: string | null
  classId: string | null
  schoolName: string | null
  schoolLevel: string | null
  grade: string | null
  [key: string]: unknown
}

export interface AttendanceRecord {
  tenantId: string
  date: string
  studentId: string
  status: string | null
  checkInAt: string | null
  checkOutAt: string | null
  source: 'kiosk' | 'manual' | null
  sessionId: string | null
  classId: string | null
  isSelfStudy: boolean
  isMakeupClass: boolean
  [key: string]: unknown
}

export interface QueuedMutation {
  id: string
  tenantId: string
  type: 'saveAttendance' | 'cancelAttendance' | 'toggleTodoComplete'
  payload: Record<string, unknown>
  createdAt: number
  retryCount: number
}

export interface KioskTodo {
  tenantId: string
  studentId: string
  todoId: string
  title: string
  subject: string | null
  dueDate: string | null
  priority: string
  completedAt: string | null
  verifiedAt: string | null
  notes: string | null
  description: string | null
  estimatedDurationMinutes: number | null
}

// ============================================================================
// DB Connection
// ============================================================================

let dbPromise: Promise<IDBPDatabase<AcadeskDB>> | null = null

function getDB(): Promise<IDBPDatabase<AcadeskDB>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available on the server'))
  }
  if (!dbPromise) {
    dbPromise = openDB<AcadeskDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // roster store
        if (!db.objectStoreNames.contains('roster')) {
          const roster = db.createObjectStore('roster', {
            keyPath: ['tenantId', 'studentId'],
          })
          roster.createIndex('by-tenant', 'tenantId')
        }

        // attendanceRecords store
        if (!db.objectStoreNames.contains('attendanceRecords')) {
          const records = db.createObjectStore('attendanceRecords', {
            keyPath: ['tenantId', 'date', 'studentId'],
          })
          records.createIndex('by-tenant-date', ['tenantId', 'date'])
        }

        // mutationQueue store
        if (!db.objectStoreNames.contains('mutationQueue')) {
          const queue = db.createObjectStore('mutationQueue', {
            keyPath: 'id',
          })
          queue.createIndex('by-tenant', 'tenantId')
          queue.createIndex('by-created', 'createdAt')
        }

        // kioskTodos store
        if (!db.objectStoreNames.contains('kioskTodos')) {
          const todos = db.createObjectStore('kioskTodos', {
            keyPath: ['tenantId', 'studentId', 'todoId'],
          })
          todos.createIndex('by-tenant-student', ['tenantId', 'studentId'])
        }
      },
    })
  }
  return dbPromise
}

// ============================================================================
// Roster Helpers
// ============================================================================

export async function saveRosterToIDB(
  tenantId: string,
  roster: RosterEntry[]
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('roster', 'readwrite')
  // 기존 데이터 정리 후 저장
  const existing = await tx.store.index('by-tenant').getAllKeys(tenantId)
  for (const key of existing) {
    await tx.store.delete(key)
  }
  for (const entry of roster) {
    await tx.store.put({ ...entry, tenantId })
  }
  await tx.done
}

export async function getRosterFromIDB(
  tenantId: string
): Promise<RosterEntry[]> {
  const db = await getDB()
  return db.getAllFromIndex('roster', 'by-tenant', tenantId)
}

// ============================================================================
// Attendance Records Helpers
// ============================================================================

export async function saveAttendanceRecordsToIDB(
  tenantId: string,
  date: string,
  records: AttendanceRecord[]
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('attendanceRecords', 'readwrite')
  // 해당 날짜의 기존 데이터 정리
  const existing = await tx.store
    .index('by-tenant-date')
    .getAllKeys([tenantId, date])
  for (const key of existing) {
    await tx.store.delete(key)
  }
  for (const record of records) {
    await tx.store.put({ ...record, tenantId, date })
  }
  await tx.done
}

export async function getAttendanceRecordsFromIDB(
  tenantId: string,
  date: string
): Promise<AttendanceRecord[]> {
  const db = await getDB()
  return db.getAllFromIndex('attendanceRecords', 'by-tenant-date', [
    tenantId,
    date,
  ])
}

export async function updateAttendanceRecordInIDB(
  record: AttendanceRecord
): Promise<void> {
  const db = await getDB()
  await db.put('attendanceRecords', record)
}

export async function deleteAttendanceRecordFromIDB(
  tenantId: string,
  date: string,
  studentId: string
): Promise<void> {
  const db = await getDB()
  await db.delete('attendanceRecords', [tenantId, date, studentId])
}

// ============================================================================
// Kiosk Todos Helpers
// ============================================================================

export async function saveKioskTodosToIDB(
  tenantId: string,
  studentId: string,
  todos: KioskTodo[]
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('kioskTodos', 'readwrite')
  const existing = await tx.store
    .index('by-tenant-student')
    .getAllKeys([tenantId, studentId])
  for (const key of existing) {
    await tx.store.delete(key)
  }
  for (const todo of todos) {
    await tx.store.put({ ...todo, tenantId, studentId })
  }
  await tx.done
}

export async function getKioskTodosFromIDB(
  tenantId: string,
  studentId: string
): Promise<KioskTodo[]> {
  const db = await getDB()
  return db.getAllFromIndex('kioskTodos', 'by-tenant-student', [
    tenantId,
    studentId,
  ])
}

export async function updateKioskTodoInIDB(todo: KioskTodo): Promise<void> {
  const db = await getDB()
  await db.put('kioskTodos', todo)
}

// ============================================================================
// Mutation Queue Helpers
// ============================================================================

export async function addToMutationQueue(
  mutation: QueuedMutation
): Promise<void> {
  const db = await getDB()
  await db.put('mutationQueue', mutation)
}

export async function getPendingMutations(
  tenantId?: string
): Promise<QueuedMutation[]> {
  const db = await getDB()
  if (tenantId) {
    return db.getAllFromIndex('mutationQueue', 'by-tenant', tenantId)
  }
  return db.getAll('mutationQueue')
}

export async function removeMutation(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('mutationQueue', id)
}

export async function updateMutationRetry(
  id: string,
  retryCount: number
): Promise<void> {
  const db = await getDB()
  const mutation = await db.get('mutationQueue', id)
  if (mutation) {
    mutation.retryCount = retryCount
    await db.put('mutationQueue', mutation)
  }
}
