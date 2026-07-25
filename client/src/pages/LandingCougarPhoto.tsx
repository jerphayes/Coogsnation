export default function Landing() {
  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      margin: 0,
      padding: 0,
      backgroundColor: '#f8f8f8',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        backgroundColor: '#ffffff'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center'
        }}>
          <svg width="80" height="80" viewBox="0 0 100 100">
            <rect x="10" y="15" width="15" height="70" fill="#B91C1C"/>
            <rect x="30" y="35" width="15" height="50" fill="#B91C1C"/>
            <rect x="50" y="15" width="15" height="30" fill="#B91C1C"/>
            <rect x="50" y="55" width="15" height="30" fill="#B91C1C"/>
            <rect x="70" y="35" width="15" height="50" fill="#B91C1C"/>
          </svg>
        </div>
      </header>

      {/* Hero Section with Cougar Photo */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '400px',
        backgroundImage: 'linear-gradient(135deg, #228B22 0%, #32CD32 30%, #90EE90 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}>
        {/* Campus Background Elements */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #228B22 0%, #32CD32 30%, #90EE90 100%)',
          opacity: 0.8
        }}></div>
        
        {/* Building silhouettes */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '10%',
          width: '80px',
          height: '120px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '4px 4px 0 0'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: 0,
          right: '10%',
          width: '60px',
          height: '100px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '4px 4px 0 0'
        }}></div>

        {/* WHOSE HOUSE? Text */}
        <h1 style={{
          position: 'relative',
          fontSize: '4rem',
          fontWeight: 'bold',
          color: '#B91C1C',
          margin: '0 0 1rem 0',
          transform: 'rotate(-8deg)',
          letterSpacing: '0.1em',
          textShadow: '3px 3px 6px rgba(0,0,0,0.5)',
          zIndex: 3
        }}>WHOSE HOUSE?</h1>

        {/* Cougar Statue */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          margin: '1rem 0'
        }}>
          <svg width="300" height="200" viewBox="0 0 400 250">
            {/* Pedestal/Base */}
            <rect x="100" y="200" width="200" height="40" fill="#A0A0A0" stroke="#666" strokeWidth="2"/>
            <rect x="90" y="240" width="220" height="10" fill="#888" stroke="#666" strokeWidth="1"/>
            
            {/* Cougar body - bronze/golden color */}
            <defs>
              <linearGradient id="cougarBronze" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#CD7F32', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: '#B8860B', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#8B4513', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            
            {/* Main body */}
            <ellipse cx="200" cy="180" rx="100" ry="30" fill="url(#cougarBronze)" stroke="#654321" strokeWidth="2"/>
            
            {/* Chest */}
            <ellipse cx="160" cy="165" rx="35" ry="25" fill="url(#cougarBronze)" stroke="#654321" strokeWidth="2"/>
            
            {/* Head */}
            <ellipse cx="130" cy="140" rx="40" ry="35" fill="url(#cougarBronze)" stroke="#654321" strokeWidth="2"/>
            
            {/* Ears */}
            <ellipse cx="110" cy="115" rx="8" ry="15" fill="url(#cougarBronze)" stroke="#654321" strokeWidth="1"/>
            <ellipse cx="150" cy="115" rx="8" ry="15" fill="url(#cougarBronze)" stroke="#654321" strokeWidth="1"/>
            <ellipse cx="110" cy="118" rx="4" ry="8" fill="#654321"/>
            <ellipse cx="150" cy="118" rx="4" ry="8" fill="#654321"/>
            
            {/* Eyes - golden/amber */}
            <ellipse cx="120" cy="135" rx="6" ry="8" fill="#FFD700" stroke="#654321" strokeWidth="1"/>
            <ellipse cx="140" cy="135" rx="6" ry="8" fill="#FFD700" stroke="#654321" strokeWidth="1"/>
            <ellipse cx="120" cy="135" rx="3" ry="6" fill="#654321"/>
            <ellipse cx="140" cy="135" rx="3" ry="6" fill="#654321"/>
            <ellipse cx="121" cy="133" rx="1" ry="2" fill="#FFD700"/>
            <ellipse cx="141" cy="133" rx="1" ry="2" fill="#FFD700"/>
            
            {/* Nose */}
            <path d="M 125 145 L 135 145 L 130 155 Z" fill="#654321"/>
            
            {/* Mouth area */}
            <ellipse cx="130" cy="160" rx="15" ry="8" fill="#CD7F32" stroke="#654321" strokeWidth="1"/>
            
            {/* Mouth line */}
            <path d="M 120 160 Q 130 165 140 160" stroke="#654321" strokeWidth="2" fill="none"/>
            
            {/* Whiskers */}
            <line x1="95" y1="140" x2="110" y2="145" stroke="#654321" strokeWidth="1"/>
            <line x1="95" y1="150" x2="110" y2="150" stroke="#654321" strokeWidth="1"/>
            <line x1="150" y1="145" x2="165" y2="140" stroke="#654321" strokeWidth="1"/>
            <line x1="150" y1="150" x2="165" y2="150" stroke="#654321" strokeWidth="1"/>
            
            {/* Front paws */}
            <ellipse cx="170" cy="195" rx="10" ry="15" fill="url(#cougarBronze)" stroke="#654321" strokeWidth="2"/>
            <ellipse cx="190" cy="195" rx="10" ry="15" fill="url(#cougarBronze)" stroke="#654321" strokeWidth="2"/>
            
            {/* Back paws */}
            <ellipse cx="230" cy="195" rx="12" ry="15" fill="url(#cougarBronze)" stroke="#654321" strokeWidth="2"/>
            <ellipse cx="250" cy="195" rx="10" ry="15" fill="url(#cougarBronze)" stroke="#654321" strokeWidth="2"/>
            
            {/* Tail curved upward */}
            <path d="M 300 175 Q 320 160 330 140 Q 335 125 330 110" stroke="#654321" strokeWidth="4" fill="none" strokeLinecap="round"/>
            <path d="M 300 175 Q 320 160 330 140 Q 335 125 330 110" stroke="url(#cougarBronze)" strokeWidth="3" fill="none" strokeLinecap="round"/>
            
            {/* Muscle definition */}
            <path d="M 180 155 Q 200 160 220 155" stroke="#654321" strokeWidth="1" fill="none"/>
            <path d="M 170 175 Q 190 180 210 175" stroke="#654321" strokeWidth="1" fill="none"/>
          </svg>
        </div>

        {/* COOGS' HOUSE! Text */}
        <h2 style={{
          position: 'relative',
          fontSize: '4rem',
          fontWeight: 'bold',
          color: '#B91C1C',
          margin: '1rem 0 0 0',
          letterSpacing: '0.1em',
          textShadow: '3px 3px 6px rgba(0,0,0,0.5)',
          zIndex: 3
        }}>COOGS' HOUSE!</h2>
      </div>

      {/* Welcome Section */}
      <div style={{
        textAlign: 'center',
        padding: '3rem 2rem',
        backgroundColor: '#ffffff'
      }}>
        <h3 style={{
          fontSize: '2rem',
          color: '#333333',
          margin: '0 0 1rem 0',
          fontWeight: 'normal'
        }}>Welcome to CoogsNation.com</h3>

        <p style={{
          fontSize: '1.2rem',
          color: '#666666',
          margin: '0 0 2rem 0'
        }}>The online community for University of Houston fans.</p>

        <button 
          onClick={() => window.location.href = '/api/login'}
          style={{
            backgroundColor: '#B91C1C',
            color: 'white',
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
          }}
        >Get Started</button>
      </div>

      {/* Bottom Section */}
      <div style={{
        display: 'flex',
        padding: '2rem',
        backgroundColor: '#f8f8f8',
        gap: '2rem',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Community Forums */}
        <div style={{
          flex: '1',
          minWidth: '300px',
          maxWidth: '400px'
        }}>
          <h4 style={{
            fontSize: '1.3rem',
            color: '#333333',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ color: '#B91C1C' }}>💬</span> Community Forums
          </h4>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: '0.5rem',
            fontSize: '0.9rem',
            marginBottom: '1rem'
          }}>
            <div style={{ fontWeight: 'bold', color: '#333' }}>Forum Topics</div>
            <div style={{ fontWeight: 'bold', color: '#333', textAlign: 'center' }}>Form</div>
            <div style={{ fontWeight: 'bold', color: '#333', textAlign: 'center' }}>Posts</div>
            
            <div style={{ color: '#666' }}>Whose Topics</div>
            <div style={{ color: '#666', textAlign: 'center' }}>10</div>
            <div style={{ color: '#666', textAlign: 'center' }}>8</div>
            
            <div style={{ color: '#666' }}>Whose Football</div>
            <div style={{ color: '#666', textAlign: 'center' }}>WS</div>
            <div style={{ color: '#666', textAlign: 'center' }}>$$</div>
            
            <div style={{ color: '#666' }}>Whose Basketball</div>
            <div style={{ color: '#666', textAlign: 'center' }}>WS</div>
            <div style={{ color: '#666', textAlign: 'center' }}>$$</div>
            
            <div style={{ color: '#666' }}>Coogs House</div>
            <div style={{ color: '#666', textAlign: 'center' }}>WHS</div>
            <div style={{ color: '#666', textAlign: 'center' }}>$$</div>
          </div>
        </div>

        {/* Members */}
        <div style={{
          flex: '1',
          minWidth: '200px',
          maxWidth: '300px'
        }}>
          <h4 style={{
            fontSize: '1.3rem',
            color: '#333333',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ color: '#B91C1C' }}>👥</span> Members
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#B91C1C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem'
              }}>S</div>
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Sarah</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#B91C1C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem'
              }}>J</div>
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Jessica</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#B91C1C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem'
              }}>E</div>
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Emily</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#B91C1C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem'
              }}>A</div>
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Amanda</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#B91C1C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem'
              }}>L</div>
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Lesime</span>
            </div>
          </div>
        </div>

        {/* Groups */}
        <div style={{
          flex: '1',
          minWidth: '200px',
          maxWidth: '300px'
        }}>
          <h4 style={{
            fontSize: '1.3rem',
            color: '#333333',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ color: '#B91C1C' }}>👥</span> Groups
          </h4>
          
          <div style={{
            fontSize: '0.9rem',
            color: '#666',
            lineHeight: '1.8'
          }}>
            <div style={{ 
              marginBottom: '1rem',
              fontWeight: 'bold',
              color: '#333'
            }}>Step by Your Coog</div>
            <div style={{ 
              fontSize: '0.8rem',
              color: '#888',
              marginBottom: '1rem'
            }}>24 members</div>
            
            <div style={{ 
              marginBottom: '1rem',
              fontWeight: 'bold',
              color: '#333'
            }}>CoogsCourt</div>
            <div style={{ 
              fontSize: '0.8rem',
              color: '#888',
              marginBottom: '1rem'
            }}>32 members</div>
            
            <div style={{ 
              marginBottom: '1rem',
              fontWeight: 'bold',
              color: '#333'
            }}>CoogsLadies</div>
            <div style={{ 
              fontSize: '0.8rem',
              color: '#888',
              marginBottom: '1rem'
            }}>18 members</div>
          </div>
          
          <h5 style={{
            fontSize: '1.1rem',
            color: '#333333',
            margin: '2rem 0 1rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ color: '#B91C1C' }}>👥</span> Groups
          </h5>
        </div>
      </div>

      {/* Upcoming Events */}
      <div style={{
        padding: '2rem',
        backgroundColor: '#ffffff',
        textAlign: 'center'
      }}>
        <h4 style={{
          fontSize: '1.5rem',
          color: '#333333',
          margin: '0 0 1rem 0'
        }}>Upcoming Events</h4>
        <p style={{
          color: '#666',
          fontSize: '1rem',
          margin: 0
        }}>April 2024</p>
      </div>
    </div>
  );
}