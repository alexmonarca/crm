import React from 'react';
import ReactDOM from 'react-dom/client';
// IMPORTAÇÃO DO SEU COMPONENTE:
import App from './ChatwootCRMSimulator.jsx'; 
// Necessário para o Tailwind CSS ser aplicado
import './index.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

