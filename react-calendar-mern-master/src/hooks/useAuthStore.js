import { useDispatch, useSelector } from "react-redux"
import  calendarApi  from "../api/calendarApi";
import { clearErrorMessage, onChecking, onLogin, onLogout, onLogoutCalendar  } from "../store";



export const useAuthStore = () => {

    const { status, user, errorMessage } = useSelector( state => state.auth );
    const dispatch = useDispatch(); 


    const startLogin = async({ email, password }) => {
       
            dispatch( onChecking() );

        try {
            //여기
            const { data } = await calendarApi.post('/auth', { email, password }); 
        
            localStorage.setItem('token', data.token );
            localStorage.setItem('token-init-date', new Date().getTime() );
            dispatch( onLogin({ name: data.name, uid: data.uid }) );
            
        } catch (error) {    
            
            
            dispatch( onLogout('잘못된 로그인 정보') );
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
            
        } catch (error) {
            dispatch( onLogout( error.response.data?.msg || '--' ) );
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
        dispatch (onLogoutCalendar());
        dispatch(onLogout());
    }



    return {
        //* 속성/특성

        errorMessage,
        status, 
        user, 




        //* 메서드
        checkAuthToken,
        startLogin,
        startRegister,
        startLogout,
    }
}