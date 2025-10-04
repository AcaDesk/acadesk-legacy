#!/bin/bash

# Find all page.tsx files in (dashboard) directory
find /Users/lee/Developer/personal/acadesk-web/src/app/\(dashboard\) -name "page.tsx" -type f | while read file; do
  echo "Processing: $file"

  # Replace DashboardLayout import with PageWrapper
  sed -i '' 's/import DashboardLayout from.*dashboard-layout.*/import { PageWrapper } from "@\/components\/layout\/page-wrapper"/g' "$file"

  # Replace <DashboardLayout> with <PageWrapper>
  sed -i '' 's/<DashboardLayout>/<PageWrapper>/g' "$file"
  sed -i '' 's/<\/DashboardLayout>/<\/PageWrapper>/g' "$file"

  echo "Updated: $file"
done

echo "All files updated!"
