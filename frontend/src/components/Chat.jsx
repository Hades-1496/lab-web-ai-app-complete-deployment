import { useState } from 'react';
import { getToken } from '../api/auth';

export const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);
    setError(null);

    // Placeholder vacío para la respuesta del asistente
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ message: userMsg, session_id: 'session-123' })
      });

      if (!response.ok) throw new Error('Error HTTP');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              
              setMessages((prev) => {
                const newArr = [...prev];
                const lastIdx = newArr.length - 1;
                newArr[lastIdx] = { ...newArr[lastIdx], content: newArr[lastIdx].content + data.replace(/\\n/g, '\n') };
                return newArr;
              });
            }
          }
        }
      }
    } catch (err) {
      setError('¡Error de conexión! Verifica que el backend esté ejecutándose.');
      setMessages((prev) => prev.slice(0, -1)); // Quita el placeholder de la IA si falla
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', background: '#fafafa' }}>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.role === 'user' ? 'right' : 'left', margin: '0.5rem 0' }}>
            <span style={{ padding: '0.5rem 1rem', borderRadius: '16px', display: 'inline-block', maxWidth: '70%', background: m.role === 'user' ? '#007bff' : '#e9ecef', color: m.role === 'user' ? 'white' : 'black' }}>{m.content}</span>
          </div>
        ))}
        {error && <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>}
      </div>
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
        <input style={{ flex: 1, padding: '0.5rem' }} value={input} onChange={(e) => setInput(e.target.value)} disabled={loading} placeholder="Escribe un mensaje..." />
        <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}>Enviar</button>
      </form>
    </div>
  );
};