"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { TermsModal } from "@/components/auth/TermsModal"

export interface TermsCheckboxValues {
  terms: boolean
  privacy: boolean
  marketing: boolean
}

export interface TermsCheckboxProps {
  value?: TermsCheckboxValues
  onChange?: (value: TermsCheckboxValues) => void
  error?: string
  disabled?: boolean
}

export function TermsCheckbox({
  value = { terms: false, privacy: false, marketing: false },
  onChange,
  error,
  disabled = false,
}: TermsCheckboxProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<"terms" | "privacy">("terms")

  const allRequired = value.terms && value.privacy
  const allChecked = allRequired && value.marketing

  const handleSelectAll = (checked: boolean) => {
    onChange?.({
      terms: checked,
      privacy: checked,
      marketing: checked,
    })
  }

  const handleIndividualChange = (
    field: keyof TermsCheckboxValues,
    checked: boolean
  ) => {
    onChange?.({
      ...value,
      [field]: checked,
    })
  }

  const openModal = (type: "terms" | "privacy") => {
    setModalType(type)
    setModalOpen(true)
  }

  return (
    <div className="space-y-3">
      {/* Select All */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="terms-all"
          className="mt-1"
          checked={allChecked}
          onCheckedChange={(val) => handleSelectAll(val as boolean)}
          disabled={disabled}
        />
        <label
          htmlFor="terms-all"
          className="text-sm font-medium leading-relaxed"
        >
          전체 동의
        </label>
      </div>

      <div className="ml-6 space-y-2 border-l-2 border-muted pl-4">
        {/* Terms of Service (Required) */}
        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms-service"
            className="mt-1"
            checked={value.terms}
            onCheckedChange={(val) => handleIndividualChange("terms", val as boolean)}
            disabled={disabled}
          />
          <label
            htmlFor="terms-service"
            className="text-sm leading-relaxed text-muted-foreground"
          >
            <span className="font-medium text-foreground">(필수)</span>{" "}
            <button
              type="button"
              onClick={() => openModal("terms")}
              className="text-primary hover:underline"
              disabled={disabled}
            >
              이용약관
            </button>
            에 동의합니다
          </label>
        </div>

        {/* Privacy Policy (Required) */}
        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms-privacy"
            className="mt-1"
            checked={value.privacy}
            onCheckedChange={(val) => handleIndividualChange("privacy", val as boolean)}
            disabled={disabled}
          />
          <label
            htmlFor="terms-privacy"
            className="text-sm leading-relaxed text-muted-foreground"
          >
            <span className="font-medium text-foreground">(필수)</span>{" "}
            <button
              type="button"
              onClick={() => openModal("privacy")}
              className="text-primary hover:underline"
              disabled={disabled}
            >
              개인정보처리방침
            </button>
            에 동의합니다
          </label>
        </div>

        {/* Marketing (Optional) */}
        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms-marketing"
            className="mt-1"
            checked={value.marketing}
            onCheckedChange={(val) => handleIndividualChange("marketing", val as boolean)}
            disabled={disabled}
          />
          <label
            htmlFor="terms-marketing"
            className="text-sm leading-relaxed text-muted-foreground"
          >
            <span className="font-medium text-muted-foreground">(선택)</span>{" "}
            마케팅 정보 수신에 동의합니다
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Terms Modal */}
      <TermsModal open={modalOpen} onOpenChange={setModalOpen} type={modalType} />
    </div>
  )
}
