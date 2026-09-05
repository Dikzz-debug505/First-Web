(() => {
  const items = document.querySelectorAll('.japan-menu-item');
  if (!items.length) return;
  items.forEach((item, i) => {
    item.addEventListener('mouseenter', () => {
      items.forEach(x => x.classList.remove('is-hover'));
      item.classList.add('is-hover');
    });
    item.addEventListener('mouseleave', () => item.classList.remove('is-hover'));
  });
})();