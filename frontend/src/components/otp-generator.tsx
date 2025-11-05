"use client"

import { useState } from 'react'
import { useServices } from '@/context/services-context'
import { useT } from '@/i18n'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const DEFAULT_LENGTH = 6;
const DEFAULT_TTL = 300; // 5 minutes

interface OTPConfig {
  type: 'numeric' | 'alphanumeric' | 'alphabet';
  length: number;
  ttl: number;
}

export function OTPGenerator() {
  const { t } = useT();
  const { services } = useServices();
  const [otpType, setOtpType] = useState<string>('email')
  const [email, setEmail] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)
  const [otpConfig, setOtpConfig] = useState<OTPConfig>({
    type: 'numeric',
    length: DEFAULT_LENGTH,
    ttl: DEFAULT_TTL,
  })
  const [totpData, setTotpData] = useState<{qr_code: string; secret: string; account_name: string; issuer: string} | null>(null)
  const [showTotpModal, setShowTotpModal] = useState(false)
  const [totpToken, setTotpToken] = useState('')
  const [verifyingTotp, setVerifyingTotp] = useState(false)

  const handleGenerateOTP = async () => {
    if (!email) {
      toast.error(t('email_required'))
      return
    }

    setLoading(true)
    try {
      let response;
      if (otpType === 'email') {
        response = await fetch(`${API_BASE_URL}/api/v1/otp/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            type: otpConfig.type,
            length: otpConfig.length,
            ttl: otpConfig.ttl,
            send_email: true
          }),
        })
      } else {
        response = await fetch(`${API_BASE_URL}/api/v1/totp/setup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account_name: email,
            issuer: 'OTP Service'
          }),
        })
      }

      const data = await response.json()

      if (response.ok) {
        // Store the OTP ID in local storage
        if (data.otp_id || data.id) {
          const otpData = {
            id: data.otp_id || data.id,
            email: email,
            expiresAt: data.expires_at || Date.now() + (otpConfig.ttl * 1000)
          };
          localStorage.setItem('lastGeneratedOTP', JSON.stringify(otpData));
        }
        
        toast.success(
          otpType === 'email' 
            ? `${t('otp_sent_to')} ${email}` 
            : t('totp_setup_success')
        )
        // If TOTP, show QR code modal
        if (otpType === 'totp' && data.qr_code) {
          const td = {
            qr_code: data.qr_code,
            secret: data.secret,
            account_name: data.account_name,
            issuer: data.issuer
          }
            // Persist for future verification component
          try { localStorage.setItem('lastTOTP', JSON.stringify(td)); } catch {}
          setTotpData(td)
          setShowTotpModal(true)
        }
      } else {
        throw new Error(data.error || t('failed_generate'))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('failed_generate'))
    } finally {
      setLoading(false)
    }
  }

  const handleOtpTypeChange = (value: string) => {
    setOtpConfig(prev => ({
      ...prev,
      type: value as OTPConfig['type']
    }))
  }

  const handleLengthChange = (value: number[]) => {
    setOtpConfig(prev => ({
      ...prev,
      length: value[0]
    }))
  }

  const handleTTLChange = (value: number[]) => {
    setOtpConfig(prev => ({
      ...prev,
      ttl: value[0]
    }))
  }

  const emailEnabled = services.email?.enabled !== false;
  const totpEnabled = services.totp?.enabled !== false;

  return (
    <Card className="w-full max-w-md mx-auto backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-0 shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-500">{t('generate_title')}</CardTitle>
        </div>
        <CardDescription className="text-gray-500 dark:text-gray-400">
          {t('generate_desc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
  <div className={`space-y-2 ${!emailEnabled && otpType==='email' ? 'opacity-50 pointer-events-none' : ''} ${!totpEnabled && otpType==='totp' ? 'opacity-50 pointer-events-none' : ''}`}>
          <Label htmlFor="delivery-type" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('delivery_method')}
          </Label>
          <Select value={otpType} onValueChange={setOtpType}>
            <SelectTrigger id="delivery-type" className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <SelectValue placeholder="Select delivery method" />
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

        {otpType === 'email' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="otp-type" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('otp_format')}
              </Label>
              <Select value={otpConfig.type} onValueChange={handleOtpTypeChange}>
                <SelectTrigger id="otp-type" className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Select OTP format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="numeric">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">123</span>
                      <span>{t('numeric')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="alphanumeric">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded">A1B2</span>
                      <span>{t('alphanumeric')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="alphabet">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono bg-purple-100 dark:bg-purple-900 px-2 py-0.5 rounded">ABC</span>
                      <span>{t('alphabet')}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <Label htmlFor="advanced" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('advanced_settings')}
                </Label>
              </div>
              <Switch
                id="advanced"
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
                className="data-[state=checked]:bg-blue-500"
              />
            </div>

            {showAdvanced && (
              <div className="space-y-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('otp_length')}
                      </Label>
                      <span className="text-sm font-mono bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                        {otpConfig.length} digits
                      </span>
                    </div>
                    <Slider
                      value={[otpConfig.length]}
                      onValueChange={handleLengthChange}
                      min={4}
                      max={12}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('expiry_time')}
                      </Label>
                      <span className="text-sm font-mono bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                        {otpConfig.ttl}s
                      </span>
                    </div>
                    <Slider
                      value={[otpConfig.ttl]}
                      onValueChange={handleTTLChange}
                      min={30}
                      max={3600}
                      step={30}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {otpType === 'email' ? t('email_address') : t('account_name')}
          </Label>
          <div className="relative">
            <Input 
              id="email" 
              type="email" 
              placeholder={otpType === 'email' ? t('email_address') : t('account_name')}
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
              {otpType === 'email' ? (
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22,6 L12,13 L2,6" />
              ) : (
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8z" />
              )}
            </svg>
          </div>
        </div>

        <Button 
          className={`w-full ${loading ? 'opacity-80' : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'}`}
          onClick={handleGenerateOTP}
          disabled={loading || (otpType==='email' && !emailEnabled) || (otpType==='totp' && !totpEnabled)}
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{t('generating')}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              {otpType === 'email' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M8 12h8M12 8v8" />
                </svg>
              )}
              <span>{otpType === 'email' ? t('send_otp') : t('setup_totp')}</span>
            </div>
          )}
        </Button>
      </CardContent>
      <Dialog open={showTotpModal} onOpenChange={setShowTotpModal}>
        <DialogContent className="sm:max-w-[420px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-500">{t('totp_setup_title')}</DialogTitle>
          </DialogHeader>
          {totpData && (
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-3">
                <img src={totpData.qr_code} alt="TOTP QR" className="rounded shadow-md border border-gray-200 dark:border-gray-700" />
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('scan_with_auth_app')}</div>
              </div>
              <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800 font-mono text-xs break-all">
                Secret: {totpData.secret}
              </div>
              <div className="h-px w-full bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('enter_first_code')}</Label>
                <Input
                  placeholder="123456"
                  maxLength={6}
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value.replace(/[^0-9]/g, ''))}
                  className="font-mono tracking-widest text-center text-lg"
                />
                <Button
                  disabled={totpToken.length !== 6 || verifyingTotp}
                  onClick={async () => {
                    if (!totpData) return
                    setVerifyingTotp(true)
                    try {
                      const res = await fetch(`${API_BASE_URL}/api/v1/totp/verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ secret: totpData.secret, token: totpToken })
                      })
                      const json = await res.json()
                      if (json.valid) {
                        toast.success(t('totp_verified'))
                        setShowTotpModal(false)
                      } else {
                        toast.error(json.message || t('invalid_token'))
                      }
                    } catch (e) {
                      toast.error(t('verification_failed'))
                    } finally {
                      setVerifyingTotp(false)
                    }
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  {verifyingTotp ? t('verifying_code') : t('verify_code')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}