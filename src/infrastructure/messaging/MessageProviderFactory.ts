/**
 * Message Provider Factory - Infrastructure Layer
 *
 * 채널별 메시지 Provider 생성 및 관리
 */

import { IMessageProvider, MessageChannel } from '@/domain/messaging/IMessageProvider'
import { AligoProvider } from './AligoProvider'

/**
 * 메시지 Provider 팩토리
 *
 * 새로운 채널 추가 시 여기에 등록:
 * 1. import 추가
 * 2. registerProviders()에 등록
 */
export class MessageProviderFactory {
  private static instance: MessageProviderFactory
  private providers: Map<MessageChannel, IMessageProvider> = new Map()

  private constructor() {
    this.registerProviders()
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): MessageProviderFactory {
    if (!MessageProviderFactory.instance) {
      MessageProviderFactory.instance = new MessageProviderFactory()
    }
    return MessageProviderFactory.instance
  }

  /**
   * Provider 등록
   */
  private registerProviders(): void {
    try {
      // SMS/LMS - Aligo
      const aligoSMS = new AligoProvider(MessageChannel.SMS)
      const aligoLMS = new AligoProvider(MessageChannel.LMS)

      this.providers.set(MessageChannel.SMS, aligoSMS)
      this.providers.set(MessageChannel.LMS, aligoLMS)

      // 추후 추가할 Provider
      // this.providers.set(MessageChannel.KAKAO, new KakaoProvider())
      // this.providers.set(MessageChannel.EMAIL, new EmailProvider())
      // this.providers.set(MessageChannel.PUSH, new PushProvider())
    } catch (error) {
      console.error('[MessageProviderFactory] Failed to register providers:', error)
      // 일부 Provider만 사용 불가능한 경우를 대비해 에러를 던지지 않음
    }
  }

  /**
   * 채널별 Provider 반환
   *
   * @param channel - 메시지 채널
   * @returns Provider 인스턴스
   * @throws Provider가 등록되지 않은 경우
   */
  getProvider(channel: MessageChannel): IMessageProvider {
    const provider = this.providers.get(channel)

    if (!provider) {
      throw new Error(
        `No provider configured for channel: ${channel}. ` +
          `Available channels: ${Array.from(this.providers.keys()).join(', ')}`
      )
    }

    return provider
  }

  /**
   * 모든 등록된 Provider 반환
   */
  getAllProviders(): IMessageProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * 사용 가능한 채널 목록
   */
  getAvailableChannels(): MessageChannel[] {
    return Array.from(this.providers.keys())
  }

  /**
   * 특정 채널 사용 가능 여부
   */
  isChannelAvailable(channel: MessageChannel): boolean {
    return this.providers.has(channel)
  }
}

/**
 * 편의 함수: Provider 인스턴스 가져오기
 */
export function getMessageProvider(channel: MessageChannel): IMessageProvider {
  return MessageProviderFactory.getInstance().getProvider(channel)
}
