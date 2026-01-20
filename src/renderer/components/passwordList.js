import { renderPasswordItem } from './PasswordItem.js';

export function renderPasswordList(passwords) {
  const container = document.getElementById('list');
  container.innerHTML = '';

  passwords.forEach(p => {
    container.appendChild(renderPasswordItem(p));
  });
}
