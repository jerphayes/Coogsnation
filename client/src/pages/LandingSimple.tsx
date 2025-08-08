import bannerImage from "@assets/file_00000000ed946246b26194ea80eb5e3a_conversation_id=67fb526f-75cc-8001-93e0-7b286caca06c&message_id=f5151dca-9d4a-4d7c-acf1-5e125d01acfb_1754449989402.png";
import { useEffect, useRef, useState } from "react";
import { useQuery } from '@tanstack/react-query';

export default function Landing() {
  const audioRef = useRef<HTMLAudioElement>(null);

  
  // Fetch forum categories for the dropdowns
  const { data: forumCategories } = useQuery({
    queryKey: ['/api/forums/categories'],
    queryFn: async () => {
      const response = await fetch('/api/forums/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

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
        backgroundColor: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '15px 0',
        fontSize: '1.1em',
        fontWeight: 'bold'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px'
        }}>
          <div style={{
            fontSize: '1.3em',
            color: '#a00000',
            fontWeight: 'bold'
          }}>CoogsNation.com</div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative'
          }}>
            <div style={{
              position: 'relative',
              display: 'inline-block'
            }}>
              <span style={{
                margin: '0 15px',
                color: '#000',
                cursor: 'pointer'
              }}>Community ▼</span>
              <div style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                backgroundColor: 'white',
                minWidth: '200px',
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                border: '1px solid #ddd',
                borderRadius: '4px',
                zIndex: '1000',
                display: 'none'
              }}>
                <div style={{
                  padding: '8px 12px',
                  fontSize: '0.9em',
                  fontWeight: 'bold',
                  color: '#666',
                  borderBottom: '1px solid #eee'
                }}>FORUMS</div>
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
        </div>
      </div>

      {/* Hero Section */}
      <div style={{ position: 'relative', zIndex: '1' }}>
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
              maxHeight: window.innerWidth <= 768 ? '400px' : '730px',
              height: 'auto'
            }}
          />
        </div>
        <p style={{
          fontSize: '1.1em',
          margin: '20px auto',
          maxWidth: '600px',
          textAlign: 'center'
        }}>Welcome to CoogsNation.com — the online community for University of Houston fans.</p>
      </div>

      {/* Community Features Section */}
      <div style={{
        margin: '20px 0',
        padding: '30px 20px',
        backgroundColor: '#f8f8f8',
        overflow: 'visible',
        position: 'relative',
        zIndex: '100000'
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
          margin: '0 auto',
          paddingBottom: '120px'
        }}>
          {/* Forums Card */}
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
              position: 'relative',
              cursor: 'pointer'
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
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
                opacity: '0',
                visibility: 'hidden',
                transition: 'all 200ms ease-in-out',
                zIndex: '999999',
                textAlign: 'left'
              }}
            >
              {forumCategories?.filter((cat: any) => 
                !['Water Cooler Talk', 'Heartbeats', 'UH Hall of Fame'].includes(cat.name)
              ).map((category: any) => (
                <div 
                  key={category.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/forums/categories/${category.id}`;
                  }} 
                  style={{
                    display: 'block',
                    padding: '12px 16px',
                    color: 'black',
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 200ms ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2';
                    (e.currentTarget as HTMLElement).style.color = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'black';
                  }}
                >
                  <i className={`fas fa-${category.name.toLowerCase() === 'football' ? 'football-ball' : 
                    category.name.toLowerCase() === 'basketball' ? 'basketball-ball' :
                    category.name.toLowerCase() === 'baseball' ? 'baseball-ball' :
                    category.name.toLowerCase().includes('track') ? 'running' :
                    category.name.toLowerCase() === 'golf' ? 'golf-ball' :
                    category.name.toLowerCase().includes('women') ? 'female' : 'trophy'}`} 
                    style={{ marginRight: '8px' }}></i>
                  {category.name}
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>{category.description}</div>
                </div>
              ))}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/forums';
                }} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.currentTarget as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'black';
                }}
              >
                <i className="fas fa-list" style={{ marginRight: '8px' }}></i>
                All Forums
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Browse All Categories</div>
              </div>
            </div>
          </div>
          
          {/* Sports News Card */}
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
              position: 'relative',
              cursor: 'pointer'
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
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
                opacity: '0',
                visibility: 'hidden',
                transition: 'all 200ms ease-in-out',
                zIndex: '999999',
                textAlign: 'left'
              }}
            >
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/news';
                }} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.currentTarget as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'black';
                }}
              >
                <i className="fas fa-newspaper" style={{ marginRight: '8px' }}></i>
                Latest Sports News
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Breaking news and updates</div>
              </div>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/forums/categories/1';
                }} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.currentTarget as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'black';
                }}
              >
                <i className="fas fa-football-ball" style={{ marginRight: '8px' }}></i>
                Football News
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Cougar Football coverage</div>
              </div>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/forums/categories/2';
                }} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.currentTarget as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'black';
                }}
              >
                <i className="fas fa-basketball-ball" style={{ marginRight: '8px' }}></i>
                Basketball News
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Men's & Women's Basketball</div>
              </div>
            </div>
          </div>

          {/* Community Card */}
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
              position: 'relative',
              cursor: 'pointer'
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
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
                opacity: '0',
                visibility: 'hidden',
                transition: 'all 200ms ease-in-out',
                zIndex: '999999',
                textAlign: 'left'
              }}
            >
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/forums/categories/24';
                }} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.currentTarget as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'black';
                }}
              >
                <i className="fas fa-heart" style={{ marginRight: '8px' }}></i>
                Heartbeats
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Dating and relationships</div>
              </div>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/forums/categories/23';
                }} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.currentTarget as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'black';
                }}
              >
                <i className="fas fa-coffee" style={{ marginRight: '8px' }}></i>
                Water Cooler Talk
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>General discussions</div>
              </div>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/life-happens';
                }} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.currentTarget as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'black';
                }}
              >
                <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                Life Happens
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Emergency resources</div>
              </div>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/life-solutions';
                }} 
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  color: 'black',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.currentTarget as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'black';
                }}
              >
                <i className="fas fa-tools" style={{ marginRight: '8px' }}></i>
                Life Solutions
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Helpful resources</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter Section */}
      <div style={{
        padding: '40px 20px',
        backgroundColor: '#fff',
        textAlign: 'center'
      }}>
        <h3 style={{
          fontSize: '1.5em',
          color: '#a00000',
          marginBottom: '15px'
        }}>Stay Connected with the Coogs!</h3>
        <p style={{
          fontSize: '1em',
          margin: '15px auto 25px',
          maxWidth: '500px',
          lineHeight: '1.5'
        }}>Join thousands of Cougar fans and get the latest news, game updates, and community highlights delivered to your inbox.</p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <input 
            type="email" 
            placeholder="Enter your email"
            style={{
              flex: '1',
              padding: '12px',
              border: '2px solid #ddd',
              borderRadius: '5px',
              fontSize: '1em'
            }}
          />
          <button style={{
            padding: '12px 25px',
            backgroundColor: '#a00000',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '1em',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>Subscribe</button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: '#333',
        color: '#fff',
        padding: '30px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <p style={{ margin: '0 0 15px 0', fontSize: '1.1em', fontWeight: 'bold' }}>
            CoogsNation.com - The Premier University of Houston Fan Community
          </p>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.9em', opacity: '0.8' }}>
            Connecting Cougar fans, students, alumni, and supporters worldwide.
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '30px',
            flexWrap: 'wrap',
            marginBottom: '20px'
          }}>
            <a href="/about" style={{ color: '#fff', textDecoration: 'none' }}>About</a>
            <a href="/contact" style={{ color: '#fff', textDecoration: 'none' }}>Contact</a>
            <a href="/privacy" style={{ color: '#fff', textDecoration: 'none' }}>Privacy</a>
            <a href="/terms" style={{ color: '#fff', textDecoration: 'none' }}>Terms</a>
          </div>
          <p style={{ margin: 0, fontSize: '0.8em', opacity: '0.6' }}>
            © 2025 CoogsNation.com. All rights reserved. Go Coogs! 🐾
          </p>
        </div>
      </div>
    </div>
  );
}