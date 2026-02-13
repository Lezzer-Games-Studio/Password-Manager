import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export function renderLogin(auth, onToRegister) {
    const root = document.getElementById("root");
    root.innerHTML = `
        <div class="auth-container">
            <div class="auth-card">
                <h1>Вхід</h1>
                <input id="l_email" type="email" placeholder="Електронна пошта">
                <input id="l_pass" type="password" placeholder="Пароль">
                <button id="btn_login">Увійти</button>
                <p style="color: var(--text-dim); margin-top: 20px;">
                    Немає акаунту? <a id="to_reg" style="color: var(--accent); cursor:pointer;">Створити</a>
                </p>
                <div id="error_box" class="error-text" style="color:red; margin-top:10px;"></div>
            </div>
        </div>
    `;

    document.getElementById("btn_login").onclick = async () => {
        const email = document.getElementById("l_email").value.trim();
        const pass = document.getElementById("l_pass").value; // пароль не тримимо, він може мати пробіли
        const errorBox = document.getElementById("error_box");
        const btn = document.getElementById("btn_login");

        if (!email || !pass) {
            errorBox.innerText = "Будь ласка, заповніть усі поля.";
            return;
        }

        try {
            btn.disabled = true;
            btn.innerText = "Вхід...";
            errorBox.innerText = ""; // очищуємо старі помилки

            await signInWithEmailAndPassword(auth, email, pass);
            
        } catch (e) {
            console.error("Firebase Login Error:", e.code);
            // Робимо помилку зрозумілішою для користувача
            if (e.code === 'auth/invalid-credential') {
                errorBox.innerText = "Неправильний email або пароль.";
            } else if (e.code === 'auth/too-many-requests') {
                errorBox.innerText = "Забагато спроб. Спробуйте пізніше.";
            } else {
                errorBox.innerText = "Помилка: " + e.message;
            }
        } finally {
            btn.disabled = false;
            btn.innerText = "Увійти";
        }
    };
    document.getElementById("to_reg").onclick = onToRegister;
}