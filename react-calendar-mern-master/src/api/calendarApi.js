import axios from 'axios';
import { getEnvVariables } from '../helpers';

const { VITE_API_URL } = getEnvVariables()




const calendarApi = axios.create({
    baseURL: VITE_API_URL
});

// 인터셉터 설정 (모든 요청에 토큰을 담아 보내는 로직)
calendarApi.interceptors.request.use( config => {

    config.headers = {
        ...config.headers,
        'x-token':  localStorage.getItem('token')
    }

    return config;
})


export default calendarApi;
