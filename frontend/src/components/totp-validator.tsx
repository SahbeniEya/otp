"use client";

import { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface StoredTOTP {
  secret: string;
  account_name: string;
  issuer: string;
}

export function TOTPValidator() {
  const { t } = useT();
  const [secret, setSecret] = useState('');
  const [account, setAccount] = useState('');
  const [issuer, setIssuer] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [windowSize, setWindowSize] = useState(1); // ± steps accepted

  useEffect(() => {
    try {
      const raw = localStorage.getItem('lastTOTP');
      if (raw) {
        const parsed: StoredTOTP = JSON.parse(raw);
        setSecret(parsed.secret);
        setAccount(parsed.account_name);
        setIssuer(parsed.issuer);
      }
    } catch {}
  }, []);

  const handleVerify = async () => {
    if (!secret || token.length !== 6) {
      toast.error(t('invalid_token'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/totp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, token, window: windowSize })
      });
      const data = await res.json();
      if (data.valid) {
        toast.success(t('totp_verified'));
        setToken('');
      } else {
        toast.error(data.message || t('invalid_token'));
      }
    } catch (e) {
      toast.error(t('verification_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-500">{t('totp_verify')}</CardTitle>
        <CardDescription>
          {t('enter_first_code')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm">{t('totp_code_label')}</Label>
          <Input
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="123456"
            maxLength={6}
            className="font-mono tracking-widest text-center text-lg"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('totp_window_hint')}</p>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">{t('totp_window_label')}</Label>
          <div className="flex items-center space-x-2">
            {[0,1,2].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setWindowSize(v)}
                className={`px-3 py-1 rounded border text-sm font-mono ${windowSize===v ? 'bg-purple-500 text-white border-purple-500' : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
              >±{v}</button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('totp_window_hint')}</p>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">{t('secret_editable')}</Label>
          <Input
            value={secret}
            onChange={(e) => setSecret(e.target.value.trim())}
            className="font-mono text-xs"
          />
          {account && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Compte: {account} — Issuer: {issuer}</p>
          )}
        </div>
        <Button
          disabled={loading || token.length !== 6}
          onClick={handleVerify}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
        >
          {loading ? t('verifying_action') : t('verify')}
        </Button>
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>{t('totp_explain_1')}</p>
          <p>{t('totp_explain_2')}</p>
          <p>{t('totp_explain_3')}</p>
        </div>
      </CardContent>
    </Card>
  );
}
