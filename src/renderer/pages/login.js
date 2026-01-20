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
        const email = document.getElementById("l_email").value;
        const pass = document.getElementById("l_pass").value;
        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (e) {
            document.getElementById("error_box").innerText = e.message;
        }
    };
    document.getElementById("to_reg").onclick = onToRegister;
}