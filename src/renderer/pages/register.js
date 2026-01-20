import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function renderRegister(auth, db, onToLogin) {
    const root = document.getElementById("root");
    
    root.innerHTML = `
        <div class="auth-container">
            <div class="auth-card">
                <h1>Реєстрація</h1>
                <p style="color: var(--text-dim); font-size: 14px; margin-bottom: 20px;">Створіть свій безпечний сейф</p>
                
                <input id="r_email" type="email" placeholder="Ваш Email">
                <input id="r_pass" type="password" placeholder="Придумайте пароль">
                
                <button id="btn_reg">Зареєструватися</button>
                
                <p style="color: var(--text-dim); margin-top: 20px;">
                    Вже є акаунт? <a id="to_login" style="color: var(--accent); cursor:pointer; font-weight: 600;">Увійти</a>
                </p>
                
                <div id="reg_error" class="error-text" style="color:#ef4444; margin-top:15px; font-size: 13px;"></div>
            </div>
        </div>
    `;

    document.getElementById("btn_reg").onclick = async () => {
        const email = document.getElementById("r_email").value;
        const pass = document.getElementById("r_pass").value;
        const errorBox = document.getElementById("reg_error");

        // Очищаємо помилку перед спробою
        errorBox.innerText = "";

        if (!email || !pass) {
            errorBox.innerText = "Будь ласка, заповніть всі поля";
            return;
        }

        if (pass.length < 6) {
            errorBox.innerText = "Пароль має бути не менше 6 символів";
            return;
        }

        try {
            // 1. Створюємо користувача в Firebase Authentication
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            const user = res.user;

            // 2. Створюємо документ у колекції "users" в Firestore
            // Саме цей крок створить вашу базу користувачів
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: email,
                createdAt: Date.now(),
                plan: "free",    // Початковий план
                expiresAt: 0     // Підписка ще не активована
            });

            console.log("Користувача зареєстровано та додано в базу!");

        } catch (e) {
            console.error("Помилка реєстрації:", e);
            // Виводимо зрозумілі помилки
            if (e.code === 'auth/email-already-in-use') {
                errorBox.innerText = "Цей Email вже використовується";
            } else {
                errorBox.innerText = e.message;
            }
        }
    };

    document.getElementById("to_login").onclick = onToLogin;
}