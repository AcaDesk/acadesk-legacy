/**
 * 공통 SolapiProvider 인스턴스 생성
 *
 * kakao-channel.ts, kakao-templates.ts 등에서 중복되던 getSolapiProvider를 통합
 * 채널 관리용이므로 is_active 필터 없이 조회 (초기 설정 중 채널 등록 필요)
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { SolapiProvider } from '@/infra/messaging/SolapiProvider'
import { decryptSecret } from '@/lib/crypto/secret-cipher'

export async function getSolapiProvider(tenantId: string): Promise<SolapiProvider | null> {
  const supabase = createServiceRoleClient()

  const { data: config, error } = await supabase
    .from('tenant_messaging_config')
    .select('provider, solapi_api_key, solapi_api_secret, solapi_sender_phone')
    .eq('tenant_id', tenantId)
    .eq('provider', 'solapi')
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !config) {
    return null
  }

  if (!config.solapi_api_key || !config.solapi_api_secret) {
    return null
  }

  let apiSecret: string
  try {
    apiSecret = decryptSecret(config.solapi_api_secret)
  } catch (err) {
    console.error('[getSolapiProvider] Failed to decrypt api secret:', err)
    return null
  }

  return new SolapiProvider({
    apiKey: config.solapi_api_key,
    apiSecret,
    senderPhone: config.solapi_sender_phone || '',
  })
}
