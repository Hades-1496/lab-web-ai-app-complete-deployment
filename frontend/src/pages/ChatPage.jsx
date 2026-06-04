import { Chat } from '../components/Chat';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const ChatPage = () => {
  const { logout } = useContext(AuthContext);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '90vh', maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Agente IA</h2>
        <button onClick={logout} style={{ padding: '0.5rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cerrar Sesión</button>
      </header>
      <Chat />
    </div>
  );
};