export default function Landing() {
  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      margin: 0,
      padding: 0,
      backgroundColor: '#f5f5f5',
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

      {/* Main Content */}
      <div style={{
        textAlign: 'center',
        padding: '3rem 2rem',
        backgroundColor: '#f5f5f5'
      }}>
        {/* WHOSE HOUSE? */}
        <h1 style={{
          fontSize: '4.5rem',
          fontWeight: 'bold',
          color: '#B91C1C',
          margin: '0 0 2rem 0',
          transform: 'rotate(-8deg)',
          letterSpacing: '0.1em',
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
        }}>WHOSE HOUSE?</h1>

        {/* Simple Cougar */}
        <div style={{ margin: '2rem 0' }}>
          <svg width="350" height="220" viewBox="0 0 350 220">
            {/* Cougar body - simple cartoon style */}
            <ellipse cx="175" cy="160" rx="90" ry="30" fill="#B91C1C" stroke="#000" strokeWidth="3"/>
            
            {/* Cougar head */}
            <ellipse cx="130" cy="120" rx="40" ry="35" fill="#B91C1C" stroke="#000" strokeWidth="3"/>
            
            {/* Ears */}
            <ellipse cx="110" cy="95" rx="10" ry="15" fill="#B91C1C" stroke="#000" strokeWidth="2"/>
            <ellipse cx="150" cy="95" rx="10" ry="15" fill="#B91C1C" stroke="#000" strokeWidth="2"/>
            <ellipse cx="110" cy="98" rx="5" ry="8" fill="#000"/>
            <ellipse cx="150" cy="98" rx="5" ry="8" fill="#000"/>
            
            {/* Eyes - sleepy/confident look */}
            <ellipse cx="120" cy="115" rx="6" ry="4" fill="#000"/>
            <ellipse cx="140" cy="115" rx="6" ry="4" fill="#000"/>
            <ellipse cx="120" cy="113" rx="2" ry="2" fill="#fff"/>
            <ellipse cx="140" cy="113" rx="2" ry="2" fill="#fff"/>
            
            {/* Nose */}
            <path d="M 125 125 L 135 125 L 130 135 Z" fill="#000"/>
            
            {/* Mouth area - white muzzle */}
            <ellipse cx="130" cy="140" rx="18" ry="10" fill="#fff" stroke="#000" strokeWidth="2"/>
            
            {/* Mouth line */}
            <path d="M 118 140 Q 130 145 142 140" stroke="#000" strokeWidth="2" fill="none"/>
            
            {/* Whiskers */}
            <line x1="95" y1="125" x2="110" y2="130" stroke="#000" strokeWidth="2"/>
            <line x1="95" y1="135" x2="110" y2="135" stroke="#000" strokeWidth="2"/>
            <line x1="150" y1="130" x2="165" y2="125" stroke="#000" strokeWidth="2"/>
            <line x1="150" y1="135" x2="165" y2="135" stroke="#000" strokeWidth="2"/>
            
            {/* Front paws */}
            <ellipse cx="155" cy="180" rx="8" ry="15" fill="#B91C1C" stroke="#000" strokeWidth="2"/>
            <ellipse cx="170" cy="185" rx="8" ry="12" fill="#B91C1C" stroke="#000" strokeWidth="2"/>
            
            {/* Back paws */}
            <ellipse cx="210" cy="185" rx="10" ry="15" fill="#B91C1C" stroke="#000" strokeWidth="2"/>
            <ellipse cx="230" cy="180" rx="8" ry="12" fill="#B91C1C" stroke="#000" strokeWidth="2"/>
            
            {/* Tail */}
            <path d="M 265 155 Q 285 135 295 115 Q 300 105 295 95" stroke="#000" strokeWidth="5" fill="none" strokeLinecap="round"/>
            <path d="M 265 155 Q 285 135 295 115 Q 300 105 295 95" stroke="#B91C1C" strokeWidth="3" fill="none" strokeLinecap="round"/>
            
            {/* Body details */}
            <path d="M 155 145 Q 175 150 195 145" stroke="#000" strokeWidth="2" fill="none"/>
          </svg>
        </div>

        {/* COOGS' HOUSE! */}
        <h2 style={{
          fontSize: '4.5rem',
          fontWeight: 'bold',
          color: '#B91C1C',
          margin: '2rem 0',
          letterSpacing: '0.1em'
        }}>COOGS' HOUSE!</h2>

        {/* Welcome text */}
        <h3 style={{
          fontSize: '2.2rem',
          color: '#333333',
          margin: '2rem 0 1rem 0',
          fontWeight: 'normal'
        }}>Welcome to CoogsNation.com</h3>

        <p style={{
          fontSize: '1.3rem',
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
        gap: '3rem',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Community Forums */}
        <div style={{
          flex: '1',
          minWidth: '280px',
          maxWidth: '350px'
        }}>
          <h4 style={{
            fontSize: '1.3rem',
            color: '#333333',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ color: '#B91C1C', fontSize: '1.2rem' }}>💬</span> Community Forums
          </h4>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: '0.5rem',
            fontSize: '0.9rem',
            marginBottom: '1rem'
          }}>
            <div style={{ fontWeight: 'bold', color: '#333', padding: '0.5rem 0' }}>Forum Topics</div>
            <div style={{ fontWeight: 'bold', color: '#333', textAlign: 'center', padding: '0.5rem 0' }}>Topics</div>
            <div style={{ fontWeight: 'bold', color: '#333', textAlign: 'center', padding: '0.5rem 0' }}>Posts</div>
            
            <div style={{ color: '#666', padding: '0.5rem 0' }}>Whose House?</div>
            <div style={{ color: '#666', textAlign: 'center', padding: '0.5rem 0' }}>10</div>
            <div style={{ color: '#666', textAlign: 'center', padding: '0.5rem 0' }}>47</div>
            
            <div style={{ color: '#666', padding: '0.5rem 0' }}>Coogs Football</div>
            <div style={{ color: '#666', textAlign: 'center', padding: '0.5rem 0' }}>8</div>
            <div style={{ color: '#666', textAlign: 'center', padding: '0.5rem 0' }}>32</div>
            
            <div style={{ color: '#666', padding: '0.5rem 0' }}>Coogs Basketball</div>
            <div style={{ color: '#666', textAlign: 'center', padding: '0.5rem 0' }}>5</div>
            <div style={{ color: '#666', textAlign: 'center', padding: '0.5rem 0' }}>19</div>
            
            <div style={{ color: '#666', padding: '0.5rem 0' }}>Coogs in the Big 12</div>
            <div style={{ color: '#666', textAlign: 'center', padding: '0.5rem 0' }}>4</div>
            <div style={{ color: '#666', textAlign: 'center', padding: '0.5rem 0' }}>25</div>
          </div>
        </div>

        {/* Members */}
        <div style={{
          flex: '1',
          minWidth: '200px',
          maxWidth: '250px'
        }}>
          <h4 style={{
            fontSize: '1.3rem',
            color: '#333333',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ color: '#B91C1C', fontSize: '1.2rem' }}>👥</span> Members
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '35px',
                height: '35px',
                borderRadius: '50%',
                backgroundColor: '#B91C1C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>S</div>
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Sarah</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '35px',
                height: '35px',
                borderRadius: '50%',
                backgroundColor: '#B91C1C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>J</div>
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Jessica</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '35px',
                height: '35px',
                borderRadius: '50%',
                backgroundColor: '#B91C1C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>E</div>
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Emily</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '35px',
                height: '35px',
                borderRadius: '50%',
                backgroundColor: '#B91C1C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>A</div>
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Amanda</span>
            </div>
          </div>
          
          <div style={{
            marginTop: '1rem',
            textAlign: 'center'
          }}>
            <a href="/members" style={{
              color: '#B91C1C',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>View All</a>
          </div>
        </div>

        {/* Groups */}
        <div style={{
          flex: '1',
          minWidth: '200px',
          maxWidth: '250px'
        }}>
          <h4 style={{
            fontSize: '1.3rem',
            color: '#333333',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ color: '#B91C1C', fontSize: '1.2rem' }}>👥</span> Groups
          </h4>
          
          <div style={{
            fontSize: '0.9rem',
            color: '#666',
            lineHeight: '1.8'
          }}>
            <div style={{ 
              marginBottom: '0.8rem',
              fontWeight: 'bold',
              color: '#333'
            }}>Step by Your Coog</div>
            <div style={{ 
              fontSize: '0.8rem',
              color: '#888',
              marginBottom: '1rem'
            }}>1 day ago</div>
            
            <div style={{ 
              marginBottom: '0.8rem',
              fontWeight: 'bold',
              color: '#333'
            }}>CoogsCourt</div>
            <div style={{ 
              fontSize: '0.8rem',
              color: '#888',
              marginBottom: '1rem'
            }}>1 day ago</div>
            
            <div style={{ 
              marginBottom: '0.8rem',
              fontWeight: 'bold',
              color: '#333'
            }}>CoogsLadies</div>
            <div style={{ 
              fontSize: '0.8rem',
              color: '#888',
              marginBottom: '1rem'
            }}>1 day ago</div>
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div style={{
        padding: '2rem',
        backgroundColor: '#f5f5f5',
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
          <span style={{ color: '#B91C1C', fontSize: '1.3rem' }}>📅</span> Upcoming Events
        </h4>
        <div style={{
          color: '#666',
          fontSize: '1rem'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Spring Game</div>
          <div style={{ fontSize: '0.9rem' }}>April 20, 2024</div>
        </div>
      </div>
    </div>
  );
}