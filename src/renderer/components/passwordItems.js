export function renderPasswordItem(item) {
  const div = document.createElement('div');
  div.className = 'password-item';

  div.innerHTML = `
    <strong>${item.title}</strong>
    <button class="copy">Copy</button>
  `;

  div.querySelector('.copy').onclick = () => {
    window.api.copyPassword(item.id);
  };

  return div;
}
