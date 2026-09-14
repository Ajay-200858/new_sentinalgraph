import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '../config/api';

export interface FormattedApiError {
  statusCode: number;
  message: string;
  originalError?: any;
}

// Reusable Axios Instance for SentinelGraph Backend API
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Centralized Axios Response Interceptor & Error Translation
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    let statusCode = 500;
    let userFriendlyMessage = 'An unexpected system error occurred.';

    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        statusCode = 408;
        userFriendlyMessage = 'Request Timeout: Backend did not respond within 10 seconds.';
      } else {
        statusCode = 0;
        userFriendlyMessage = 'Network Error: Unable to connect to SentinelGraph backend service.';
      }
    } else {
      statusCode = error.response.status;
      const serverMessage = (error.response.data as any)?.message;

      switch (statusCode) {
        case 400:
          userFriendlyMessage = serverMessage || 'Bad Request: Invalid parameters provided.';
          break;
        case 401:
          userFriendlyMessage = serverMessage || 'Unauthorized: Session credentials missing or expired.';
          break;
        case 403:
          userFriendlyMessage = serverMessage || 'Forbidden: Access denied to security telemetry resource.';
          break;
        case 404:
          userFriendlyMessage = serverMessage || 'Not Found: The requested endpoint or host resource was not found.';
          break;
        case 500:
        default:
          userFriendlyMessage = serverMessage || 'Server Error: Internal SentinelGraph backend processing error.';
          break;
      }
    }

    const formattedError: FormattedApiError = {
      statusCode,
      message: userFriendlyMessage,
      originalError: error.response?.data || error.message,
    };

    console.error(`[SentinelGraph API ${statusCode}]:`, userFriendlyMessage);
    return Promise.reject(formattedError);
  }
);

// Typed Helper Methods
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then((res) => res.data),
};
