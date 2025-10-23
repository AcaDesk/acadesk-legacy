/**
 * 인증 관련 사용자 친화적 메시지 변환 유틸리티
 * Supabase의 기술적인 에러 메시지를 사용자가 이해하기 쉬운 한국어로 변환
 */

/**
 * Supabase 인증 에러를 사용자 친화적인 메시지로 변환
 */
export function getAuthErrorMessage(error: { message?: string; code?: string } | null): string {
  if (!error) return "알 수 없는 오류가 발생했습니다."

  const message = error.message?.toLowerCase() || ""

  // 회원가입 관련 에러
  if (message.includes("user already registered") || message.includes("already exists")) {
    return "이미 가입된 이메일 주소입니다. 로그인을 시도해주세요."
  }

  if (message.includes("email address is invalid") || message.includes("invalid email")) {
    return "올바른 이메일 주소를 입력해주세요."
  }

  if (message.includes("password") && (message.includes("short") || message.includes("weak"))) {
    return "비밀번호는 최소 8자 이상, 영문과 숫자를 포함해야 합니다."
  }

  if (message.includes("email rate limit") || message.includes("rate limit")) {
    return "현재 많은 사용자가 동시에 가입하고 있습니다. 1-2분 후 다시 시도해주세요."
  }

  if (message.includes("too many requests") || message.includes("429")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
  }

  // 로그인 관련 에러
  if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
    return "이메일 또는 비밀번호가 일치하지 않습니다."
  }

  if (message.includes("email not confirmed")) {
    return "이메일 인증이 완료되지 않았습니다. 이메일함을 확인해주세요."
  }

  if (message.includes("user not found")) {
    return "등록되지 않은 이메일 주소입니다. 회원가입을 먼저 진행해주세요."
  }

  // OAuth 관련 에러
  if (message.includes("oauth")) {
    return "소셜 로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
  }

  // 네트워크 에러
  if (message.includes("network") || message.includes("fetch")) {
    return "네트워크 연결을 확인해주세요."
  }

  // 서버 에러
  if (message.includes("internal server error") || message.includes("500")) {
    return "서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
  }

  // 기본 에러 메시지
  return "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
}

/**
 * 로그인 성공 메시지
 */
export const LOGIN_SUCCESS_MESSAGE = {
  title: "로그인 완료",
  description: "환영합니다! 잠시 후 대시보드로 이동합니다.",
}

/**
 * 회원가입 성공 메시지
 */
export const SIGNUP_SUCCESS_MESSAGE = {
  title: "회원가입 완료",
  description: "이메일함을 확인하여 계정을 활성화해주세요.",
}

/**
 * 이메일 인증 성공 메시지
 */
export const EMAIL_VERIFICATION_SUCCESS_MESSAGE = {
  title: "이메일 인증 완료",
  description: "계정 인증이 완료되었습니다. 이제 서비스를 시작할 수 있습니다.",
}

/**
 * 이메일 재전송 성공 메시지
 */
export const EMAIL_RESEND_SUCCESS_MESSAGE = {
  title: "인증 이메일 전송 완료",
  description: "이메일함을 확인해주세요. (스팸 폴더도 확인해주세요)",
}

/**
 * 로그아웃 성공 메시지
 */
export const LOGOUT_SUCCESS_MESSAGE = {
  title: "로그아웃 완료",
  description: "안전하게 로그아웃되었습니다.",
}

/**
 * 온보딩 관련 메시지
 */
export const ONBOARDING_MESSAGES = {
  authRequired: {
    title: "로그인이 필요합니다",
    description: "계속하려면 먼저 로그인해주세요.",
  },
  invalidInvitation: {
    title: "유효하지 않은 초대 코드",
    description: "초대 코드를 다시 확인하거나, 학원 관리자에게 문의해주세요.",
  },
  expiredInvitation: {
    title: "만료된 초대 코드",
    description: "초대 코드가 만료되었습니다. 학원 관리자에게 새로운 초대 코드를 요청해주세요.",
  },
  ownerSuccess: {
    title: "가입 신청 완료",
    description: "관리자 승인 후 학원 설정을 시작할 수 있습니다.",
  },
  staffSuccess: {
    title: "환영합니다!",
    description: "학원에 성공적으로 등록되었습니다.",
  },
}

/**
 * 승인 대기 관련 메시지
 */
export const APPROVAL_MESSAGES = {
  rejected: {
    title: "가입 승인 불가",
    description: "회원가입이 승인되지 않았습니다. 자세한 내용은 team@acadesk.site로 문의해주세요.",
  },
}

/**
 * 일반적인 오류 메시지
 */
export const GENERIC_ERROR_MESSAGE = {
  title: "오류가 발생했습니다",
  description: "문제가 계속되면 team@acadesk.site로 문의해주세요.",
}

/**
 * Rate Limit 관련 메시지
 */
export const RATE_LIMIT_MESSAGES = {
  emailTooMany: {
    title: "이메일 전송 한도 초과",
    description: "시간당 이메일 전송 한도(25건)에 도달했습니다. 5-10분 후 다시 시도해주세요.",
  },
  emailResendWait: {
    title: "잠시 후 다시 시도해주세요",
    description: (seconds: number) => `${seconds}초 후에 다시 전송할 수 있습니다.`,
  },
  tooManyRequests: {
    title: "요청이 너무 많습니다",
    description: "IP당 5분 기준 요청 한도(30회)에 도달했습니다. 5-10분 후 다시 시도해주세요.",
  },
  serverRateLimit: {
    title: "서버 요청 한도 초과",
    description: "서버에서 요청이 제한되었습니다. 문제가 지속되면 team@acadesk.site로 문의해주세요.",
  },
}

/**
 * 링크 만료/무효 관련 메시지
 */
export const LINK_EXPIRED_MESSAGES = {
  signup: {
    title: "인증 링크가 만료되었습니다",
    description: "이메일 인증 링크는 1시간 동안만 유효합니다.",
    action: "인증 이메일 다시 받기",
  },
  recovery: {
    title: "비밀번호 재설정 링크가 만료되었습니다",
    description: "비밀번호 재설정 링크는 1시간 동안만 유효합니다.",
    action: "비밀번호 재설정 다시 요청하기",
  },
  invitation: {
    title: "초대 링크가 만료되었습니다",
    description: "초대 링크가 만료되었습니다. 학원 관리자에게 새로운 초대를 요청해주세요.",
    action: "로그인 페이지로 이동",
  },
  alreadyUsed: {
    title: "이미 사용된 링크입니다",
    description: "이 링크는 이미 사용되었습니다. 로그인을 시도해주세요.",
    action: "로그인하기",
  },
  invalid: {
    title: "유효하지 않은 링크입니다",
    description: "요청하신 링크가 유효하지 않습니다.",
    action: "처음부터 다시 시작하기",
  },
}
