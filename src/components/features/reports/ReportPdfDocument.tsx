/**
 * Report PDF Document Component
 *
 * @react-pdf/renderer를 사용하여 "이쁜" PDF를 생성하는 전용 컴포넌트
 * HTML/CSS 컴포넌트를 재사용할 수 없으므로 PDF 전용 템플릿으로 작성
 */

'use client'

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import type { ReportData } from '@/core/types/report.types'
import { formatKoreanDateShort } from '@/lib/utils'

// ⚠️ 중요: 한글 폰트 등록 필수!
// public/fonts/ 폴더에 Noto Sans KR 폰트 파일 필요
// (NotoSansKR-Regular.ttf, NotoSansKR-Bold.ttf)
Font.register({
  family: 'NotoSansKR',
  fonts: [
    { src: '/fonts/NotoSansKR-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/NotoSansKR-Bold.ttf', fontWeight: 700 },
  ],
})

// react-pdf는 CSS 클래스 대신 StyleSheet 객체를 사용
const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansKR',
    padding: 40,
    fontSize: 10,
    color: '#333333',
    backgroundColor: '#ffffff',
  },
  // Header styles
  academyName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0066CC',
    marginBottom: 4,
  },
  academyInfo: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 20,
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
    marginVertical: 12,
  },
  studentHeader: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4,
  },
  studentSubHeader: {
    fontSize: 11,
    color: '#71717a',
    marginBottom: 20,
  },
  // Section styles
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#0066CC',
  },
  sectionDescription: {
    fontSize: 9,
    color: '#71717a',
    marginBottom: 8,
  },
  // Stats grid (한눈에 보기)
  statsGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#fafafa',
  },
  statLabel: {
    fontSize: 8,
    color: '#71717a',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
  },
  statValuePrimary: {
    color: '#0066CC',
  },
  statValueMuted: {
    color: '#71717a',
  },
  statValueBlue: {
    color: '#2563eb',
  },
  statValueGreen: {
    color: '#16a34a',
  },
  // Score trend (성적 추이)
  trendContainer: {
    marginBottom: 16,
  },
  trendRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  trendMonth: {
    fontSize: 10,
    fontWeight: 700,
    width: 60,
  },
  trendScores: {
    display: 'flex',
    flexDirection: 'row',
    gap: 20,
  },
  trendScore: {
    fontSize: 10,
  },
  trendScorePrimary: {
    color: '#0066CC',
    fontWeight: 700,
  },
  trendScoreMuted: {
    color: '#71717a',
  },
  // Learning status (학습 현황)
  learningGrid: {
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  learningCard: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 6,
  },
  learningTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
    textAlign: 'center',
  },
  learningPercent: {
    fontSize: 28,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 8,
  },
  learningPercentPrimary: {
    color: '#0066CC',
  },
  learningPercentGreen: {
    color: '#16a34a',
  },
  learningDetail: {
    fontSize: 8,
    color: '#71717a',
    textAlign: 'center',
  },
  // Scores by category (영역별 성적)
  categoryContainer: {
    marginBottom: 16,
  },
  categoryHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  categoryName: {
    fontSize: 11,
    fontWeight: 700,
  },
  categoryBadge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#0066CC',
    color: '#ffffff',
  },
  categoryBadgeNegative: {
    backgroundColor: '#dc2626',
  },
  categoryScore: {
    fontSize: 18,
    fontWeight: 700,
  },
  categoryStats: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  categoryStatSecondary: {
    fontSize: 8,
    color: '#71717a',
    marginTop: 2,
  },
  categoryStatWarning: {
    fontSize: 8,
    color: '#ea580c',
    marginTop: 2,
  },
  testList: {
    marginLeft: 12,
    marginTop: 4,
  },
  testItem: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    paddingVertical: 3,
  },
  testName: {
    color: '#71717a',
  },
  testScore: {
    fontWeight: 700,
  },
  // Comment section (강사 코멘트)
  commentSection: {
    marginBottom: 12,
  },
  commentHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  commentTitle: {
    fontSize: 11,
    fontWeight: 700,
  },
  commentText: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#52525b',
    marginLeft: 20,
  },
  // Footer
  footer: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#71717a',
  },
})

