// src/hooks/useForm.js
import { useEffect, useMemo, useState } from 'react';

// 🔹 폼 입력 및 유효성 검사용 커스텀 훅
export const useForm = (initialForm = {}, formValidations = {}) => {
  const [formState, setFormState] = useState(initialForm);
  const [formValidation, setFormValidation] = useState({});

  // ✅ 1. 최초 1회 또는 initialForm 변경 시에만 실행
  useEffect(() => {
    setFormState(initialForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ 딱 한 번만 실행

  // ✅ 2. formState가 바뀔 때만 유효성 검사 실행
  useEffect(() => {
    if (!formValidations || Object.keys(formValidations).length === 0) return;

    const formCheckedValues = {};

    for (const field of Object.keys(formValidations)) {
      const [fn, errorMessage] = formValidations[field];
      formCheckedValues[`${field}Valid`] = fn(formState[field])
        ? null
        : errorMessage;
    }

    // ⚙️ 변경된 경우에만 setState (렌더링 무한 반복 방지)
    setFormValidation((prev) => {
      const prevStr = JSON.stringify(prev);
      const newStr = JSON.stringify(formCheckedValues);
      return prevStr === newStr ? prev : formCheckedValues;
    });
  }, [formState]); // ✅ formState가 바뀔 때만 검사

  // ✅ 3. 전체 유효성 검사
  const isFormValid = useMemo(() => {
    return Object.values(formValidation).every((v) => v === null);
  }, [formValidation]);

  // ✅ 4. 입력 값 변경
  const onInputChange = ({ target }) => {
    const { name, value } = target;
    setFormState({
      ...formState,
      [name]: value,
    });
  };

  // ✅ 5. 초기화
  const onResetForm = () => {
    setFormState(initialForm);
  };

  return {
    ...formState,
    formState,
    onInputChange,
    onResetForm,
    ...formValidation,
    isFormValid,
  };
};
