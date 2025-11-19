// src/store/store.js

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';

// ❗️ 1. 'redux-persist/lib/storage' 대신 'session'을 임포트합니다.
// import storage from 'redux-persist/lib/storage'; // 👈 (기존 코드)
import storage from 'redux-persist/lib/storage/session'; // 👈 [수정] 이 코드로 변경

import { authSlice } from './auth/authSlice';
import { calendarSlice } from './calendar/calendarSlice';
// ... (다른 슬라이스 임포트)

// (combineReducers가 이미 분리되어 있을 수 있습니다)
const rootReducer = combineReducers({
  auth: authSlice.reducer,
  calendar: calendarSlice.reducer,
  // ...
});

const persistConfig = {
  key: 'root',
  storage, // ✅ 2. 여기서 'session' (sessionStorage)이 사용됩니다.
  // (선택) auth만 저장하고 싶다면:
  // whitelist: ['auth']
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer, // ✅ 3. persistReducer를 사용
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // (redux-persist와 함께 쓸 때 권장)
    }),
});

export const persistor = persistStore(store);