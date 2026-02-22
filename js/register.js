// Модуль регистрации
import firebaseConfig from '../config/firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, query, where, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Класс для управления регистрацией пользователей
 */
export class RegisterModule {
    constructor() {
        this.auth = auth;
        this.db = db;
    }

    /**
     * Регистрирует нового пользователя
     * @param {string} username - Имя пользователя
     * @param {string} email - Email пользователя
     * @param {string} password - Пароль пользователя
     * @returns {Promise<UserCredential>} - Данные созданного пользователя
     */
    async register(username, email, password) {
        // Валидация входных данных
        if (!this.validateEmail(email)) {
            throw new Error('Некорректный формат email адреса');
        }

        const passwordValidation = this.validatePassword(password);
        if (!passwordValidation.valid) {
            throw new Error(passwordValidation.errors.join(', '));
        }

        if (!this.validateUsername(username)) {
            throw new Error('Имя пользователя: 3-20 символов, только буквы, цифры и _');
        }

        // Проверка доступности имени пользователя
        const isAvailable = await this.checkUsernameAvailability(username);
        if (!isAvailable) {
            throw new Error('Это имя пользователя уже занято');
        }

        try {
            // Создание аккаунта в Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            // Сохранение профиля пользователя в Firestore
            await setDoc(doc(this.db, 'users', user.uid), {
                username: username,
                email: email,
                createdAt: new Date(),
                lastLogin: new Date(),
                displayName: username
            });

            console.log('Успешная регистрация:', user.uid);
            return userCredential;
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
            throw error;
        }
    }

    /**
     * Валидирует email
     * @param {string} email - Email для валидации
     * @returns {boolean} - true если email валиден
     */
    validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Валидирует пароль
     * @param {string} password - Пароль для валидации
     * @returns {Object} - {valid: boolean, errors: string[]}
     */
    validatePassword(password) {
        const errors = [];

        if (!password || typeof password !== 'string') {
            return { valid: false, errors: ['Пароль обязателен'] };
        }

        if (password.length < 8) {
            errors.push('Пароль должен содержать минимум 8 символов');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Валидирует имя пользователя
     * @param {string} username - Имя пользователя для валидации
     * @returns {boolean} - true если имя валидно
     */
    validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return false;
        }
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    }

    /**
     * Проверяет доступность имени пользователя
     * @param {string} username - Имя пользователя
     * @returns {Promise<boolean>} - true если имя доступно
     */
    async checkUsernameAvailability(username) {
        try {
            const usersRef = collection(this.db, 'users');
            const q = query(usersRef, where('username', '==', username));
            const querySnapshot = await getDocs(q);
            
            // Если найдены документы с таким username, значит имя занято
            return querySnapshot.empty;
        } catch (error) {
            console.error('Ошибка при проверке доступности имени:', error);
            // В случае ошибки считаем, что имя доступно (чтобы не блокировать регистрацию)
            return true;
        }
    }
}

// Создание экземпляра модуля
const registerModule = new RegisterModule();

// Обработка формы регистрации
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        
        // Валидация в реальном времени
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', validatePasswordInput);
        }

        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.addEventListener('blur', validateUsernameInput);
        }

        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('blur', validateEmailInput);
        }
    }
});

async function handleRegister(event) {
    event.preventDefault();
    
    // Очистка предыдущих ошибок
    clearErrors();
    
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Регистрация...';
    
    try {
        // Регистрация через модуль
        await registerModule.register(username, email, password);
        
        // Автоматический вход после регистрации (требование 2.5)
        await signInWithEmailAndPassword(auth, email, password);
        
        // Перенаправление на dashboard
        window.location.href = 'dashboard.html';
    } catch (error) {
        handleRegisterError(error);
        submitButton.disabled = false;
        submitButton.textContent = 'Зарегистрироваться';
    }
}

function validatePasswordInput(event) {
    const password = event.target.value;
    const errorElement = document.getElementById('password-error');
    
    if (password.length > 0 && password.length < 8) {
        errorElement.textContent = 'Минимум 8 символов';
        errorElement.style.display = 'block';
    } else {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

async function validateUsernameInput(event) {
    const username = event.target.value.trim();
    const errorElement = document.getElementById('username-error');
    
    if (!username) {
        return;
    }
    
    if (!registerModule.validateUsername(username)) {
        errorElement.textContent = 'Имя пользователя: 3-20 символов, только буквы, цифры и _';
        errorElement.style.display = 'block';
        return;
    }
    
    // Проверка доступности
    const isAvailable = await registerModule.checkUsernameAvailability(username);
    if (!isAvailable) {
        errorElement.textContent = 'Это имя пользователя уже занято';
        errorElement.style.display = 'block';
    } else {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

function validateEmailInput(event) {
    const email = event.target.value.trim();
    const errorElement = document.getElementById('email-error');
    
    if (!email) {
        return;
    }
    
    if (!registerModule.validateEmail(email)) {
        errorElement.textContent = 'Введите корректный email адрес';
        errorElement.style.display = 'block';
    } else {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

function handleRegisterError(error) {
    const errorMessages = {
        'auth/email-already-in-use': 'Этот email уже зарегистрирован',
        'auth/invalid-email': 'Некорректный формат email адреса',
        'auth/weak-password': 'Пароль слишком слабый (минимум 8 символов)',
        'auth/operation-not-allowed': 'Регистрация временно недоступна'
    };
    
    let message = error.message;
    
    // Проверка на известные коды ошибок Firebase
    if (error.code && errorMessages[error.code]) {
        message = errorMessages[error.code];
    }
    
    // Отображение ошибки в соответствующем поле
    if (error.code && error.code.includes('email')) {
        const emailError = document.getElementById('email-error');
        emailError.textContent = message;
        emailError.style.display = 'block';
    } else if (error.code && error.code.includes('password')) {
        const passwordError = document.getElementById('password-error');
        passwordError.textContent = message;
        passwordError.style.display = 'block';
    } else if (message.includes('имя пользователя') || message.includes('username')) {
        const usernameError = document.getElementById('username-error');
        usernameError.textContent = message;
        usernameError.style.display = 'block';
    } else {
        // Общая ошибка
        const emailError = document.getElementById('email-error');
        emailError.textContent = message;
        emailError.style.display = 'block';
    }
    
    console.error('Ошибка регистрации:', error);
}

function clearErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.textContent = '';
        element.style.display = 'none';
    });
}

// Экспорт для использования в тестах
export { registerModule };
