import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/chat');
    } else {
      alert('Error: Usa cualquier email, pero la contraseña debe ser "demo-token-12345" (o "password123")');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>Email:
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{width: '100%', padding: '0.5rem'}} />
        </label>
        <label>Password (Token):
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{width: '100%', padding: '0.5rem'}} />
        </label>
        <button type="submit" style={{ padding: '0.5rem', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>Entrar</button>
      </form>
    </div>
  );
};