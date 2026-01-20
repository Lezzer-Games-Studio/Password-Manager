import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Глобальный объект для хранения текущего пользователя
let currentUser = null;

// Упрощенная версия навигации без динамических импортов для скорости
window.navigation = {
    showProfile: async (user) => {
        currentUser = user || currentUser;
        try {
            const { renderProfile } = await import('./pages/profile.js');
            renderProfile(currentUser, auth, db, 
                () => window.navigation.showVault(),
                () => window.navigation.showSettings(),
                () => window.navigation.showSubscribe()
            );
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    },
    
    showVault: async (user) => {
        const targetUser = user || currentUser;
        if (!targetUser) {
            console.error('No user found for vault');
            return;
        }
        try {
            const { renderVault } = await import('./pages/vault.js');
            renderVault(targetUser, auth, db,
                () => window.navigation.showProfile(),
                () => window.navigation.showSettings()
            );
        } catch (error) {
            console.error('Error loading vault:', error);
        }
    },
    
    showSettings: async (user) => {
        const targetUser = user || currentUser;
        if (!targetUser) {
            console.error('No user found for settings');
            return;
        }
        try {
            const { renderSettings } = await import('./pages/settings.js');
            renderSettings(targetUser, auth, db,
                () => window.navigation.showProfile(),
                () => window.navigation.showVault(),
                () => window.navigation.showSubscribe()
            );
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    },
    
    showSubscribe: async (user) => {
        const targetUser = user || currentUser;
        if (!targetUser) {
            console.error('No user found for subscribe');
            return;
        }
        try {
            const { renderSubscribe } = await import('./pages/subscribe.js');
            // Передаем все необходимые функции навигации
            renderSubscribe(targetUser, auth, db,
                () => window.navigation.showProfile(),
                () => window.navigation.showProfile(),  // onToProfile
                () => window.navigation.showVault(),    // onToVault
                () => window.navigation.showSettings()  // onToSettings
            );
        } catch (error) {
            console.error('Error loading subscribe:', error);
        }
    },
    
    showLogin: async () => {
        try {
            const { renderLogin } = await import('./pages/login.js');
            renderLogin(auth, 
                () => window.navigation.showRegister()
            );
        } catch (error) {
            console.error('Error loading login:', error);
        }
    },
    
    showRegister: async () => {
        try {
            const { renderRegister } = await import('./pages/register.js');
            renderRegister(auth, db,
                () => window.navigation.showLogin()
            );
        } catch (error) {
            console.error('Error loading register:', error);
        }
    }
};

// Проверка авторизации
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Сохраняем пользователя
        currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
        };
        
        // Сохраняем в localStorage
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Показываем загрузку
        document.getElementById('root').innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100vh; color:var(--text-dim);">
                <div style="text-align:center;">
                    <div style="width:50px; height:50px; border:3px solid var(--accent); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 15px;"></div>
                    <p>Завантаження...</p>
                </div>
            </div>
        `;
        
        // Загружаем профиль с небольшой задержкой для UX
        setTimeout(() => {
            window.navigation.showProfile(currentUser);
        }, 300);
        
    } else {
        // Очищаем
        currentUser = null;
        localStorage.removeItem('currentUser');
        
        // Показываем логин
        window.navigation.showLogin();
    }
});

// CSS для анимации загрузки
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// ... твій існуючий код (Firebase, навігація тощо) ...

// ЛОГІКА ОНОВЛЕННЯ ДЛЯ КОРИСТУВАЧА
if (window.electronAPI) {
    // 1. Повідомляємо, що знайшли оновлення
    window.electronAPI.onUpdateAvailable((version) => {
        console.log(`Знайдено оновлення: ${version}`);
        // Можна показати плашку в UI
        alert(`Доступна нова версія ${version}. Завантаження почалося...`);
    });

    // 2. Коли все готово — пропонуємо перезавантажити
    window.electronAPI.onUpdateDownloaded(() => {
        const userConfirmed = confirm("Оновлення завантажено! Перезапустити програму зараз?");
        if (userConfirmed) {
            window.electronAPI.restartApp();
        }
    });
}