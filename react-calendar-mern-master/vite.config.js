// 

// vite.config.js

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // --- 👇 이 부분을 추가하세요 ---
    proxy: {
      // '/api'로 시작하는 모든 요청을 target 주소로 전달합니다.
      '/api': {
        // [필수] 실제 백엔드 서버의 주소로 변경하세요.
        // GitHub 저장소를 보니 백엔드 포트가 4000으로 설정되어 있습니다.
        target: 'http://localhost:4000',
        // 출처(origin)를 target 주소로 변경하여 CORS 에러를 방지합니다.
        changeOrigin: true,
      }
    }
  }
})
