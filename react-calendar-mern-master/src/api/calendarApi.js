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

export const updateCalendar = async (calendarId, calendarData) => {
    try {
        // PUT 요청으로 특정 ID의 캘린더 데이터를 업데이트합니다.
        const { data } = await calendarApi.put(`/calendars/${calendarId}`, calendarData);
        return data;
    } catch (error) {
        console.error('캘린더 업데이트 실패:', error);
        // 에러를 상위로 다시 던져서 호출한 컴포넌트에서 처리할 수 있게 합니다.
        throw error;
    }
};


export default calendarApi;
