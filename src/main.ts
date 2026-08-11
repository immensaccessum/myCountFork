import './styles/main.css';
import { App } from './app';

const path = location.pathname;
if (path === '/' || path === '') {
  location.replace('/ru/' + location.search);
} else {
  const appRoot = document.getElementById('app');
  if (appRoot) {
    const isAppPath =
      path.startsWith('/ru') ||
      path.startsWith('/en') ||
      path.startsWith('/do/') ||
      path.startsWith('/until/');
    if (!isAppPath) {
      location.replace('/ru/' + location.search);
    } else {
      new App(appRoot);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }
    }
  }
}
