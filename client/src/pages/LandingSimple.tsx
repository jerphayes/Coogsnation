import bannerImage from "@assets/file_00000000ed946246b26194ea80eb5e3a_conversation_id=67fb526f-75cc-8001-93e0-7b286caca06c&message_id=f5151dca-9d4a-4d7c-acf1-5e125d01acfb_1754449989402.png";
import { useEffect, useRef } from "react";

export default function Landing() {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Play growl sound once when component mounts - shortened to 1 second
    const playGrowl = async () => {
      if (audioRef.current) {
        try {
          // Set max duration to 1 second only - much shorter growl
          audioRef.current.addEventListener('loadedmetadata', () => {
            if (audioRef.current) {
              audioRef.current.addEventListener('timeupdate', () => {
                if (audioRef.current && audioRef.current.currentTime >= 1) {
                  audioRef.current.pause();
                }
              });
            }
          });
          await audioRef.current.play();
        } catch (error) {
          console.log("Audio autoplay blocked by browser");
        }
      }
    };

    // Small delay to ensure page is loaded
    const timer = setTimeout(playGrowl, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      margin: 0,
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#fff',
      color: '#111',
      textAlign: 'center'
    }}>
      {/* Hidden audio element for cougar growl */}
      <audio
        ref={audioRef}
        preload="auto"
        style={{ display: 'none' }}
      >
        <source src="https://quicksounds.com/uploads/tracks/1764799707_799379166_2054415044.mp3" type="audio/mpeg" />
        <source src="https://quicksounds.com/uploads/tracks/295879743_2073341770_1313737317.mp3" type="audio/mpeg" />
      </audio>



      {/* Navigation Menu */}
      <div style={{
        marginTop: '10px',
        marginBottom: '20px',
        padding: '10px 0',
        borderBottom: '2px solid #ccc',
        fontSize: '1.1em'
      }}>
        <a href="/home" style={{
          margin: '0 15px',
          textDecoration: 'none',
          fontWeight: 'bold',
          color: '#000'
        }}>Home</a>
        <a href="/forums" style={{
          margin: '0 15px',
          textDecoration: 'none',
          fontWeight: 'bold',
          color: '#000'
        }}>Forums</a>
        <a href="/members" style={{
          margin: '0 15px',
          textDecoration: 'none',
          fontWeight: 'bold',
          color: '#000'
        }}>Members</a>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button style={{
            margin: '0 15px',
            background: 'none',
            border: 'none',
            fontWeight: 'bold',
            color: '#000',
            cursor: 'pointer',
            fontSize: '1.1em'
          }}>
            Community ▼
          </button>
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '5px',
            padding: '10px',
            minWidth: '200px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            display: 'none',
            zIndex: 1000
          }} className="community-dropdown">
            <a href="/forums/categories/24" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#000',
              borderBottom: '1px solid #eee'
            }}>💖 Heartbeats (Dating)</a>
            <a href="/forums/categories/23" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#000',
              borderBottom: '1px solid #eee'
            }}>☕ Water Cooler Talk</a>
            <div style={{
              padding: '8px 12px',
              fontSize: '0.9em',
              fontWeight: 'bold',
              color: '#666',
              borderBottom: '1px solid #eee'
            }}>RESOURCES</div>
            <a href="/life-happens" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#000',
              borderBottom: '1px solid #eee'
            }}>💸 Life Happens</a>
            <a href="/life-solutions" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#000'
            }}>🛠️ Life Solutions</a>
          </div>
        </div>
        <a href="/api/login" style={{
          margin: '0 15px',
          textDecoration: 'none',
          fontWeight: 'bold',
          color: '#000'
        }}>Log In</a>
        <a href="/api/login" style={{
          margin: '0 15px',
          textDecoration: 'none',
          fontWeight: 'bold',
          color: '#000'
        }}>Sign Up</a>
      </div>

      {/* Hero Section */}
      <div>
        <div style={{
          margin: '30px 0',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <img 
            src={bannerImage} 
            alt="Whose House? Coogs House! Banner" 
            style={{
              maxWidth: '1200px',
              width: '98%',
              maxHeight: '730px',
              height: 'auto'
            }}
          />
        </div>
        <p style={{
          fontSize: '1.1em',
          margin: '20px auto',
          maxWidth: '600px'
        }}>Welcome to CoogsNation.com — the online community for University of Houston fans.</p>
      </div>

      {/* Community Features Section */}
      <div style={{
        margin: '50px 0',
        padding: '30px 20px',
        backgroundColor: '#f8f8f8'
      }}>
        <h3 style={{
          fontSize: '1.8em',
          color: '#a00000',
          marginBottom: '30px'
        }}>Join the CoogsNation Community</h3>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '30px',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <div 
            style={{ 
              textAlign: 'center', 
              flex: '1', 
              minWidth: '200px',
              padding: '20px',
              borderRadius: '10px',
              transition: 'all 0.3s ease',
              backgroundColor: 'white',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 5px 15px rgba(160,0,0,0.2)';
              const dropdown = e.currentTarget.querySelector('.forums-dropdown') as HTMLElement;
              if (dropdown) {
                dropdown.style.opacity = '1';
                dropdown.style.visibility = 'visible';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
              const dropdown = e.currentTarget.querySelector('.forums-dropdown') as HTMLElement;
              if (dropdown) {
                dropdown.style.opacity = '0';
                dropdown.style.visibility = 'hidden';
              }
            }}
          >
            <div style={{
              fontSize: '2em',
              marginBottom: '10px'
            }}>💬</div>
            <h4 style={{ color: '#a00000', margin: '0 0 10px 0' }}>Forums</h4>
            <p style={{ margin: 0, fontSize: '0.9em' }}>Discuss Coogs sports, share news, and connect with fellow fans</p>
            
            <div 
              className="forums-dropdown"
              style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                marginTop: '8px',
                width: '100%',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                opacity: '0',
                visibility: 'hidden',
                transition: 'all 200ms ease-in-out',
                zIndex: '50',
                textAlign: 'left'
              }}
            >
              <div 
                onClick={() => window.location.href = '/forums/categories/1'} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.target as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  (e.target as HTMLElement).style.color = 'black';
                }}
              >
                <i className="fas fa-football-ball" style={{ marginRight: '8px' }}></i>
                Football
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Cougar Football Discussion</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/2'} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.target as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  (e.target as HTMLElement).style.color = 'black';
                }}
              >
                <i className="fas fa-basketball-ball" style={{ marginRight: '8px' }}></i>
                Basketball
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Men's & Women's Basketball</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums'} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.target as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  (e.target as HTMLElement).style.color = 'black';
                }}
              >
                <i className="fas fa-list" style={{ marginRight: '8px' }}></i>
                All Forums
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Browse All Categories</div>
              </div>
            </div>
          </div>
          
          <div 
            style={{ 
              textAlign: 'center', 
              flex: '1', 
              minWidth: '200px',
              padding: '20px',
              borderRadius: '10px',
              transition: 'all 0.3s ease',
              backgroundColor: 'white',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 5px 15px rgba(160,0,0,0.2)';
              const dropdown = e.currentTarget.querySelector('.sports-dropdown') as HTMLElement;
              if (dropdown) {
                dropdown.style.opacity = '1';
                dropdown.style.visibility = 'visible';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
              const dropdown = e.currentTarget.querySelector('.sports-dropdown') as HTMLElement;
              if (dropdown) {
                dropdown.style.opacity = '0';
                dropdown.style.visibility = 'hidden';
              }
            }}
          >
            <div style={{
              fontSize: '2em',
              marginBottom: '10px'
            }}>🏆</div>
            <h4 style={{ color: '#a00000', margin: '0 0 10px 0' }}>Sports News</h4>
            <p style={{ margin: 0, fontSize: '0.9em' }}>Stay updated on Cougar athletics and Big 12 action</p>
            
            <div 
              className="sports-dropdown"
              style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                marginTop: '8px',
                width: '100%',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                opacity: '0',
                visibility: 'hidden',
                transition: 'all 200ms ease-in-out',
                zIndex: '50',
                textAlign: 'left'
              }}
            >
              <div 
                onClick={() => window.location.href = '/news?category=football'} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.target as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  (e.target as HTMLElement).style.color = 'black';
                }}
              >
                <i className="fas fa-football-ball" style={{ marginRight: '8px' }}></i>
                Football News
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Latest Cougar Football Updates</div>
              </div>
              <div 
                onClick={() => window.location.href = '/news?category=basketball'} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.target as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  (e.target as HTMLElement).style.color = 'black';
                }}
              >
                <i className="fas fa-basketball-ball" style={{ marginRight: '8px' }}></i>
                Basketball News
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Men's & Women's Basketball</div>
              </div>
              <div 
                onClick={() => window.location.href = '/news?category=big12'} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.target as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  (e.target as HTMLElement).style.color = 'black';
                }}
              >
                <i className="fas fa-trophy" style={{ marginRight: '8px' }}></i>
                Big 12 News
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Conference Updates</div>
              </div>
              <div 
                onClick={() => window.location.href = '/news'} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.target as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  (e.target as HTMLElement).style.color = 'black';
                }}
              >
                <i className="fas fa-newspaper" style={{ marginRight: '8px' }}></i>
                All News
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Browse All Articles</div>
              </div>
            </div>
          </div>
          
          <div 
            style={{ 
              textAlign: 'center', 
              flex: '1', 
              minWidth: '200px',
              padding: '20px',
              borderRadius: '10px',
              transition: 'all 0.3s ease',
              backgroundColor: 'white',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 5px 15px rgba(160,0,0,0.2)';
              const dropdown = e.currentTarget.querySelector('.community-dropdown') as HTMLElement;
              if (dropdown) {
                dropdown.style.opacity = '1';
                dropdown.style.visibility = 'visible';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
              const dropdown = e.currentTarget.querySelector('.community-dropdown') as HTMLElement;
              if (dropdown) {
                dropdown.style.opacity = '0';
                dropdown.style.visibility = 'hidden';
              }
            }}
          >
            <div style={{
              fontSize: '2em',
              marginBottom: '10px'
            }}>👥</div>
            <h4 style={{ color: '#a00000', margin: '0 0 10px 0' }}>Community</h4>
            <p style={{ margin: 0, fontSize: '0.9em' }}>Heartbeats dating, Water Cooler Talk, and community resources</p>
            
            <div 
              className="community-dropdown"
              style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                marginTop: '8px',
                width: '100%',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                opacity: '0',
                visibility: 'hidden',
                transition: 'all 200ms ease-in-out',
                zIndex: '50',
                textAlign: 'left'
              }}
            >
              <div 
                onClick={() => window.location.href = '/forums/categories/24'} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#fef2f2';
                  e.target.style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = 'black';
                }}
              >
                <i className="fas fa-heart" style={{ marginRight: '8px' }}></i>
                Heartbeats
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Dating & Relationships</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/23'} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#fef2f2';
                  e.target.style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = 'black';
                }}
              >
                <i className="fas fa-coffee" style={{ marginRight: '8px' }}></i>
                Water Cooler Talk
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>General Discussions</div>
              </div>
              <div style={{
                padding: '8px 16px',
                backgroundColor: '#f9fafb',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resources</div>
              </div>
              <div 
                onClick={() => window.location.href = '/life-happens'} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#fef2f2';
                  e.target.style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = 'black';
                }}
              >
                <i className="fas fa-wallet" style={{ marginRight: '8px' }}></i>
                Life Happens
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Bills & Payments</div>
              </div>
              <div 
                onClick={() => window.location.href = '/life-solutions'} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#fef2f2';
                  e.target.style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = 'black';
                }}
              >
                <i className="fas fa-tools" style={{ marginRight: '8px' }}></i>
                Life Solutions
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Houston Resources & Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      

    </div>
  );
}