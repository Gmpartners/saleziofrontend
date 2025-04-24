import { useState } from 'react';
import { db } from '@/firebase/config';
import { collection, query, getDocs, doc, getDoc, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { getFunctions, httpsCallable } from 'firebase/functions';

export const useApplications = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchUserApplications = async (userId) => {
    setLoading(true);
    setError(null);
    try {
      console.log("Buscando aplicações para userId:", userId);
      const applicationsRef = collection(db, `users/${userId}/applications`);
      const q = query(applicationsRef, where("status", "!=", "cancelled"));
      const applicationsSnapshot = await getDocs(q);
      
      const apps = applicationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log("Aplicações encontradas:", apps);
      return apps;
    } catch (err) {
      console.error("Erro ao buscar aplicações:", err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const cancelApplication = async (userId, applicationId) => {
    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions();
      const cancelAppFunction = httpsCallable(functions, 'cancelApplication');
      
      const result = await cancelAppFunction({ userId, applicationId });
      console.log("Resultado do cancelamento:", result.data);
      
      return result.data;
    } catch (err) {
      console.error("Erro ao cancelar aplicação:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyMetrics = async (userId, appId, startDate, endDate) => {
    setLoading(true);
    setError(null);
    try {
      const metrics = [];
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Busca um dia específico de métricas
      const fetchDayMetrics = async (date) => {
        const summaryRef = doc(
          db, 
          'users', 
          userId, 
          'applications', 
          appId,
          'metrics',
          'daily',
          date,
          'summary'
        );

        const summaryDoc = await getDoc(summaryRef);
        if (summaryDoc.exists()) {
          const data = summaryDoc.data();
          return {
            date,
            cpu_avg: data.cpu_avg || 0,
            ram_avg: data.ram_avg || 0
          };
        }
        return null;
      };

      // Percorre o intervalo de datas
      let currentDate = new Date(startDate);
      const endDateTime = new Date(endDate);

      while (currentDate <= endDateTime) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const dayMetrics = await fetchDayMetrics(dateStr);
        if (dayMetrics) {
          metrics.push(dayMetrics);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log("Métricas encontradas:", metrics);
      return metrics.sort((a, b) => a.date.localeCompare(b.date));

    } catch (err) {
      console.error("Erro ao buscar métricas:", err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { 
    fetchUserApplications,
    cancelApplication,
    fetchDailyMetrics,
    error,
    loading 
  };
};