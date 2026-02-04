import React from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import App from './App.tsx';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);