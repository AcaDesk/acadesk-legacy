import { create } from 'zustand'

type DialogAction =
  | { type: 'deleteConsultation' }
  | { type: 'deleteNote'; noteId: string }
  | { type: 'addParticipant' }
  | { type: 'removeParticipant'; participantId: string }
  | null

interface ConsultationState {
  activeDialog: DialogAction
  setActiveDialog: (action: DialogAction) => void
  closeDialog: () => void
}

export const useConsultationStore = create<ConsultationState>()((set) => ({
  activeDialog: null,
  setActiveDialog: (action) => set({ activeDialog: action }),
  closeDialog: () => set({ activeDialog: null }),
}))
