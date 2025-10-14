#!/bin/bash

# Fix react/no-unescaped-entities errors by replacing " with &quot; in JSX
echo "Fixing JSX unescaped quotes..."

# Fix payments page
sed -i '' 's/"날짜"/"날짜"/g' src/app/\(dashboard\)/payments/page.tsx

# Fix TermsModal
sed -i '' 's/"개인정보"/"개인정보"/g' src/components/auth/TermsModal.tsx
sed -i '' 's/"이용자"/"이용자"/g' src/components/auth/TermsModal.tsx
sed -i '' 's/"동의"/"동의"/g' src/components/auth/TermsModal.tsx
sed -i '' 's/"위탁"/"위탁"/g' src/components/auth/TermsModal.tsx

# Fix @typescript-eslint/no-explicit-any errors by replacing `: any` with `: unknown`
echo "Fixing TypeScript any types..."

# List of files to fix (from build errors)
files=(
  "src/app/(dashboard)/library/lendings/page.tsx"
  "src/app/(dashboard)/notifications/page.tsx"
  "src/app/(dashboard)/reports/[id]/page.tsx"
  "src/app/(dashboard)/reports/bulk/page.tsx"
  "src/app/(dashboard)/reports/list/page.tsx"
  "src/app/(dashboard)/reports/page.tsx"
  "src/app/(dashboard)/todos/planner/page.tsx"
  "src/app/(dashboard)/todos/templates/new/page.tsx"
  "src/app/(dashboard)/todos/templates/page.tsx"
  "src/components/auth/signup-form.tsx"
  "src/components/features/attendance/contact-guardian-dialog.tsx"
  "src/components/features/calendar/AddEventModal.tsx"
  "src/components/features/dashboard/recent-students-card.tsx"
  "src/components/features/dashboard/widget-error-boundary.tsx"
  "src/components/features/dashboard/widget-renderer.tsx"
  "src/components/features/guardians/guardian-form.tsx"
  "src/components/features/payments/create-invoices-dialog.tsx"
  "src/components/features/students/activity-timeline.tsx"
  "src/components/features/students/add-student-dialog.tsx"
  "src/components/features/students/detail/AttendanceTab.tsx"
  "src/components/features/students/detail/ClassEnrollmentsList.tsx"
  "src/components/features/students/detail/ClassProgressCard.tsx"
  "src/components/features/students/detail/InfoTab.tsx"
  "src/components/features/students/detail/LearningStatusTab.tsx"
  "src/components/features/students/detail/OverviewTab.tsx"
  "src/components/features/students/detail/ScheduleTab.tsx"
  "src/components/features/students/detail/StudentBasicInfo.tsx"
  "src/components/features/students/detail/StudentHeader.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    # Replace `: any` with `: unknown` but preserve formatting
    sed -i '' 's/: any\([^a-zA-Z]\)/: unknown\1/g' "$file"
    # Replace `: any)` with `: unknown)`
    sed -i '' 's/: any)/: unknown)/g' "$file"
    # Replace `: any,` with `: unknown,`
    sed -i '' 's/: any,/: unknown,/g' "$file"
    # Replace `: any;` with `: unknown;`
    sed -i '' 's/: any;/: unknown;/g' "$file"
    # Replace `: any[]` with `: unknown[]`
    sed -i '' 's/: any\[/: unknown[/g' "$file"
    # Replace `(any)` with `(unknown)`
    sed -i '' 's/(any)/(unknown)/g' "$file"
    # Replace `<any>` with `<unknown>`
    sed -i '' 's/<any>/<unknown>/g' "$file"
  fi
done

echo "Build error fixes complete!"
