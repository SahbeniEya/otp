"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OTPGenerator } from './otp-generator';
import { OTPValidator } from './otp-validator';
import { TOTPValidator } from './totp-validator';
import { ServiceManager } from './service-manager';
import { MonitoringDashboard } from './monitoring-dashboard';
import { useT } from '@/i18n';
import { ServicesProvider } from '@/context/services-context';

export function Dashboard() {
  const { t, locale, setLocale } = useT();
  return (
    <ServicesProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-500">
                {t('app_title')}
              </h1>
              <p className="text-gray-500 mt-2">{t('app_subtitle')}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-gray-500">{t('system_online')}</span>
              <button
                onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
                className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >{t('lang_switch')}</button>
            </div>
          </div>

          <div className="grid gap-8">
            <Card>
              <CardHeader>
                <CardTitle>{t('services_title')}</CardTitle>
                <CardDescription>{t('services_subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-green-100 p-4 rounded-lg">
                    <h3 className="font-semibold">{t('email_otp')}</h3>
                    <p className="text-green-600">Active</p>
                  </div>
                  <div className="bg-green-100 p-4 rounded-lg">
                    <h3 className="font-semibold">TOTP</h3>
                    <p className="text-green-600">Active</p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h3 className="font-semibold">SMS OTP</h3>
                    <p className="text-gray-600">Not Configured</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="generator" className="space-y-8">
              <TabsList className="grid w-full grid-cols-5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <TabsTrigger value="generator" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg rounded-lg transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  {t('tab_generate')}
                </TabsTrigger>
                <TabsTrigger value="validator" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg rounded-lg transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="M22 4 12 14.01l-3-3" />
                  </svg>
                  {t('tab_validate')}
                </TabsTrigger>
                <TabsTrigger value="totp-verify" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg rounded-lg transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {t('totp_verify')}
                </TabsTrigger>
                <TabsTrigger value="monitoring" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg rounded-lg transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 20V10M12 20V4M6 20v-6" />
                  </svg>
                  Monitoring
                </TabsTrigger>
                <TabsTrigger value="services" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg rounded-lg transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  {t('tab_services')}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="generator" className="space-y-4">
                <OTPGenerator />
              </TabsContent>
              <TabsContent value="validator" className="space-y-4">
                <OTPValidator />
              </TabsContent>
              <TabsContent value="totp-verify" className="space-y-4">
                <TOTPValidator />
              </TabsContent>
              <TabsContent value="monitoring" className="space-y-4">
                <MonitoringDashboard />
              </TabsContent>
              <TabsContent value="services" className="space-y-4">
                <ServiceManager />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ServicesProvider>
  );
}
