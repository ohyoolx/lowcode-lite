import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppList } from './pages/AppList';
import { Editor } from './pages/Editor';
import { Playground } from './pages/Playground';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppList />} />
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/playground" element={<Playground />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  </React.StrictMode>
);
