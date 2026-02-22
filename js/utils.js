// Утилиты для приложения
// Будет расширен в задачах 5 и 9

// Утилита для задержки (используется в retry логике)
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Placeholder для fetchWithErrorHandling - будет реализовано в задаче 9
export async function fetchWithErrorHandling(url, options = {}) {
    const maxRetries = 3;
    const retryDelay = 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            if (attempt === maxRetries) {
                handleNetworkError(error);
                throw error;
            }
            
            await delay(retryDelay * attempt);
        }
    }
}

// Обработка сетевых ошибок
function handleNetworkError(error) {
    if (error.name === 'AbortError') {
        showErrorToast('Превышено время ожидания. Проверьте соединение');
    } else if (!navigator.onLine) {
        showErrorToast('Нет подключения к интернету');
    } else {
        showErrorToast('Ошибка соединения. Попробуйте позже');
    }
    console.error('Network Error:', error);
}

// Toast уведомления
export function showErrorToast(message) {
    showToast(message, 'error');
}

export function showSuccessToast(message) {
    showToast(message, 'success');
}

export function showInfoToast(message) {
    showToast(message, 'info');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Placeholder для FormValidator - будет реализовано в задаче 5
export class FormValidator {
    /**
     * Валидирует форму
     * @param {HTMLFormElement} form - Форма для валидации
     * @returns {Object} - {valid: boolean, errors: Object}
     */
    validate(form) {
        const errors = {};
        const formData = new FormData(form);
        
        // Получаем все поля формы
        const fields = form.querySelectorAll('input[required], textarea[required], select[required]');
        
        fields.forEach(field => {
            const fieldName = field.name;
            const fieldValue = formData.get(fieldName);
            
            // Проверка на пустое значение
            if (!fieldValue || fieldValue.trim() === '') {
                errors[fieldName] = `Поле "${field.placeholder || fieldName}" обязательно для заполнения`;
                return;
            }
            
            // Специфичная валидация по типу поля
            if (field.type === 'email') {
                if (!this.validateEmail(fieldValue)) {
                    errors[fieldName] = 'Введите корректный email адрес';
                }
            }
            
            if (field.type === 'password') {
                const minLength = field.getAttribute('minlength') || 8;
                if (fieldValue.length < minLength) {
                    errors[fieldName] = `Пароль должен содержать минимум ${minLength} символов`;
                }
            }
            
            // Проверка minlength
            if (field.hasAttribute('minlength')) {
                const minLength = parseInt(field.getAttribute('minlength'));
                if (fieldValue.length < minLength) {
                    errors[fieldName] = `Минимальная длина: ${minLength} символов`;
                }
            }
            
            // Проверка maxlength
            if (field.hasAttribute('maxlength')) {
                const maxLength = parseInt(field.getAttribute('maxlength'));
                if (fieldValue.length > maxLength) {
                    errors[fieldName] = `Максимальная длина: ${maxLength} символов`;
                }
            }
            
            // Проверка pattern
            if (field.hasAttribute('pattern')) {
                const pattern = new RegExp(field.getAttribute('pattern'));
                if (!pattern.test(fieldValue)) {
                    errors[fieldName] = field.getAttribute('title') || 'Неверный формат';
                }
            }
        });
        
        return {
            valid: Object.keys(errors).length === 0,
            errors: errors
        };
    }
    
    /**
     * Отображает ошибки валидации
     * @param {Object} errors - Объект с ошибками {fieldName: errorMessage}
     */
    displayErrors(errors) {
        // Сначала очищаем все предыдущие ошибки
        this.clearErrors();
        
        // Отображаем новые ошибки
        Object.keys(errors).forEach(fieldName => {
            const errorMessage = errors[fieldName];
            
            // Находим поле
            const field = document.querySelector(`[name="${fieldName}"]`);
            if (!field) return;
            
            // Добавляем класс ошибки к полю
            field.classList.add('error');
            
            // Находим или создаем элемент для отображения ошибки
            let errorElement = document.getElementById(`${fieldName}-error`);
            
            if (!errorElement) {
                // Создаем элемент ошибки, если его нет
                errorElement = document.createElement('span');
                errorElement.id = `${fieldName}-error`;
                errorElement.className = 'error-message';
                
                // Вставляем после поля
                field.parentNode.insertBefore(errorElement, field.nextSibling);
            }
            
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
        });
    }
    
    /**
     * Очищает все ошибки валидации
     */
    clearErrors() {
        // Удаляем класс ошибки со всех полей
        const errorFields = document.querySelectorAll('.error');
        errorFields.forEach(field => field.classList.remove('error'));
        
        // Скрываем все сообщения об ошибках
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(element => {
            element.textContent = '';
            element.style.display = 'none';
        });
    }
    
    /**
     * Валидирует email
     * @param {string} email - Email для валидации
     * @returns {boolean} - true если email валиден
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Валидирует поле в реальном времени
     * @param {HTMLInputElement} field - Поле для валидации
     */
    validateField(field) {
        const fieldName = field.name;
        const fieldValue = field.value;
        const errorElement = document.getElementById(`${fieldName}-error`);
        
        if (!errorElement) return;
        
        let errorMessage = '';
        
        // Проверка на пустое значение для обязательных полей
        if (field.hasAttribute('required') && (!fieldValue || fieldValue.trim() === '')) {
            errorMessage = 'Это поле обязательно для заполнения';
        }
        // Email валидация
        else if (field.type === 'email' && fieldValue && !this.validateEmail(fieldValue)) {
            errorMessage = 'Введите корректный email адрес';
        }
        // Минимальная длина
        else if (field.hasAttribute('minlength')) {
            const minLength = parseInt(field.getAttribute('minlength'));
            if (fieldValue.length > 0 && fieldValue.length < minLength) {
                errorMessage = `Минимальная длина: ${minLength} символов`;
            }
        }
        
        if (errorMessage) {
            field.classList.add('error');
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
        } else {
            field.classList.remove('error');
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }
}

// Логирование ошибок
export function logError(context, error) {
    console.error(`[${context}]`, {
        message: error.message,
        code: error.code,
        stack: error.stack,
        timestamp: new Date().toISOString()
    });
    
    // В продакшене будет отправка в Firebase Analytics
    // Будет реализовано в задаче 9
}
