import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Activity } from 'lucide-react';
import * as api from '../services/api';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearedIds, setClearedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('ripple_cleared_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('ripple_cleared_notifications', JSON.stringify(clearedIds));
  }, [clearedIds]);

  const loadDataAndGenerate = async () => {
    setLoading(true);
    try {
      const [events, predictions] = await Promise.all([
        api.fetchEvents(),
        api.fetchPredictions()
      ]);

      const generated = [];
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 1. Recent Disruptions (3hr)
      const recentEvents = events.filter(e => new Date(e.detected_at) >= threeHoursAgo);
      if (recentEvents.length > 0) {
        const id = `recent-3h-${recentEvents.length}`;
        if (!clearedIds.includes(id)) {
          generated.push({
            id,
            type: 'warning',
            icon: AlertTriangle,
            title: 'Cluster Detection',
            message: `${recentEvents.length} detected disruptors in the last 3 hours.`,
            timestamp: new Date().toISOString(),
            priority: 'medium'
          });
        }
      }

      // 2. Major Weekly Signals
      const majorEvents = events.filter(e => 
        new Date(e.detected_at) >= sevenDaysAgo && 
        (e.severity === 'critical' || e.severity === 'high')
      );
      if (majorEvents.length > 0) {
        const id = `major-7d-${majorEvents.length}`;
        if (!clearedIds.includes(id)) {
          generated.push({
            id,
            type: 'danger',
            icon: Activity,
            title: 'Critical Signal Density',
            message: `${majorEvents.length} major disruptions detected in the last week.`,
            timestamp: new Date().toISOString(),
            priority: 'high'
          });
        }
      }

      // 3. Highest Probability Forecast
      const topPrediction = [...predictions].sort((a, b) => b.probability - a.probability)[0];
      if (topPrediction && topPrediction.probability > 0.7) {
        const id = `forecast-${topPrediction.id || topPrediction.event_type}-${topPrediction.location}`;
        if (!clearedIds.includes(id)) {
          generated.push({
            id,
            type: 'info',
            icon: Shield,
            title: 'Strategic Neural Alert',
            message: `A ${topPrediction.event_type.replace(/_/g, ' ')} in ${topPrediction.location} has the highest probability to cause trouble in the next 72 hours.`,
            timestamp: new Date().toISOString(),
            priority: 'high'
          });
        }
      }

      setNotifications(generated);
    } catch (err) {
      console.error('Failed to generate notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataAndGenerate();
    
    // Poll for updates every 5 minutes
    const interval = setInterval(loadDataAndGenerate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [clearedIds]);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setClearedIds(prev => [...prev, id]);
  };

  const clearAll = () => {
    const allIds = notifications.map(n => n.id);
    setNotifications([]);
    setClearedIds(prev => [...prev, ...allIds]);
  };

  return {
    notifications,
    loading,
    count: notifications.length,
    removeNotification,
    clearAll,
    refresh: loadDataAndGenerate
  };
};
