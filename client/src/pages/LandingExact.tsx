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
          alignItems: 'center',
          gap: '1rem'
        }}>
          <svg width="80" height="80" viewBox="0 0 100 100">
            <rect x="10" y="15" width="15" height="70" fill="#B91C1C"/>
            <rect x="30" y="35" width="15" height="50" fill="#B91C1C"/>
            <rect x="50" y="15" width="15" height="30" fill="#B91C1C"/>
            <rect x="50" y="55" width="15" height="30" fill="#B91C1C"/>
            <rect x="70" y="35" width="15" height="50" fill="#B91C1C"/>
          </svg>
        </div>
        <nav style={{ display: 'flex', gap: '2rem' }}>
          <a href="/home" style={{
            textDecoration: 'none',
            color: '#333333',
            fontSize: '16px',
            fontWeight: '500'
          }}>Home</a>
          <a href="/forums" style={{
            textDecoration: 'none',
            color: '#333333',
            fontSize: '16px',
            fontWeight: '500'
          }}>Forums</a>
          <a href="/members" style={{
            textDecoration: 'none',
            color: '#333333',
            fontSize: '16px',
            fontWeight: '500'
          }}>Members</a>
          <a href="/api/login" style={{
            textDecoration: 'none',
            color: '#333333',
            fontSize: '16px',
            fontWeight: '500'
          }}>Log In</a>
          <a href="/api/login" style={{
            textDecoration: 'none',
            color: '#333333',
            fontSize: '16px',
            fontWeight: '500'
          }}>Sign Up</a>
        </nav>
      </header>

      {/* Main Content */}
      <div style={{
        textAlign: 'center',
        padding: '3rem 2rem',
        backgroundColor: '#f8f8f8'
      }}>
        {/* WHOSE HOUSE? */}
        <h1 style={{
          fontSize: '4rem',
          fontWeight: 'bold',
          color: '#B91C1C',
          margin: '0 0 2rem 0',
          transform: 'rotate(-5deg)',
          letterSpacing: '0.1em'
        }}>WHOSE HOUSE?</h1>

        {/* Cougar */}
        <div style={{ margin: '2rem 0' }}>
          <svg width="300" height="200" viewBox="0 0 400 250">
            {/* Cougar body */}
            <ellipse cx="200" cy="180" rx="120" ry="40" fill="#B91C1C" stroke="#000" strokeWidth="3"/>
            
            {/* Cougar head */}
            <ellipse cx="120" cy="120" rx="60" ry="50" fill="#B91C1C" stroke="#000" strokeWidth="3"/>
            
            {/* Ears */}
            <ellipse cx="90" cy="85" rx="15" ry="20" fill="#B91C1C" stroke="#000" strokeWidth="2"/>
            <ellipse cx="150" cy="85" rx="15" ry="20" fill="#B91C1C" stroke="#000" strokeWidth="2"/>
            <ellipse cx="90" cy="88" rx="8" ry="12" fill="#000"/>
            <ellipse cx="150" cy="88" rx="8" ry="12" fill="#000"/>
            
            {/* Eyes */}
            <ellipse cx="105" cy="110" rx="8" ry="12" fill="#000"/>
            <ellipse cx="135" cy="110" rx="8" ry="12" fill="#000"/>
            <ellipse cx="105" cy="108" rx="3" ry="4" fill="#fff"/>
            <ellipse cx="135" cy="108" rx="3" ry="4" fill="#fff"/>
            
            {/* Nose */}
            <path d="M 115 125 L 125 125 L 120 135 Z" fill="#000"/>
            
            {/* Mouth area */}
            <ellipse cx="120" cy="145" rx="25" ry="15" fill="#fff" stroke="#000" strokeWidth="2"/>
            
            {/* Mouth line */}
            <path d="M 105 145 Q 120 155 135 145" stroke="#000" strokeWidth="2" fill="none"/>
            
            {/* Whiskers */}
            <line x1="70" y1="120" x2="90" y2="125" stroke="#000" strokeWidth="2"/>
            <line x1="70" y1="130" x2="90" y2="130" stroke="#000" strokeWidth="2"/>
            <line x1="150" y1="125" x2="170" y2="120" stroke="#000" strokeWidth="2"/>
            <line x1="150" y1="130" x2="170" y2="130" stroke="#000" strokeWidth="2"/>
            
            {/* Front paws */}
            <ellipse cx="160" cy="200" rx="15" ry="25" fill="#B91C1C" stroke="#000" strokeWidth="2"/>
            <ellipse cx="190" cy="200" rx="15" ry="25" fill="#B91C1C" stroke="#000" strokeWidth="2"/>
            
            {/* Back paws */}
            <ellipse cx="240" cy="200" rx="15" ry="25" fill="#B91C1C" stroke="#000" strokeWidth="2"/>
            <ellipse cx="270" cy="200" rx="15" ry="25" fill="#B91C1C" stroke="#000" strokeWidth="2"/>
            
            {/* Tail */}
            <path d="M 320 180 Q 350 160 360 140 Q 365 130 360 120" stroke="#000" strokeWidth="8" fill="none" strokeLinecap="round"/>
            <path d="M 320 180 Q 350 160 360 140 Q 365 130 360 120" stroke="#B91C1C" strokeWidth="6" fill="none" strokeLinecap="round"/>
          </svg>
        </div>

        {/* COOGS' HOUSE! */}
        <h2 style={{
          fontSize: '4rem',
          fontWeight: 'bold',
          color: '#B91C1C',
          margin: '2rem 0',
          letterSpacing: '0.1em'
        }}>COOGS' HOUSE!</h2>

        {/* Welcome text */}
        <h3 style={{
          fontSize: '2rem',
          color: '#333333',
          margin: '2rem 0 1rem 0',
          fontWeight: 'normal'
        }}>Welcome to CoogsNation.com</h3>

        <p style={{
          fontSize: '1.2rem',
          color: '#666666',
          margin: '0 0 2rem 0'
        }}>The online community for University of Houston fans.</p>

        {/* Get Started Button */}
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
        backgroundColor: '#ffffff',
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
            <div style={{ fontWeight: 'bold', color: '#333', textAlign: 'center' }}>Topics</div>
            <div style={{ fontWeight: 'bold', color: '#333', textAlign: 'center' }}>Posts</div>
            
            <div style={{ color: '#666' }}>Whose Football</div>
            <div style={{ color: '#666', textAlign: 'center' }}>10</div>
            <div style={{ color: '#666', textAlign: 'center' }}>47</div>
            
            <div style={{ color: '#666' }}>Whose Basketball</div>
            <div style={{ color: '#666', textAlign: 'center' }}>8</div>
            <div style={{ color: '#666', textAlign: 'center' }}>32</div>
            
            <div style={{ color: '#666' }}>Coogs in the Big 12</div>
            <div style={{ color: '#666', textAlign: 'center' }}>5</div>
            <div style={{ color: '#666', textAlign: 'center' }}>19</div>
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
            lineHeight: '1.6'
          }}>
            <div style={{ marginBottom: '0.5rem' }}>Step by Your Coog</div>
            <div style={{ marginBottom: '0.5rem' }}>CoogsCourt</div>
            <div style={{ marginBottom: '0.5rem' }}>CoogsCourt</div>
            <div style={{ marginBottom: '0.5rem' }}>CoogsLadies</div>
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div style={{
        padding: '2rem',
        backgroundColor: '#f8f8f8',
        textAlign: 'center'
      }}>
        <h4 style={{
          fontSize: '1.5rem',
          color: '#333333',
          margin: '0 0 1rem 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ color: '#B91C1C' }}>📅</span> Upcoming Events
        </h4>
        <p style={{
          color: '#666',
          fontSize: '1rem',
          margin: 0
        }}>Check back soon for upcoming events!</p>
      </div>
    </div>
  );
}