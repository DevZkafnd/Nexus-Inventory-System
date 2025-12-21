import React, { useState, useRef, useMemo } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useAuth } from '../context/AuthContext';
import SequentialText from '../components/SequentialText';
import LiquidEther from '../components/LiquidEther';

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password)
  }
`;

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const containerRef = useRef(null);

  const [loginMutation, { loading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      login(data.login);
    },
    onError: (error) => {
      setErrorMsg(error.message || 'Login gagal');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    loginMutation({ variables: { email, password } });
  };

  const liquidColors = useMemo(() => ['#000000', '#172554', '#60A5FA'], []);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4 relative overflow-hidden cursor-crosshair">
      {/* Background Animation */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <LiquidEther 
            colors={liquidColors} 
            mouseForce={100} 
            cursorSize={15} 
            isViscous={false} 
            iterationsViscous={16} 
            iterationsPoisson={16} 
            resolution={0.35} 
            isBounce={false} 
            autoDemo={true} 
            autoSpeed={0.5} 
            autoIntensity={2.2} 
            takeoverDuration={0.25} 
            autoResumeDelay={1000} 
            autoRampDuration={0.6} 
        />
        <div className="absolute inset-0 bg-grid-pattern pointer-events-none"></div>
      </div>

      <div className="text-center mb-8 max-w-2xl relative z-10" ref={containerRef} style={{position: 'relative'}}>
        {/* Tech Frame & Scanner */}
        <div className="tech-corners">
          <div className="tech-corners-inner"></div>
        </div>
        <div className="scan-beam"></div>

        <SequentialText 
          text="Halo, Selamat Datang di Aplikasi"
          className="text-4xl text-white block font-[1000] [font-variation-settings:'wght'_1000,'opsz'_40]"
          splitDelay={50}
          containerRef={containerRef}
          fromFontVariationSettings="'wght' 1000, 'opsz' 40" 
          toFontVariationSettings="'wght' 400, 'opsz' 9" 
        />
        <SequentialText 
          text="Dashboard Admin Nexus Inventory"
          className="text-4xl text-white mb-4 block font-[1000] [font-variation-settings:'wght'_1000,'opsz'_40]"
          splitDelay={100}
          containerRef={containerRef}
          fromFontVariationSettings="'wght' 1000, 'opsz' 40" 
          toFontVariationSettings="'wght' 400, 'opsz' 9" 
        />
        
        <div className="text-lg text-gray-300 block mt-4">
            <SequentialText 
                text="Silahkan login terlebih dahulu"
                className="text-lg text-gray-300 [font-variation-settings:'wght'_400,'opsz'_9]"
                splitDelay={200}
                containerRef={containerRef}
                fromFontVariationSettings="'wght' 400, 'opsz' 9" 
                toFontVariationSettings="'wght' 1000, 'opsz' 40" 
            />
        </div>
      </div>

      <div className="bg-barcode-white p-8 rounded-lg w-full max-w-md relative z-10 overflow-hidden">
        {/* Decorative Barcode Strip Top */}
        <div className="absolute top-0 left-0 w-full barcode-strip"></div>
        
        {errorMsg && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            <span className="block sm:inline">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative z-10">
          <div className="mb-6 input-group">
            <label className="block text-gray-700 text-sm font-bold mb-2 uppercase tracking-wider" htmlFor="email">
              ID AKSES (EMAIL)
            </label>
            <input
              className="input-field appearance-none bg-transparent border-none w-full py-3 px-3 text-gray-800 leading-tight focus:outline-none placeholder-gray-400"
              id="email"
              type="email"
              placeholder="PINDAI ID ATAU MASUKKAN EMAIL"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="input-scanner-line"></div>
            <div className="input-scanner-active"></div>
            <div className="input-scan-beam"></div>
          </div>
          
          <div className="mb-8 input-group">
            <label className="block text-gray-700 text-sm font-bold mb-2 uppercase tracking-wider" htmlFor="password">
              KODE KEAMANAN (KATA SANDI)
            </label>
            <input
              className="input-field appearance-none bg-transparent border-none w-full py-3 px-3 text-gray-800 leading-tight focus:outline-none placeholder-gray-400"
              id="password"
              type="password"
              placeholder="••••••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="input-scanner-line"></div>
            <div className="input-scanner-active"></div>
            <div className="input-scan-beam"></div>
          </div>

          <div className="flex items-center justify-between mt-8">
            <button
              className={`bg-gray-900 hover:bg-black text-white font-bold py-3 px-6 rounded-sm w-full focus:outline-none focus:shadow-outline transition-all duration-300 relative overflow-hidden group ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              type="submit"
              disabled={loading}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? 'MEMVERIFIKASI...' : 'AKSES SISTEM'}
              </span>
              <div className="absolute inset-0 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 z-0"></div>
            </button>
          </div>
        </form>
        
        {/* Decorative Barcode Strip Bottom */}
        <div className="absolute bottom-0 left-0 w-full barcode-strip transform rotate-180"></div>
      </div>
    </div>
  );
}

export default Login;
