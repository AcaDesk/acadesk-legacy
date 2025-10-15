"use client"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Building2, Users } from "lucide-react"

export interface RoleSelectorProps {
  value?: "owner" | "staff"
  onChange?: (value: "owner" | "staff") => void
  error?: string
  disabled?: boolean
}

export function RoleSelector({
  value = "owner",
  onChange,
  error,
  disabled = false,
}: RoleSelectorProps) {
  return (
    <div className="space-y-3">
      <Label>역할 선택</Label>
      <RadioGroup
        value={value}
        onValueChange={(val) => onChange?.(val as "owner" | "staff")}
        className="grid grid-cols-2 gap-3"
        disabled={disabled}
      >
        <div>
          <RadioGroupItem value="owner" id="role-owner" className="peer sr-only" />
          <Label
            htmlFor="role-owner"
            className="flex cursor-pointer flex-col items-center justify-between rounded-lg border-2 border-muted bg-transparent p-4 hover:bg-accent peer-data-[state=checked]:border-primary [&:has([data-disabled])]:cursor-not-allowed [&:has([data-disabled])]:opacity-50"
          >
            <Building2 className="mb-2 h-6 w-6" />
            <span className="text-sm font-medium">원장</span>
            <span className="mt-1 text-center text-xs text-muted-foreground">
              새로운 학원을 생성하고 관리합니다
            </span>
          </Label>
        </div>
        <div className="relative">
          <RadioGroupItem value="staff" id="role-staff" className="peer sr-only" disabled />
          <Label
            htmlFor="role-staff"
            className="flex cursor-not-allowed flex-col items-center justify-between rounded-lg border-2 border-muted bg-muted/30 p-4 opacity-60"
          >
            <Users className="mb-2 h-6 w-6" />
            <span className="text-sm font-medium">강사/직원</span>
            <span className="mt-1 text-center text-xs text-muted-foreground">
              초대받은 학원에 참여합니다
            </span>
            <span className="mt-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              준비 중
            </span>
          </Label>
        </div>
      </RadioGroup>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
