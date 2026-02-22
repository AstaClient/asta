// Модуль аутентификации
// Реализует функциональность входа, выхода и управления сессиями

import firebaseConfig from '../config/firebase-config.js';

// Импорт Firebase SDK
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/**
 * Класс для управления аутентификацией пользователей
 * Валидирует: Требования 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.4, 7.5
 */
class AuthModule {
  constructor() {
    this.auth = auth;
    this.currentUser = null;
  }

  /**
   * Выполняет вход пользователя
   * @param {string} email - Email пользователя
   * @param {string} password - Пароль пользователя
   * @returns {Promise<UserCredential>} - Данные пользователя
   * Валидирует: Требования 1.1, 1.2
   */
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      this.currentUser = userCredential.user;
      
      // Сохранение сессии
      this.saveSession(userCredential.user);
      
      return userCredential;
    } catch (error) {
      console.error('Ошибка входа:', error);
      throw error;
    }
  }

  /**
   * Выполняет выход пользователя
   * @returns {Promise<void>}
   * Валидирует: Требование 1.5
   */
  async logout() {
    try {
      await signOut(this.auth);
      this.currentUser = null;
      
      // Очистка сессии
      localStorage.removeItem('authToken');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('sessionExpiry');
      
      // Перенаправление на главную страницу
      window.location.href = './index.html';
    } catch (error) {
      console.error('Ошибка выхода:', error);
      throw error;
    }
  }

  /**
   * Проверяет состояние аутентификации
   * @returns {Promise<User|null>} - Текущий пользователь или null
   * Валидирует: Требование 1.3
   */
  async getCurrentUser() {
    return new Promise((resolve) => {
      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
        resolve(user);
      });
    });
  }

  /**
   * Сохраняет сессию пользователя
   * @param {User} user - Объект пользователя
   * Валидирует: Требования 1.3, 7.4
   */
  saveSession(user) {
    if (!user) {
      return;
    }

    // Получение токена из Firebase
    user.getIdToken().then((token) => {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userEmail', user.email);
      
      // Установка времени истечения сессии (1 час)
      const expiryTime = Date.now() + (60 * 60 * 1000);
      localStorage.setItem('sessionExpiry', expiryTime.toString());
    }).catch((error) => {
      console.error('Ошибка сохранения токена:', error);
    });
  }

  /**
   * Проверяет валидность сессии
   * @returns {boolean} - true если сессия валидна
   * Валидирует: Требование 7.5
   */
  isSessionValid() {
    const token = localStorage.getItem('authToken');
    const expiryTime = localStorage.getItem('sessionExpiry');
    
    if (!token || !expiryTime) {
      return false;
    }
    
    // Проверка истечения времени
    const now = Date.now();
    const expiry = parseInt(expiryTime, 10);
    
    if (now >= expiry) {
      // Сессия истекла, очистка данных
      localStorage.removeItem('authToken');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('sessionExpiry');
      return false;
    }
    
    return true;
  }
}

// Создание экземпляра модуля
const authModule = new AuthModule();

// Обработка формы входа
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
});

/**
 * Обработчик отправки формы входа
 * @param {Event} event - Событие отправки формы
 */
async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  // Очистка предыдущих ошибок
  clearErrors();
  
  try {
    await authModule.login(email, password);
    
    // Перенаправление на dashboard
    window.location.href = './dashboard.html';
  } catch (error) {
    handleAuthError(error);
  }
}

/**
 * Обработчик ошибок аутентификации
 * @param {Error} error - Объект ошибки Firebase
 * Валидирует: Требование 1.2
 */
function handleAuthError(error) {
  const errorMessages = {
    'auth/invalid-email': 'Некорректный формат email адреса',
    'auth/user-disabled': 'Ваш аккаунт заблокирован. Обратитесь к администратору',
    'auth/user-not-found': 'Пользователь с таким email не найден',
    'auth/wrong-password': 'Неверный пароль',
    'auth/invalid-credential': 'Неверные учетные данные',
    'auth/too-many-requests': 'Слишком много попыток входа. Попробуйте позже'
  };
  
  const message = errorMessages[error.code] || 'Произошла ошибка при входе';
  
  // Отображение ошибки
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  
  if (error.code === 'auth/invalid-email') {
    if (emailError) emailError.textContent = message;
  } else {
    if (passwordError) passwordError.textContent = message;
  }
  
  console.error('Ошибка аутентификации:', error);
}

/**
 * Очищает сообщения об ошибках
 */
function clearErrors() {
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  
  if (emailError) emailError.textContent = '';
  if (passwordError) passwordError.textContent = '';
}

// Экспорт модуля для использования в других файлах
export default authModule;
