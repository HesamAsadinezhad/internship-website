import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { VibrationAssetMetadata, IsoZone } from '../types/vibration';

// Register Persian font
Font.register({
  family: 'Vazirmatn',
  src: 'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.0.0/fonts/ttf/Vazirmatn-Regular.ttf'
});

const getStyles = (isRtl: boolean) => StyleSheet.create({
  page: { 
    flexDirection: 'column', 
    backgroundColor: '#FFFFFF', 
    padding: 30, 
    fontFamily: 'Vazirmatn', 
    fontSize: 10 
  },
  header: { 
    flexDirection: isRtl ? 'row-reverse' : 'row', 
    justifyContent: 'space-between', 
    borderBottomWidth: 2, 
    borderBottomColor: '#2563eb', 
    paddingBottom: 10, 
    marginBottom: 15 
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e3a8a' },
  headerMeta: { fontSize: 9, color: '#475569', textAlign: isRtl ? 'right' : 'left' },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', backgroundColor: '#f1f5f9', padding: 5, marginBottom: 5, textAlign: isRtl ? 'right' : 'left' },
  
  // Metadata Box
  metaBox: { flexDirection: isRtl ? 'row-reverse' : 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: '#cbd5e1', padding: 5, marginBottom: 10 },
  metaItem: { width: '33%', flexDirection: isRtl ? 'row-reverse' : 'row', marginBottom: 4 },
  metaLabel: { fontWeight: 'bold', color: '#64748b', marginHorizontal: 4, fontSize: 8 },
  metaValue: { fontSize: 8 },

  // Table Styles
  table: { display: 'flex', width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#cbd5e1', borderRightWidth: 0, borderBottomWidth: 0, flexDirection: 'column' },
  tableRow: { flexDirection: isRtl ? 'row-reverse' : 'row' },
  tableHeader: { backgroundColor: '#f8fafc', fontWeight: 'bold' },
  tableCol: { borderStyle: 'solid', borderWidth: 1, borderColor: '#cbd5e1', borderLeftWidth: 0, borderTopWidth: 0, padding: 4, flex: 1, textAlign: 'center' },
  tableColWide: { borderStyle: 'solid', borderWidth: 1, borderColor: '#cbd5e1', borderLeftWidth: 0, borderTopWidth: 0, padding: 4, flex: 2, textAlign: isRtl ? 'right' : 'left' },
  tableCell: { fontSize: 8 },
  
  // Zone colors
  zoneA: { backgroundColor: '#dcfce7', color: '#166534' },
  zoneB: { backgroundColor: '#fef9c3', color: '#854d0e' },
  zoneC: { backgroundColor: '#ffedd5', color: '#9a3412' },
  zoneD: { backgroundColor: '#fee2e2', color: '#991b1b' },

  // Diagnostic Box
  diagnosticBox: { borderWidth: 1, borderColor: '#cbd5e1', padding: 8, marginTop: 10 },
  diagnosticRow: { flexDirection: isRtl ? 'row-reverse' : 'row', marginBottom: 6 },
  diagnosticLabel: { fontWeight: 'bold', width: '25%', textAlign: isRtl ? 'right' : 'left' },
  diagnosticValue: { width: '75%', textAlign: isRtl ? 'right' : 'left' }
});

const getZoneStyle = (styles: any, zone: IsoZone) => {
  switch (zone) {
    case 'A': return styles.zoneA;
    case 'B': return styles.zoneB;
    case 'C': return styles.zoneC;
    case 'D': return styles.zoneD;
    default: return {};
  }
};

interface Props {
  data: VibrationAssetMetadata;
  isRtl?: boolean;
}

export default function VibrationReportPDF({ data, isRtl = true }: Props) {
  const styles = getStyles(isRtl);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: '60%', alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
            <Text style={styles.headerTitle}>
              {isRtl ? 'اندازه گیری و ارزیابی ارتعاشات ماشین آلات' : 'Machinery Vibration Assessment Report'}
            </Text>
            <Text style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
              Condition Monitoring & Vibration Analysis Report
            </Text>
          </View>
          <View style={{ width: '40%' }}>
            <Text style={styles.headerMeta}>{isRtl ? 'شماره گزارش:' : 'Report No:'} {data.reportCode}</Text>
            <Text style={styles.headerMeta}>{isRtl ? 'تاریخ:' : 'Date:'} {data.date}</Text>
            <Text style={styles.headerMeta}>{isRtl ? 'بازرس:' : 'Inspector:'} {data.inspector}</Text>
            <Text style={styles.headerMeta}>{isRtl ? 'مشتری:' : 'Client:'} {data.client}</Text>
          </View>
        </View>

        {/* Machine Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isRtl ? 'مشخصات تجهیز' : 'Equipment Specifications'}</Text>
          <View style={styles.metaBox}>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>{isRtl ? 'نام دستگاه:' : 'Machine Name:'}</Text><Text style={styles.metaValue}>{data.machineName}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>{isRtl ? 'واحد/سایت:' : 'Unit/Site:'}</Text><Text style={styles.metaValue}>{data.unitName}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>{isRtl ? 'پروژه:' : 'Project:'}</Text><Text style={styles.metaValue}>{data.projectName}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>{isRtl ? 'توان (kW):' : 'Power (kW):'}</Text><Text style={styles.metaValue}>{data.powerKw}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>{isRtl ? 'دور (RPM):' : 'Speed (RPM):'}</Text><Text style={styles.metaValue}>{data.rpm}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>{isRtl ? 'بیرینگ‌ها:' : 'Bearings:'}</Text><Text style={styles.metaValue}>{data.bearings}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>{isRtl ? 'زنجیره محرک:' : 'Drive Chain:'}</Text><Text style={styles.metaValue}>{data.driveChain}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>{isRtl ? 'وضعیت قبلی:' : 'Previous Status:'}</Text><Text style={[styles.metaValue, getZoneStyle(styles, data.previousStatus), {paddingHorizontal: 4, borderRadius: 2}]}>Zone {data.previousStatus}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>{isRtl ? 'وضعیت فعلی:' : 'Current Status:'}</Text><Text style={[styles.metaValue, getZoneStyle(styles, data.currentStatus), {paddingHorizontal: 4, borderRadius: 2}]}>Zone {data.currentStatus}</Text></View>
          </View>
        </View>

        {/* Velocity Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isRtl ? 'ارزیابی سرعت ارتعاشی - Velocity RMS (mm/s)' : 'Vibration Velocity Assessment - Velocity RMS (mm/s)'}</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={styles.tableColWide}><Text style={styles.tableCell}>{isRtl ? 'نقطه اندازه‌گیری' : 'Measurement Point'}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{isRtl ? 'جهت' : 'Direction'}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{isRtl ? 'متوسط' : 'Avg'}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{isRtl ? 'قبلی' : 'Previous'}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{isRtl ? 'فعلی' : 'Current'}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{isRtl ? 'وضعیت (ISO)' : 'Status (ISO)'}</Text></View>
              <View style={styles.tableColWide}><Text style={styles.tableCell}>{isRtl ? 'پیک‌های غالب (Hz)' : 'Dominant Peaks (Hz)'}</Text></View>
            </View>
            {data.readings.map((reading, i) => (
              <View key={i} style={styles.tableRow}>
                <View style={styles.tableColWide}><Text style={styles.tableCell}>{reading.pointName}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{reading.direction}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{reading.velocityAvg.toFixed(2)}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{reading.velocityPrev.toFixed(2)}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{reading.velocityRMS.toFixed(2)}</Text></View>
                <View style={[styles.tableCol, getZoneStyle(styles, reading.velocityZone)]}><Text style={styles.tableCell}>{reading.velocityZone}</Text></View>
                <View style={styles.tableColWide}>
                  <Text style={styles.tableCell}>
                    {reading.peaks.map(p => `${p.frequency}Hz`).join(' , ') || '-'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Acceleration Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isRtl ? 'ارزیابی شتاب ارتعاشی - Acceleration RMS (m/s²)' : 'Vibration Acceleration Assessment - Acceleration RMS (m/s²)'}</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={styles.tableColWide}><Text style={styles.tableCell}>{isRtl ? 'نقطه اندازه‌گیری' : 'Measurement Point'}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{isRtl ? 'جهت' : 'Direction'}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{isRtl ? 'متوسط' : 'Avg'}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{isRtl ? 'قبلی' : 'Previous'}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{isRtl ? 'فعلی' : 'Current'}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{isRtl ? 'وضعیت' : 'Status'}</Text></View>
            </View>
            {data.readings.map((reading, i) => (
              <View key={i} style={styles.tableRow}>
                <View style={styles.tableColWide}><Text style={styles.tableCell}>{reading.pointName}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{reading.direction}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{reading.accelerationAvg.toFixed(2)}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{reading.accelerationPrev.toFixed(2)}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{reading.accelerationRMS.toFixed(2)}</Text></View>
                <View style={[styles.tableCol, getZoneStyle(styles, reading.accelerationZone)]}><Text style={styles.tableCell}>{reading.accelerationZone}</Text></View>
              </View>
            ))}
          </View>
        </View>

        {/* Diagnostic Summary */}
        <View style={styles.diagnosticBox}>
          <Text style={styles.sectionTitle}>{isRtl ? 'تشخیص و توصیه‌ها' : 'Diagnostic Summary & Recommendations'}</Text>
          <View style={styles.diagnosticRow}>
            <Text style={styles.diagnosticLabel}>{isRtl ? 'مشاهدات عیب‌یابی:' : 'Observations:'}</Text>
            <Text style={styles.diagnosticValue}>{data.observations}</Text>
          </View>
          <View style={styles.diagnosticRow}>
            <Text style={styles.diagnosticLabel}>{isRtl ? 'عیوب محتمل:' : 'Probable Defects:'}</Text>
            <Text style={styles.diagnosticValue}>{data.probableDefects}</Text>
          </View>
          <View style={styles.diagnosticRow}>
            <Text style={styles.diagnosticLabel}>{isRtl ? 'اقدامات اصلاحی:' : 'Recommended Actions:'}</Text>
            <Text style={styles.diagnosticValue}>{data.recommendedActions}</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
