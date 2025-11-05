"use client"

import { useState, useEffect } from 'react'
import { useServices } from '@/context/services-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { api } from '@/lib/api';
import { useT } from '@/i18n';

interface StoredOTP {
  id: string;
  email: string;
}

export function OTPValidator() {
  const { t } = useT();
  const { services } = useServices();
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [storedOTP, setStoredOTP] = useState<StoredOTP | null>(null)

  // Load stored OTP on component mount
  useEffect(() => {
    const storedData = localStorage.getItem('lastGeneratedOTP');
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      // Check if the OTP hasn't expired
      if (new Date(parsedData.expiresAt) > new Date()) {
        setStoredOTP(parsedData);
        setEmail(parsedData.email);
      } else {
        localStorage.removeItem('lastGeneratedOTP');
      }
    }
  }, []);

  const handleValidateOTP = async () => {
    if (!email || !otpCode) {
      toast.error(t('enter_email_otp') || 'Please enter both email and OTP code')
      return
    }

    if (!storedOTP) {
      toast.error(t('no_valid_otp') || 'No valid OTP found. Please generate a new OTP first.')
      return
    }

    setLoading(true)
    try {
      const data = await api.verifyOTP({
        otp_id: storedOTP.id,
        otp: otpCode,
        email: email
      })

      if (data.valid) {
        toast.success(t('otp_verified') || 'OTP verified successfully')
        setOtpCode('')  // Clear the OTP field after successful validation
      } else {
        throw new Error(data.message || 'Invalid OTP')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (t('validate_failed') || 'Failed to validate OTP'))
    } finally {
      setLoading(false)
    }
  }

  const emailEnabled = services.email?.enabled !== false;

  return (
    <Card className="w-full max-w-md mx-auto backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-0 shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="M22 4 12 14.01l-3-3" />
            </svg>
          </div>
          <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-500">
            {t('tab_validate')}
          </CardTitle>
        </div>
        <CardDescription className="text-gray-500 dark:text-gray-400">
          {t('validate_desc') || 'Enter the OTP you received to validate'}
        </CardDescription>
      </CardHeader>
  <CardContent className={`space-y-6 ${!emailEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('email_address')}
          </Label>
          <div className="relative">
            <Input 
              id="email" 
              type="email" 
              placeholder={t('email_address')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="otp" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('otp_code') || 'OTP Code'}
          </Label>
          <div className="relative">
            <Input 
              id="otp" 
              placeholder={t('otp_code') || 'Enter OTP code'} 
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 font-mono text-lg tracking-wider"
              maxLength={6}
            />
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          {storedOTP && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {(t('using_otp_for') || 'Using OTP generated for')} {storedOTP.email}
            </p>
          )}
        </div>

        <Button 
          className={`w-full ${loading ? 'opacity-80' : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'}`}
          onClick={handleValidateOTP}
          disabled={loading || !emailEnabled}
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{t('validating') || 'Validating...'}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4 12 14.01l-3-3" />
              </svg>
              <span>{t('tab_validate')}</span>
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}