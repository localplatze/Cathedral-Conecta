import React, { useState, useMemo } from 'react';
import { 
    View, Text, StyleSheet, SafeAreaView, StatusBar, ScrollView,
    TouchableOpacity, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from "react-native-chart-kit";
import { FIREBASE_DB } from '../firebaseConnection';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';

// Componentes de Seleção (reutilizáveis ou simplificados para este exemplo)
import { StudentSelector } from './NewNoteModal'; // Reutilizando o seletor de alunos

const screenWidth = Dimensions.get("window").width;

export const RelatoriosScreen = ({ navigation }) => {
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedSemester, setSelectedSemester] = useState(null);
    const [reportData, setReportData] = useState({ allForStudent: [] }); // Initialize with the expected shape
    const [isLoading, setIsLoading] = useState(false);

    // Gera a lista de semestres disponíveis após carregar os dados
    const availableSemesters = useMemo(() => {
        if (!reportData.allForStudent) return [];
        const semesters = new Set(reportData.allForStudent.map(item => item.semester).filter(Boolean));
        return Array.from(semesters).sort().reverse();
    }, [reportData]);

    const handleSelectStudent = async (student) => {
        if (!student || !student.id) return; // Guard clause
        console.log('Aluno selecionado:', student);
        setSelectedStudent(student);
        setReportData({ allForStudent: [] }); // Reset correctly
        setSelectedSemester(null);
        setIsLoading(true);
        try {
            const q = query(ref(FIREBASE_DB, 'studentAssessments'), orderByChild('studentId'), equalTo(student.id));
            const snapshot = await get(q);
            
            const studentAssessments = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    studentAssessments.push({ id: child.key, ...child.val() });
                });
            }
            
            studentAssessments.sort((a, b) => new Date(a.date) - new Date(b.date));
            setReportData({ allForStudent: studentAssessments });
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            Alert.alert("Erro", "Não foi possível buscar os dados do aluno.");
        } finally {
            setIsLoading(false);
        }
    };

    // Filtra os dados para o gráfico e a lista com base no semestre selecionado
    const filteredReport = useMemo(() => {
        if (!selectedSemester || !reportData.allForStudent) return { assessments: [], chartData: null };
        
        const assessments = reportData.allForStudent.filter(item => item.semester === selectedSemester);
        if(assessments.length === 0) return { assessments: [], chartData: null };

        const chartData = {
            labels: assessments.map(item => new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })),
            datasets: [{
                data: assessments.map(item => item.grade),
                color: (opacity = 1) => `rgba(29, 133, 76, ${opacity})`,
                strokeWidth: 2
            }]
        };

        return { assessments, chartData };
    }, [reportData, selectedSemester]);
    
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#1D854C" barStyle="light-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                    <Ionicons name="arrow-back-outline" size={26} color="#FFFFFF"/>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Relatórios de Alunos</Text>
                <View style={{width: 38}} />
            </View>
            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Selecione o Aluno</Text>
                    <StudentSelector onStudentSelect={handleSelectStudent} />
                </View>

                {isLoading && <ActivityIndicator size="large" color="#1D854C" style={{ marginVertical: 20 }}/>}
                
                {/* --- START OF FIX --- */}

                {/* Only show semester buttons if they exist */}
                {availableSemesters.length > 0 && (
                    <View style={styles.semesterContainer}>
                        {availableSemesters.map(sem => (
                            <TouchableOpacity 
                                key={sem}
                                style={[styles.semesterButton, selectedSemester === sem && styles.semesterButtonActive]}
                                onPress={() => setSelectedSemester(sem)}
                            >
                                <Text style={[styles.semesterText, selectedSemester === sem && styles.semesterTextActive]}>{sem}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Only show this message if a student is selected, loading is done, and there are NO semesters */}
                {!isLoading && selectedStudent && availableSemesters.length === 0 && (
                    <Text style={styles.infoText}>
                        Nenhum semestre encontrado para {selectedStudent.name}.
                    </Text>
                )}

                {/* --- END OF FIX --- */}

                {selectedSemester && filteredReport.assessments.length > 0 && (
                    <View style={styles.reportSection}>
                        <Text style={styles.reportTitle}>Relatório de {selectedStudent.name} - {selectedSemester}</Text>
                        
                        {filteredReport.chartData && (
                            <View>
                                <Text style={styles.chartTitle}>Evolução das Notas</Text>
                                <LineChart
                                    data={filteredReport.chartData}
                                    width={screenWidth - 32}
                                    height={220}
                                    yAxisLabel=""
                                    yAxisSuffix=""
                                    yAxisInterval={1}
                                    chartConfig={chartConfig}
                                    bezier
                                    style={styles.chart}
                                />
                            </View>
                        )}

                        <Text style={styles.chartTitle}>Registros Cronológicos</Text>
                        {filteredReport.assessments.map(item => (
                            <View key={item.id} style={styles.assessmentItem}>
                                <View style={styles.assessmentHeader}>
                                    <Text style={styles.assessmentDate}>{new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR', {dateStyle: 'long'})}</Text>
                                    <Text style={styles.assessmentGrade}>Nota: {item.grade}</Text>
                                </View>
                                <Text style={styles.assessmentContent}>{item.content}</Text>
                            </View>
                        ))}
                    </View>
                )}
                 {selectedSemester && filteredReport.assessments.length === 0 && (
                     <View style={styles.reportSection}>
                        <Text style={styles.infoText}>Nenhum registro encontrado para este aluno neste semestre.</Text>
                     </View>
                 )}
            </ScrollView>
        </SafeAreaView>
    );
};

const chartConfig = {
    backgroundColor: "#e26a00",
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientTo: "#FFFFFF",
    decimalPlaces: 1, 
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "6", strokeWidth: "2", stroke: "#1D854C" }
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { height: 60, backgroundColor: '#1D854C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, },
    headerButton: { padding: 10 },
    headerTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: '600' },
    content: { padding: 16 },
    section: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 2 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 15 },
    infoText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginVertical: 10 },
    semesterContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
    semesterButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, marginRight: 10, marginBottom: 10, backgroundColor: '#E9EDF5' },
    semesterButtonActive: { backgroundColor: '#1D854C' },
    semesterText: { fontSize: 15, color: '#4A5568', fontWeight: '500' },
    semesterTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
    reportSection: { marginTop: 10, },
    reportTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#111827' },
    chartTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 20, marginBottom: 10 },
    chart: { marginVertical: 8, borderRadius: 16 },
    assessmentItem: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
    assessmentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    assessmentDate: { fontWeight: 'bold', color: '#374151' },
    assessmentGrade: { fontWeight: 'bold', color: '#1D854C' },
    assessmentContent: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
});