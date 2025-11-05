"use client"

import React, { type ReactElement, useState, useEffect, useCallback } from 'react'
import { useT } from '@/i18n'
import { fetchServiceStats } from '@/lib/metrics'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ServiceConfig {
  id: string;
  name: string;
  type: 'email' | 'totp';
  status: 'active' | 'disabled';
  settings: {
    otpType?: 'numeric' | 'alphanumeric' | 'alphabet';
    defaultLength?: number;
    defaultTTL?: number;
    rateLimit?: number;
    timeStep?: number;
  };
}

export function ServiceManager() {
  const { t } = useT();
  const [services, setServices] = React.useState<ServiceConfig[]>([]);
  const [serviceStats, setServiceStats] = useState({
    totalOTPs: 0,
    successRate: 0,
    emailsSent: 0,
    emailsFailed: 0
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  // generic fetch with retry + exponential backoff
  const fetchWithRetry = useCallback(async (url: string, options: RequestInit = {}, attempts = 3, baseDelay = 500): Promise<Response> => {
    let attempt = 0;
    let lastError: any;
    while (attempt < attempts) {
      try {
        const res = await fetch(url, options);
        if (!res.ok) {
          // treat 503 specially for retry
            if (res.status === 503 && attempt < attempts - 1) {
              await new Promise(r => setTimeout(r, baseDelay * 2 ** attempt));
              attempt++;
              continue;
            }
        }
        return res;
      } catch (err) {
        lastError = err;
        if (attempt === attempts - 1) break;
        await new Promise(r => setTimeout(r, baseDelay * 2 ** attempt));
        attempt++;
      }
    }
    throw lastError || new Error('Failed to fetch after retries');
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const healthResponse = await fetchWithRetry(`${apiUrl}/health/ready`);
      const healthData = await healthResponse.json();
      const degraded = healthData.degraded === true;
      const baseServices: ServiceConfig[] = [
        {
          id: 'email-otp',
          name: 'Email OTP',
          type: 'email',
          status: healthData.ready ? 'active' : 'disabled',
          settings: {
            otpType: 'numeric',
            defaultLength: 6,
            defaultTTL: 300,
            rateLimit: 60
          }
        },
        {
          id: 'totp-service',
          name: 'TOTP',
          type: 'totp',
          status: healthData.ready ? 'active' : 'disabled',
          settings: {
            timeStep: 30
          }
        }
      ];
      setServices(baseServices);
      try {
        const metricsData = await fetchServiceStats();
        setServiceStats(metricsData);
      } catch (mErr) {
        console.warn('Metrics fetch failed', mErr);
      }
      setDegraded(degraded);
      setLastUpdated(new Date());
    } catch (error) {
  console.error('Failed to load service data:', error);
  toast.error(t('failed_service_load'));
    } finally {
      setLoading(false);
    }
  }, [fetchWithRetry]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const [degraded, setDegraded] = useState(false);

  const [selectedService, setSelectedService] = useState<ServiceConfig | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newService, setNewService] = useState<{
    type: 'email' | 'totp';
    name: string;
  }>({
    type: 'email',
    name: ''
  })

  const addService = () => {
    const service: ServiceConfig = {
      id: `service-${Date.now()}`,
      name: newService.name,
      type: newService.type,
      status: 'active',
      settings: newService.type === 'email' 
        ? {
            otpType: 'numeric',
            defaultLength: 6,
            defaultTTL: 300,
            rateLimit: 60
          }
        : {
            timeStep: 30
          }
    }
    setServices([...services, service])
  }

  return (
    <Card className="w-full mx-auto backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-0 shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-500">
              {t('services_title')}
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {degraded ? (
              <>
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm text-amber-600 dark:text-amber-400">{t('degraded_banner')}</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-gray-500">{t('all_systems_ok')}</span>
              </>
            )}
          </div>
        </div>
        <CardDescription className="text-gray-500 dark:text-gray-400">
          {t('services_subtitle')}
        </CardDescription>
        <div className="flex items-center justify-between mt-2">
          {degraded && (
            <div className="text-xs px-3 py-2 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {t('degraded_detail')}
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {lastUpdated && (
              <span className="text-xs text-gray-400">{lastUpdated.toLocaleTimeString()}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => loadAll()}
              className="hover:border-purple-500 hover:text-purple-500 relative"
              aria-label={t('refresh')}
              title={t('refresh')}
            >
              {loading ? '…' : '↻'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card 
              key={service.id} 
              className="relative backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all duration-300 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`h-6 w-6 rounded-lg ${service.type === 'email' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-green-500 to-emerald-500'} flex items-center justify-center`}>
                      {service.type === 'email' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <CardDescription className="text-sm">{service.type === 'email' ? t('email_service_desc') : t('totp_service_desc')}</CardDescription>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    service.status === 'active' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {service.status === 'active' ? `●  ${t('active_status')}` : `○  ${t('disabled_status')}`}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {service.type === 'email' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                        <div className="text-gray-500 dark:text-gray-400">{t('type')}</div>
                        <div className="font-medium">{service.settings.otpType}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                        <div className="text-gray-500 dark:text-gray-400">{t('length')}</div>
                        <div className="font-medium">{service.settings.defaultLength} {t('digits')}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                        <div className="text-gray-500 dark:text-gray-400">{t('ttl')}</div>
                        <div className="font-medium">{service.settings.defaultTTL}s</div>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                        <div className="text-gray-500 dark:text-gray-400">{t('rate_limit')}</div>
                        <div className="font-medium">{service.settings.rateLimit}/min</div>
                      </div>
                    </div>
                  )}
                  {service.type === 'totp' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                        <div className="text-gray-500 dark:text-gray-400">{t('time_step')}</div>
                        <div className="font-medium">{service.settings.timeStep}s</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:border-purple-500 hover:text-purple-500 transition-colors"
                  onClick={() => {
                    setSelectedService(service)
                    setEditDialogOpen(true)
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  {t('configure')}
                </Button>
                <Button
                  variant={service.status === 'active' ? 'destructive' : 'secondary'}
                  size="sm"
                  className={service.status === 'active' 
                    ? 'hover:bg-red-600 transition-colors' 
                    : 'hover:bg-green-600 transition-colors'
                  }
                  onClick={() => {
                    const newServices = services.map(s =>
                      s.id === service.id
                        ? { ...s, status: s.status === 'active' ? 'disabled' as const : 'active' as const }
                        : s
                    )
                    setServices(newServices)
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {service.status === 'active' ? (
                      <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
                    ) : (
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    )}
                  </svg>
                  {service.status === 'active' ? t('disable') : t('enable')}
                </Button>
              </CardFooter>
            </Card>
          ))}

          {/* Add New Service Card */}
          <Card className="relative backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-500 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader>
              <CardTitle className="text-gray-500 dark:text-gray-400">{t('add_new_service')}</CardTitle>
              <CardDescription>{t('add_service_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[120px]">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="hover:border-purple-500 hover:text-purple-500 transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M5 12h14M12 5v14" />
                    </svg>
                    {t('add_service')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
                  <DialogHeader>
                    <DialogTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-500">
                      {t('add_new_service')}
                    </DialogTitle>
                    <DialogDescription className="text-gray-500 dark:text-gray-400">
                      {t('add_service_explain')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="service-type" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('service_type')}
                      </Label>
                      <Select
                        value={newService.type}
                        onValueChange={(value: 'email' | 'totp') => setNewService({ ...newService, type: value })}
                      >
                        <SelectTrigger id="service-type" className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          <SelectValue placeholder={t('select_service_type')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">
                            <div className="flex items-center space-x-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                              </svg>
                              <span>{t('email_otp')}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="totp">
                            <div className="flex items-center space-x-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              <span>{t('totp')}</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('service_name')}
                      </Label>
                      <div className="relative">
                        <Input
                          id="service-name"
                          placeholder={t('service_name')}
                          value={newService.name}
                          onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                          className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={addService}
                      disabled={!newService.name}
                      className={`bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 ${!newService.name ? 'opacity-50' : ''}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5v14" />
                      </svg>
                      {t('create_service')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </CardContent>

      {/* Service Configuration Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-0 shadow-lg">
          {selectedService && (
            <>
              <DialogHeader className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className={`h-8 w-8 rounded-lg ${selectedService.type === 'email' 
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
                    : 'bg-gradient-to-br from-green-500 to-emerald-500'
                  } flex items-center justify-center`}>
                    {selectedService.type === 'email' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    )}
                  </div>
                  <DialogTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-500">
                    {t('configure')} {selectedService.name}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-gray-500 dark:text-gray-400">
                  {t('configure_service_desc')}
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="settings" className="w-full">
                <div>
                  <TabsList className="grid w-full grid-cols-3 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    <TabsTrigger 
                      value="settings"
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      {t('settings')}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="history"
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('history')}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="stats"
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 20V10M12 20V4M6 20v-6" />
                      </svg>
                      {t('stats')}
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="settings">
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg mt-4">
                    {selectedService.type === 'email' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('default_otp_type')}</Label>
                          <Select
                            defaultValue={selectedService.settings.otpType}
                            onValueChange={(value: 'numeric' | 'alphanumeric' | 'alphabet') => {
                              const newServices = services.map((s: ServiceConfig) =>
                                s.id === selectedService.id
                                  ? {
                                      ...s,
                                      settings: {
                                        ...s.settings,
                                        otpType: value
                                      }
                                    }
                                  : s
                              )
                              setServices(newServices)
                            }}
                          >
                            <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                              <SelectValue placeholder={t('select_otp_type')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="numeric">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded text-sm">123</span>
                                  <span>{t('numeric')}</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="alphanumeric">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded text-sm">A1B2</span>
                                  <span>{t('alphanumeric')}</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="alphabet">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono bg-purple-100 dark:bg-purple-900 px-2 py-0.5 rounded text-sm">ABC</span>
                                  <span>{t('alphabet')}</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('otp_length')}</Label>
                            <span className="text-sm font-mono bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                              {selectedService.settings.defaultLength} {t('digits')}
                            </span>
                          </div>
                          <Slider
                            value={[selectedService.settings.defaultLength || 6]}
                            onValueChange={(value: number[]) => {
                              const newServices = services.map((s: ServiceConfig) =>
                                s.id === selectedService.id
                                  ? {
                                      ...s,
                                      settings: { ...s.settings, defaultLength: value[0] }
                                    }
                                  : s
                              )
                              setServices(newServices)
                            }}
                            min={4}
                            max={12}
                            step={1}
                            className="[&>span]:bg-blue-500 [&>span]:border-blue-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('ttl')}</Label>
                            <span className="text-sm font-mono bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                              {selectedService.settings.defaultTTL}s
                            </span>
                          </div>
                          <Slider
                            value={[selectedService.settings.defaultTTL || 300]}
                            onValueChange={(value: number[]) => {
                              const newServices = services.map((s: ServiceConfig) =>
                                s.id === selectedService.id
                                  ? {
                                      ...s,
                                      settings: { ...s.settings, defaultTTL: value[0] }
                                    }
                                  : s
                              )
                              setServices(newServices)
                            }}
                            min={30}
                            max={3600}
                            step={30}
                            className="[&>span]:bg-blue-500 [&>span]:border-blue-500"
                          />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('rate_limit_per_minute')}</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={selectedService.settings.rateLimit}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const newServices = services.map((s: ServiceConfig) =>
                                  s.id === selectedService.id
                                    ? {
                                        ...s,
                                        settings: { ...s.settings, rateLimit: parseInt(e.target.value) }
                                      }
                                    : s
                                )
                                setServices(newServices)
                              }}
                              min={1}
                              max={3600}
                              className="pl-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                            />
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <path d="M12 6v6l4 2" />
                            </svg>
                          </div>
                        </div>
                      </>
                    )}

                    {selectedService.type === 'totp' && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('time_step')}</Label>
                        <Select
                          defaultValue={selectedService.settings.timeStep?.toString()}
                          onValueChange={(value: string) => {
                            const newServices = services.map((s: ServiceConfig) =>
                              s.id === selectedService.id
                                ? {
                                    ...s,
                                    settings: { ...s.settings, timeStep: parseInt(value) }
                                  }
                                : s
                            )
                            setServices(newServices)
                          }}
                        >
                          <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                            <SelectValue placeholder={t('select_time_step')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded text-sm">30s</span>
                                <span>{t('thirty_seconds')}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="60">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded text-sm">60s</span>
                                <span>{t('sixty_seconds')}</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="history" className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden mt-4">
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium">
                      {t('recent_activity')}
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      <div className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <path d="M22 4 12 14.01l-3-3" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium">{t('otp_generated')}</div>
                              <div className="text-sm text-gray-500">{t('sent_to')} user@example.com</div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">{t('two_min_ago')}</div>
                        </div>
                      </div>
                      <div className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <path d="M22 4 12 14.01l-3-3" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium">{t('otp_verified_label')}</div>
                              <div className="text-sm text-gray-500">{t('for_account')} user@example.com</div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">{t('five_min_ago')}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="stats" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-0 shadow-md">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('total_otps')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-500">
                            {serviceStats.totalOTPs.toLocaleString()}
                          </div>
                          <p className="text-xs text-gray-500">{t('total_generated')}</p>
                        </CardContent>
                      </Card>
                    </div>
                    <div>
                      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-0 shadow-md">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('success_rate')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-500">
                            {serviceStats.successRate.toFixed(1)}%
                          </div>
                          <p className="text-xs text-gray-500">{t('verification_success_rate')}</p>
                        </CardContent>
                      </Card>
                    </div>
                    <div>
                      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-0 shadow-md">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('emails_sent')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-500">
                            {serviceStats.emailsSent.toLocaleString()}
                          </div>
                          <p className="text-xs text-gray-500">{t('successfully_sent')}</p>
                        </CardContent>
                      </Card>
                    </div>
                    <div>
                      <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-0 shadow-md">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('failed_emails')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
                            {serviceStats.emailsFailed.toLocaleString()}
                          </div>
                          <p className="text-xs text-gray-500">{t('delivery_failures')}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}