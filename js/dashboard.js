// Модуль личного кабинета
import firebaseConfig from '../config/firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Класс для управления личным кабинетом
 */
class DashboardModule {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    /**
     * Инициализация модуля
     */
    async init() {
        // Проверяем аутентификацию при загрузке страницы
        await this.checkAuth();
        
        // Настраиваем обработчики событий
        this.setupEventListeners();
    }

    /**
     * Проверка аутентификации и защита страницы
     */
    async checkAuth() {
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    // Пользователь аутентифицирован
                    this.currentUser = user;
                    await this.loadUserData();
                    resolve(true);
                } else {
                    // Пользователь не аутентифицирован - перенаправляем на страницу входа
                    console.log('Пользователь не аутентифицирован, перенаправление на login.html');
                    window.location.href = './login.html';
                    resolve(false);
                }
            });
        });
    }

    /**
     * Загрузка данных пользователя из Firestore
     */
    async loadUserData() {
        try {
            if (!this.currentUser) {
                throw new Error('Пользователь не аутентифицирован');
            }

            // Получаем данные пользователя из Firestore
            const userDocRef = doc(db, 'users', this.currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                this.displayUserData(userData);
            } else {
                // Если документа нет, используем данные из Firebase Auth
                this.displayUserData({
                    username: this.currentUser.displayName || this.currentUser.email.split('@')[0],
                    email: this.currentUser.email
                });
            }
        } catch (error) {
            console.error('Ошибка загрузки данных пользователя:', error);
            
            // Показываем базовые данные из Firebase Auth
            this.displayUserData({
                username: this.currentUser.displayName || this.currentUser.email.split('@')[0],
                email: this.currentUser.email
            });
        }
    }

    /**
     * Отображение данных пользователя на странице
     * @param {Object} userData - Данные пользователя
     */
    displayUserData(userData) {
        // Отображаем имя пользователя в навигации
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = userData.username || userData.displayName || this.currentUser.email.split('@')[0];
        }

        // Отображаем данные в профиле
        const usernameElement = document.getElementById('user-username');
        if (usernameElement) {
            usernameElement.textContent = userData.username || userData.displayName || this.currentUser.email.split('@')[0];
        }

        const emailElement = document.getElementById('user-email');
        if (emailElement) {
            emailElement.textContent = this.currentUser.email || 'Не указано';
        }

        // Отображаем порядковый номер пользователя
        const uidElement = document.getElementById('user-created');
        if (uidElement) {
            uidElement.textContent = userData.userNumber || 'Не указано';
        }
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Обработчик кнопки выхода
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await auth.signOut();
                    window.location.href = './index.html';
                } catch (error) {
                    console.error('Ошибка выхода:', error);
                    showErrorToast('Не удалось выйти из аккаунта');
                }
            });
        }
    }
}

// Инициализация модуля при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new DashboardModule();
});

export default DashboardModule;
