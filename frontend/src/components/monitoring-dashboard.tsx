"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n'
import { fetchServiceStats, ServiceStats } from '@/lib/metrics'

export function MonitoringDashboard() {
  const { t } = useT()
  const [stats, setStats] = useState<ServiceStats>({
    totalOTPs: 0,
    successRate: 0,
    emailsSent: 0,
    emailsFailed: 0,
    uptime: 'Unknown',
    cpuUsage: 0,
    memoryUsage: 0,
    activeConnections: 0,
    responseTime: 0,
    storage: 'unknown',
    timestamp: new Date().toISOString()
  })
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const metricsData = await fetchServiceStats()
      setStats(metricsData)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Failed to fetch monitoring stats:", err)
      setError(t('failed_load_monitoring_data'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [loadStats])

  if (loading && !lastUpdated) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        {t('loading_monitoring_data')}...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('total_otps')}</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalOTPs.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">{t('total_generated_otps')}</p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('success_rate')}</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="M22 4 12 14.01l-3-3" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">{t('otp_verification_success_rate')}</p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('emails_sent')}</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.emailsSent.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">{t('total_emails_sent')}</p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('system_uptime')}</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
            <path d="M12 2v10l4 4m-4-4L8 16m4-14a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.uptime}</div>
          <p className="text-xs text-muted-foreground">{t('time_since_last_restart')}</p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('cpu_usage')}</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
            <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.cpuUsage.toFixed(1)}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(stats.cpuUsage, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground">{t('current_cpu_load')}</p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('memory_usage')}</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.memoryUsage.toFixed(1)}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(stats.memoryUsage, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground">{t('current_memory_consumption')}</p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('active_connections')}</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
            <path d="M12 2a5 5 0 0 0-5 5v3H2v6h5v3a5 5 0 0 0 10 0v-3h5v-6h-5V7a5 5 0 0 0-5-5z" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeConnections}</div>
          <p className="text-xs text-muted-foreground">{t('live_api_connections')}</p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('average_response_time')}</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
            <path d="M12 8V4H8" />
            <rect x="4" y="8" width="16" height="16" rx="2" />
            <path d="M8 4V2" />
            <path d="M16 4V2" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.responseTime.toFixed(2)}ms</div>
          <p className="text-xs text-muted-foreground">{t('api_latency')}</p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('storage_backend')}</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
            <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2-2z" />
            <path d="M8 21v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">{stats.storage}</div>
          <p className="text-xs text-muted-foreground">{t('data_persistence_layer')}</p>
        </CardContent>
      </Card>

      {lastUpdated && (
        <div className="col-span-full text-center text-sm text-gray-500 mt-4">
          {t('last_updated')}: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}