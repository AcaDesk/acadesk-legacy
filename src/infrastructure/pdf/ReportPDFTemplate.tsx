/**
 * Report PDF Template - Infrastructure Layer
 *
 * @react-pdf/renderer를 사용한 PDF 템플릿
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import { ReportData } from '@/domain/entities/Report'

// PDF 스타일 정의
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #333',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    borderBottom: '1px solid #ddd',
    paddingBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
    color: '#555',
  },
  value: {
    width: '70%',
    color: '#333',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #eee',
    padding: 8,
  },
  tableCell: {
    flex: 1,
  },
  statBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 10,
  },
  statItem: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    width: '30%',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 9,
    color: '#666',
  },
  comment: {
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 4,
    marginTop: 10,
    borderLeft: '3px solid #fbbf24',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#999',
    borderTop: '1px solid #ddd',
    paddingTop: 10,
  },
})

interface ReportPDFTemplateProps {
  data: ReportData
  academyName?: string
  academyPhone?: string
}

/**
 * 학생 리포트 PDF 템플릿
 */
export const ReportPDFTemplate: React.FC<ReportPDFTemplateProps> = ({
  data,
  academyName = '우리 학원',
  academyPhone = '02-1234-5678',
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{data.studentName} 학습 리포트</Text>
          <Text style={styles.subtitle}>
            {data.startDate} ~ {data.endDate}
          </Text>
        </View>

        {/* 학생 기본 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 기본 정보</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>학생명</Text>
            <Text style={styles.value}>{data.studentName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>학생 코드</Text>
            <Text style={styles.value}>{data.studentCode}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>학년</Text>
            <Text style={styles.value}>{data.grade}</Text>
          </View>
        </View>

        {/* KPI 통계 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 종합 통계</Text>
          <View style={styles.statBox}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.avgScore}점</Text>
              <Text style={styles.statLabel}>평균 성적</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.attendanceRate}%</Text>
              <Text style={styles.statLabel}>출석률</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.homeworkRate}%</Text>
              <Text style={styles.statLabel}>숙제 완료율</Text>
            </View>
          </View>
        </View>

        {/* 성적 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 성적</Text>
          {data.exams.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flex: 2 }]}>시험명</Text>
                <Text style={styles.tableCell}>날짜</Text>
                <Text style={styles.tableCell}>점수</Text>
                <Text style={styles.tableCell}>백분율</Text>
                {data.exams[0].rank && <Text style={styles.tableCell}>등수</Text>}
              </View>
              {data.exams.slice(0, 5).map((exam, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{exam.name}</Text>
                  <Text style={styles.tableCell}>{exam.date}</Text>
                  <Text style={styles.tableCell}>{exam.score}점</Text>
                  <Text style={styles.tableCell}>{exam.percentage}%</Text>
                  {exam.rank && <Text style={styles.tableCell}>{exam.rank}등</Text>}
                </View>
              ))}
            </View>
          ) : (
            <Text>시험 기록이 없습니다.</Text>
          )}
        </View>

        {/* 출석 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 출석</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>출석률</Text>
            <Text style={styles.value}>{data.attendanceRate}%</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>총 수업일</Text>
            <Text style={styles.value}>{data.totalDays}일</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>출석</Text>
            <Text style={styles.value}>{data.presentDays}일</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>지각</Text>
            <Text style={styles.value}>{data.lateDays}일</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>결석</Text>
            <Text style={styles.value}>{data.absentDays}일</Text>
          </View>
        </View>

        {/* 숙제 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✏️ 숙제</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>완료율</Text>
            <Text style={styles.value}>{data.homeworkRate}%</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>총 숙제</Text>
            <Text style={styles.value}>{data.totalTodos}개</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>완료</Text>
            <Text style={styles.value}>{data.completedTodos}개</Text>
          </View>
        </View>

        {/* 상담 기록 */}
        {data.consultations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 상담 기록</Text>
            {data.consultations.slice(0, 3).map((consult, index) => (
              <View key={index} style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>
                  {consult.date} ({consult.type})
                </Text>
                <Text style={{ color: '#555', fontSize: 9 }}>{consult.summary}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 종합 평가 */}
        {data.overallComment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 종합 평가</Text>
            <View style={styles.comment}>
              <Text>{data.overallComment}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {academyName} | 문의: {academyPhone}
          </Text>
          <Text style={{ marginTop: 4 }}>
            생성일: {new Date().toLocaleDateString('ko-KR')}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
