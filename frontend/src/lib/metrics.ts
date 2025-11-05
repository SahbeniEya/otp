export interface ServiceStats {
  totalOTPs: number;
  successRate: number;
  emailsSent: number;
  emailsFailed: number;
  uptime: string;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  responseTime: number;
  storage: string;
  timestamp: string;
}

export const fetchServiceStats = async (): Promise<ServiceStats> => {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
  
  try {
    const response = await fetch(`${base}/api/v1/metrics`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Return the structured metrics from the API
    return {
      totalOTPs: data.totalOTPs || 0,
      successRate: data.successRate || 0,
      emailsSent: data.emailsSent || 0,
      emailsFailed: data.emailsFailed || 0,
      uptime: data.uptime || 'Unknown',
      cpuUsage: data.cpuUsage || 0,
      memoryUsage: data.memoryUsage || 0,
      activeConnections: data.activeConnections || 0,
      responseTime: data.responseTime || 0,
      storage: data.storage || 'unknown',
      timestamp: data.timestamp || new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    // Return default values on error
    return {
      totalOTPs: 0,
      successRate: 0,
      emailsSent: 0,
      emailsFailed: 0,
      uptime: 'Unknown',
      cpuUsage: 0,
      memoryUsage: 0,
      activeConnections: 0,
      responseTime: 0,
      storage: 'error',
      timestamp: new Date().toISOString()
    };
  }
};