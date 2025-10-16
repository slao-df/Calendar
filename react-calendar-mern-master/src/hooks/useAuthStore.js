// src/hooks/useAuthStore.js

import { useDispatch, useSelector } from 'react-redux';
import { calendarApi } from '../api';
import { clearErrorMessage, onChecking, onLogin, onLogout } from '../store/auth/authSlice';
// 👇 1. onLogoutCalendar를 import 합니다.
import { onLogoutCalendar } from '../store/calendar/calendarSlice';

export const useAuthStore = () => {
    const { status, user, errorMessage } = useSelector( state => state.auth );
    const dispatch = useDispatch();

    const startLogin = async({ email, password }) => {
        dispatch( onChecking() );
        try {
            const { data } = await calendarApi.post('/auth',{ email, password });
            localStorage.setItem('token', data.token );
            localStorage.setItem('token-init-date', new Date().getTime() );
            dispatch( onLogin({ name: data.name, uid: data.uid }) );
            
            // 👇 2. [핵심] 로그인 성공 직후, 앱의 '임시 캘린더 목록'을 비웁니다.
            // 이렇게 하면 CalendarPage가 로딩될 때 서버에서 최신 데이터를 다시 불러옵니다.
            dispatch( onLogoutCalendar() );

        } catch (error) {
            dispatch( onLogout('이메일 또는 비밀번호가 올바르지 않습니다.') );
            setTimeout(() => {
                dispatch( clearErrorMessage() );
            }, 10);
        }
    }

    const startRegister = async({ email, password, name }) => {
        dispatch( onChecking() );
        try {
            const { data } = await calendarApi.post('/auth/new',{ email, password, name });
            localStorage.setItem('token', data.token );
            localStorage.setItem('token-init-date', new Date().getTime() );
            dispatch( onLogin({ name: data.name, uid: data.uid }) );
            // 👇 회원가입 직후에도 임시 목록을 비워줍니다.
            dispatch( onLogoutCalendar() );
            
        } catch (error) {
            dispatch( onLogout(error.response.data?.msg || '--') );
            setTimeout(() => {
                dispatch( clearErrorMessage() );
            }, 10);
        }
    }

    const checkAuthToken = async() => {
        const token = localStorage.getItem('token');
        if ( !token ) return dispatch( onLogout() );

        try {
            const { data } = await calendarApi.get('auth/renew');
            localStorage.setItem('token', data.token );
            localStorage.setItem('token-init-date', new Date().getTime() );
            dispatch( onLogin({ name: data.name, uid: data.uid }) );
        } catch (error) {
            localStorage.clear();
            dispatch( onLogout() );
        }
    }

    const startLogout = () => {
        localStorage.clear();
        dispatch( onLogoutCalendar() );
        dispatch( onLogout() );
    }


    return {
        //* Propiedades
        errorMessage,
        status, 
        user, 

        //* Métodos
        checkAuthToken,
        startLogin,
        startLogout,
        startRegister,
    }
}
