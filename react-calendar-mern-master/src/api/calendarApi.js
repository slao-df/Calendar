// calendarApi.js
import axios from 'axios';
import { getEnvVariables } from '../helpers';

// 환경 변수에서 API URL 불러오기
const { VITE_API_URL } = getEnvVariables();

// Axios 인스턴스 생성
const calendarApi = axios.create({
  baseURL: VITE_API_URL,
});

// 요청 인터셉터 설정
calendarApi.interceptors.request.use((config) => {
  config.headers = {
    ...config.headers,
    'x-token': localStorage.getItem('token'), // 로컬 스토리지에 저장된 JWT 토큰 추가
  };

  return config;
});

export default calendarApi;
