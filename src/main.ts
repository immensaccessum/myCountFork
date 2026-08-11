import './styles/main.css';
import { App } from './app';
import { detectLang } from './lib/url-state';

const path = location.pathname;
if (path === '/' || path === '') {
  location.replace('/ru/' + location.search);
} else {
  const appRoot = document.getElementById('app');
  if (appRoot) {
  // Support /ru/ and /en/ paths
    if (!path.startsWith('/ru') && !path.startsWith('/en')) {
      const lang = detectLang(path);
      location.replace(`/${lang}/` + location.search);
    } else {
      new App(appRoot);
    }
  }
}
