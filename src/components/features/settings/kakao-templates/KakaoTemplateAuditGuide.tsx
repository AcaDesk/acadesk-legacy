'use client'

import { ExternalLink } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@ui/accordion'
import { Alert, AlertDescription } from '@ui/alert'
import { Badge } from '@ui/badge'
import { auditGuideSections, type AuditGuideContent } from './audit-guide-data'

function GuideContentBlock({ item }: { item: AuditGuideContent }) {
  switch (item.type) {
    case 'text':
      return <p className="text-xs text-muted-foreground leading-relaxed">{item.body as string}</p>

    case 'list':
      return (
        <div>
          {item.title && (
            <p className="text-xs font-medium mb-1">{item.title}</p>
          )}
          <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
            {(item.body as string[]).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )

    case 'warning':
      return (
        <Alert variant="destructive" className="py-2 px-3">
          <AlertDescription className="text-xs">
            {item.title && <p className="font-medium mb-1">{item.title}</p>}
            {typeof item.body === 'string' ? item.body : (item.body as string[]).join('\n')}
          </AlertDescription>
        </Alert>
      )

    case 'example':
      return (
        <div>
          {item.title && (
            <p className="text-xs font-medium mb-1">{item.title}</p>
          )}
          <pre className="text-xs bg-muted rounded-md p-2 whitespace-pre-wrap font-mono leading-relaxed">
            {typeof item.body === 'string' ? item.body : (item.body as string[]).join('\n')}
          </pre>
        </div>
      )

    case 'academy-example':
      return (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            {item.title && (
              <p className="text-xs font-medium">{item.title}</p>
            )}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              학원 예시
            </Badge>
          </div>
          {typeof item.body === 'string' ? (
            <pre className="text-xs bg-muted rounded-md p-2 whitespace-pre-wrap font-mono leading-relaxed">
              {item.body}
            </pre>
          ) : (
            <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
              {(item.body as string[]).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )

    default:
      return null
  }
}

export function KakaoTemplateAuditGuide() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">심사 가이드</h3>
        <a
          href="https://kakaobusiness.gitbook.io/main/ad/bizmessage/notice-friend/template-guide"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          카카오 공식 문서
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <Accordion type="multiple" className="w-full">
        {auditGuideSections.map((section) => (
          <AccordionItem key={section.id} value={section.id}>
            <AccordionTrigger className="text-xs py-2 hover:no-underline">
              {section.title}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {section.content.map((item, i) => (
                  <GuideContentBlock key={i} item={item} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
