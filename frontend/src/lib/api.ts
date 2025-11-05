// Provide a robust fallback for local development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export interface GenerateOTPResponse {
  id: string;
  ttl: number;
  expires_at: string;
  email_sent?: boolean;
  email_message?: string;
  email_error?: string;
}

export interface VerifyOTPResponse {
  valid: boolean;
  success: boolean;
  reason: string;
  message: string;
}

export interface TOTPSetupResponse {
  secret: string;
  uri: string;
  qr_code: string;
  account_name: string;
  issuer: string;
}

export const api = {
  generateOTP: async (data: {
    email: string;
    type?: 'numeric' | 'alphanumeric' | 'alphabet';
    length?: number;
    ttl?: number;
    organization?: string;
    subject?: string;
  }): Promise<GenerateOTPResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/otp/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate OTP');
    }

    return response.json();
  },

  verifyOTP: async (data: {
    otp_id: string;
    otp: string;
    email?: string;
  }): Promise<VerifyOTPResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to verify OTP');
    }

    return response.json();
  },

  setupTOTP: async (data: {
    account_name: string;
    issuer?: string;
  }): Promise<TOTPSetupResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/totp/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to setup TOTP');
    }

    return response.json();
  },

  verifyTOTP: async (data: {
    secret: string;
    token: string;
    window?: number;
  }): Promise<VerifyOTPResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/totp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to verify TOTP');
    }

    return response.json();
  },
};
