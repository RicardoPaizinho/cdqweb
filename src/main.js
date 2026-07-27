import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import './assets/styles/variables.css';
import './assets/styles/theme.css'

const app = createApp(App)

// Desabilita avisos de dev no console
app.config.warnHandler = () => null

if (process.env.NODE_ENV === 'production') {
  app.config.performance = false
}

app.mount('#app')

//createApp(App).mount('#app')