interface ReportPdfDocumentProps {
  reportData: ReportData
  studentName: string
  studentCode: string
  studentGrade: string
  periodStart: string
  periodEnd: string
  generatedAt: string
}

export function ReportPdfDocument({
  reportData,
  studentName,
  studentCode,
  studentGrade,
  periodStart,
  periodEnd,
  generatedAt,
}: ReportPdfDocumentProps) {
  // Format dates
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: Academy & Student Info */}
        <View>
          <Text style={styles.academyName}>{reportData.academy.name}</Text>
          {(reportData.academy.phone || reportData.academy.address) && (
            <Text style={styles.academyInfo}>
              {reportData.academy.phone && `📞 ${reportData.academy.phone}`}
              {reportData.academy.phone && reportData.academy.address && ' • '}
              {reportData.academy.address && `📍 ${reportData.academy.address}`}
            </Text>
          )}
        </View>

        <View style={styles.separator} />

        <View>
          <Text style={styles.studentHeader}>
            {studentName} ({studentCode})
          </Text>
          <Text style={styles.studentSubHeader}>
            {studentGrade} | {formatDate(periodStart)} ~ {formatDate(periodEnd)}
          </Text>
        </View>

        {/* Section 1: At-a-Glance (한눈에 보기) */}
        {reportData.currentScore && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>한눈에 보기</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>이번 달 평균 점수</Text>
                <Text style={[styles.statValue, styles.statValuePrimary]}>
                  {reportData.currentScore.myScore}점
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>반 평균 점수</Text>
                <Text style={[styles.statValue, styles.statValueMuted]}>
                  {reportData.currentScore.classAverage}점
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>출석률</Text>
                <Text style={[styles.statValue, styles.statValueBlue]}>
                  {Math.round(reportData.attendance.rate)}%
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>과제 달성률</Text>
                <Text style={[styles.statValue, styles.statValueGreen]}>
                  {Math.round(reportData.homework.rate)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Section 2: Score Trend (성적 추이) */}
        {reportData.scoreTrend && reportData.scoreTrend.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>월간 성적 분석</Text>
            <Text style={styles.sectionDescription}>
              최근 3개월간 학생의 점수와 반 평균 점수 추이입니다
            </Text>
            <View style={styles.trendContainer}>
              {reportData.scoreTrend.map((trend, idx) => (
                <View key={idx} style={styles.trendRow}>
                  <Text style={styles.trendMonth}>{trend.name}</Text>
                  <View style={styles.trendScores}>
                    <Text style={styles.trendScorePrimary}>
                      내 점수: {trend['학생 점수']}점
                    </Text>
                    <Text style={styles.trendScoreMuted}>
                      반 평균: {trend['반 평균']}점
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section 3: Learning Status (학습 현황) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>학습 현황</Text>
          <Text style={styles.sectionDescription}>
            출석률과 과제 달성률을 한눈에 확인하세요
          </Text>
          <View style={styles.learningGrid}>
            <View style={styles.learningCard}>
              <Text style={styles.learningTitle}>출석률</Text>
              <Text style={[styles.learningPercent, styles.learningPercentPrimary]}>
                {Math.round(reportData.attendance.rate)}%
              </Text>
              <Text style={styles.learningDetail}>
                총 {reportData.attendance.total}회 중 {reportData.attendance.present}회 출석
                {reportData.attendance.late > 0 &&
                  `, ${reportData.attendance.late}회 지각`}
                {reportData.attendance.absent > 0 &&
                  `, ${reportData.attendance.absent}회 결석`}
              </Text>
            </View>
            <View style={styles.learningCard}>
              <Text style={styles.learningTitle}>과제 달성률</Text>
              <Text style={[styles.learningPercent, styles.learningPercentGreen]}>
                {Math.round(reportData.homework.rate)}%
              </Text>
              <Text style={styles.learningDetail}>
                총 {reportData.homework.total}개 중 {reportData.homework.completed}개 완료
              </Text>
            </View>
          </View>
        </View>

        {/* Section 4: Scores by Category (영역별 성적) */}
        {reportData.scores && reportData.scores.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>영역별 성적</Text>
            <Text style={styles.sectionDescription}>
              이번 달 평균 점수 및 전월 대비 변화
            </Text>
            <View style={styles.categoryContainer}>
              {reportData.scores.map((score, idx) => (
                <View key={idx} style={{ marginBottom: 12 }}>
                  <View style={styles.categoryHeader}>
                    <View style={{ display: 'flex', flexDirection: 'row', gap: 6 }}>
                      <Text style={styles.categoryName}>{score.category}</Text>
                      {score.change !== null && (
                        <Text
                          style={[
                            styles.categoryBadge,
                            score.change < 0 ? styles.categoryBadgeNegative : {},
                          ]}
                        >
                          {score.change > 0 ? '▲' : score.change < 0 ? '▼' : '━'}{' '}
                          {Math.abs(score.change)}%
                        </Text>
                      )}
                    </View>
                    <View style={styles.categoryStats}>
                      <Text style={styles.categoryScore}>{score.current}%</Text>
                      {score.average !== null && (
                        <Text style={styles.categoryStatSecondary}>
                          반 평균: {score.average}%
                        </Text>
                      )}
                      {score.retestRate !== null && score.retestRate > 0 && (
                        <Text style={styles.categoryStatWarning}>
                          재시험률: {score.retestRate}%
                        </Text>
                      )}
                    </View>
                  </View>
                  {score.tests && score.tests.length > 0 && (
                    <View style={styles.testList}>
                      {score.tests.map((test, testIdx) => (
                        <View key={testIdx} style={styles.testItem}>
                          <Text style={styles.testName}>
                            {formatKoreanDateShort(test.date)} - {test.name}
                          </Text>
                          <Text style={styles.testScore}>{test.percentage}%</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section 5: Instructor Comment (강사 종합 코멘트) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>강사 종합 코멘트</Text>
          <Text style={styles.sectionDescription}>
            학생의 성장을 위한 맞춤형 피드백
          </Text>

          {reportData.comment ? (
            <View>
              <View style={styles.commentSection}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentEmoji}>📝</Text>
                  <Text style={styles.commentTitle}>총평</Text>
                </View>
                <Text style={styles.commentText}>
                  {reportData.comment.summary || '코멘트가 없습니다.'}
                </Text>
              </View>

              <View style={styles.commentSection}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentEmoji}>✨</Text>
                  <Text style={styles.commentTitle}>잘한 점</Text>
                </View>
                <Text style={styles.commentText}>
                  {reportData.comment.strengths || '코멘트가 없습니다.'}
                </Text>
              </View>

              <View style={styles.commentSection}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentEmoji}>📈</Text>
                  <Text style={styles.commentTitle}>보완할 점</Text>
                </View>
                <Text style={styles.commentText}>
                  {reportData.comment.improvements || '코멘트가 없습니다.'}
                </Text>
              </View>

              <View style={styles.commentSection}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentEmoji}>🎯</Text>
                  <Text style={styles.commentTitle}>다음 달 목표</Text>
                </View>
                <Text style={styles.commentText}>
                  {reportData.comment.nextGoals || '코멘트가 없습니다.'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.commentText}>
              {reportData.instructorComment || reportData.overallComment || '코멘트가 없습니다.'}
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            생성일: {new Date(generatedAt).toLocaleDateString('ko-KR')}
          </Text>
          <Text style={styles.footerText}>
            {reportData.academy.name} • {reportData.academy.phone}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
