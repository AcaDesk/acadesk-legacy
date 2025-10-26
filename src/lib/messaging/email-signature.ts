/**
 * 이메일 서명 유틸리티
 *
 * 이메일 하단에 학원 정보를 포함한 서명을 자동으로 추가합니다.
 */

export interface AcademyInfo {
  name: string
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
}

/**
 * 학원 정보로 이메일 서명 생성
 *
 * @param academyInfo - 학원 정보
 * @returns HTML 형식의 이메일 서명
 */
export function generateEmailSignature(academyInfo: AcademyInfo): string {
  const { name, phone, email, address, website } = academyInfo

  const contactLines: string[] = []

  if (phone) {
    contactLines.push(`📞 ${phone}`)
  }

  if (email) {
    contactLines.push(`✉️ ${email}`)
  }

  if (address) {
    contactLines.push(`📍 ${address}`)
  }

  if (website) {
    contactLines.push(`🌐 ${website}`)
  }

  return `
<div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-family: system-ui, -apple-system, sans-serif;">
  <div style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 12px;">
    ${name}
  </div>
  ${contactLines.map(line => `
  <div style="font-size: 14px; color: #6b7280; margin-bottom: 6px;">
    ${line}
  </div>
  `).join('')}
</div>
  `.trim()
}

/**
 * 이메일 본문에 학원 서명 추가
 *
 * @param message - 원본 메시지
 * @param academyInfo - 학원 정보
 * @returns 서명이 추가된 메시지
 */
export function addEmailSignature(message: string, academyInfo: AcademyInfo): string {
  const signature = generateEmailSignature(academyInfo)

  // HTML 메시지인 경우
  if (message.includes('<html') || message.includes('</body>')) {
    return message.replace('</body>', `${signature}</body>`)
  }

  // 일반 텍스트 메시지인 경우
  return `${message}\n\n${convertSignatureToPlainText(academyInfo)}`
}

/**
 * 텍스트 형식의 서명 생성
 *
 * @param academyInfo - 학원 정보
 * @returns 텍스트 형식의 서명
 */
export function convertSignatureToPlainText(academyInfo: AcademyInfo): string {
  const { name, phone, email, address, website } = academyInfo

  const lines = [
    '─'.repeat(50),
    name,
  ]

  if (phone) lines.push(`전화: ${phone}`)
  if (email) lines.push(`이메일: ${email}`)
  if (address) lines.push(`주소: ${address}`)
  if (website) lines.push(`웹사이트: ${website}`)

  return lines.join('\n')
}
