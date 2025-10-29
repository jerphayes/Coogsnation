import bannerImage from "@assets/file_00000000881861f9be677e55822b57a5_1757784057972.png";
import logoImage from "@assets/webiste master logo_1761671161849.jpg";
import { useAuth } from "@/hooks/useAuth";
import LoginComponent from "@/components/LoginComponent";
import { useEffect } from "react";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  // SECURITY: Removed client-side sessionStorage redirect logic
  // Server now handles all redirects securely via returnTo query parameter

  // Show loading state
  if (isLoading) {
    return (
      <div style={{
        margin: 0,
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#fff',
        color: '#111',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Allow both authenticated and non-authenticated users to see hero page
  // Remove automatic redirect - let users choose where to go

  return (
    <div 
      className="landing-hero"
      style={{
        margin: 0,
        fontFamily: 'Arial, sans-serif',
        backgroundImage: `url(${bannerImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        width: '100%',
        color: '#111',
        textAlign: 'center',
        position: 'relative'
      }}>
      {/* Dark overlay for better text readability */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1,
        pointerEvents: 'none'
      }}></div>
      
      {/* Content wrapper */}
      <div style={{
        position: 'relative',
        zIndex: 2
      }}>

      {/* Navigation Menu */}
      <div style={{
        marginTop: '10px',
        marginBottom: '20px',
        padding: '10px 0',
        borderBottom: '2px solid rgba(255,255,255,0.3)',
        fontSize: '1.1em',
        backgroundColor: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '15px'
      }}>
        <a href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          marginRight: '20px'
        }}>
          <img 
            src={logoImage} 
            alt="CoogsNation Logo" 
            style={{
              height: '50px',
              width: '50px',
              objectFit: 'contain'
            }}
          />
        </a>
        <a href="/forums" style={{
          margin: '0',
          textDecoration: 'none',
          fontWeight: 'bold',
          color: '#fff',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
        }}>Forums</a>
        <a href="/members" style={{
          margin: '0',
          textDecoration: 'none',
          fontWeight: 'bold',
          color: '#fff',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
        }}>Members</a>
        <a href="/store" style={{
          margin: '0',
          textDecoration: 'none',
          fontWeight: 'bold',
          color: '#fff',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
        }}>Shopping</a>
        <div style={{ position: 'relative', display: 'inline-block' }}
             onMouseEnter={(e) => {
               const dropdown = e.currentTarget.querySelector('.community-dropdown') as HTMLElement;
               if (dropdown) {
                 dropdown.style.display = 'block';
                 dropdown.style.opacity = '1';
                 dropdown.style.visibility = 'visible';
               }
             }}
             onMouseLeave={(e) => {
               const dropdown = e.currentTarget.querySelector('.community-dropdown') as HTMLElement;
               if (dropdown) {
                 dropdown.style.display = 'none';
                 dropdown.style.opacity = '0';
                 dropdown.style.visibility = 'hidden';
               }
             }}>
          <a href="/community" style={{
            margin: '0',
            textDecoration: 'none',
            background: 'none',
            border: 'none',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            cursor: 'pointer',
            fontSize: '1.1em'
          }}>
            Community ▼
          </a>
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
            opacity: '0',
            visibility: 'hidden',
            transition: 'all 0.2s ease',
            zIndex: 1000
          }} className="community-dropdown">
            <a href="/coogpaws-chat" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#000',
              borderBottom: '1px solid #eee'
            }}>🐾 Coog Paws Chat</a>
            <a href="/forums/categories/23" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#000',
              borderBottom: '1px solid #eee'
            }}>☕ Water Cooler Talk</a>
            <a href="/life-happens" style={{
              display: 'block',
              padding: '8px 12px',
              fontSize: '0.9em',
              fontWeight: 'bold',
              color: '#666',
              borderBottom: '1px solid #eee',
              textDecoration: 'none',
              cursor: 'pointer'
            }}>RESOURCES</a>
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
        <div style={{ position: 'relative', display: 'inline-block' }}
             onMouseEnter={(e) => {
               const dropdown = e.currentTarget.querySelector('.login-dropdown') as HTMLElement;
               if (dropdown) {
                 dropdown.style.display = 'block';
                 dropdown.style.opacity = '1';
                 dropdown.style.visibility = 'visible';
               }
             }}
             onMouseLeave={(e) => {
               const dropdown = e.currentTarget.querySelector('.login-dropdown') as HTMLElement;
               if (dropdown) {
                 dropdown.style.display = 'none';
                 dropdown.style.opacity = '0';
                 dropdown.style.visibility = 'hidden';
               }
             }}>
          <button style={{
            margin: '0 15px',
            background: 'none',
            border: 'none',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            cursor: 'pointer',
            fontSize: '1.1em'
          }}>
            Login ▼
          </button>
          <div style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '5px',
            padding: '10px',
            minWidth: '200px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            display: 'none',
            opacity: '0',
            visibility: 'hidden',
            transition: 'all 0.2s ease',
            zIndex: 1000
          }} className="login-dropdown">
            <a href="/login/other?redirect=/dashboard" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#DC2626',
              fontWeight: 'bold',
              borderBottom: '1px solid #eee'
            }}>🔑 Login to Site</a>
            <a href="/login/email?redirect=/dashboard" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#DC2626',
              fontWeight: 'bold',
              borderBottom: '1px solid #eee'
            }}>Login with Email</a>
            <a href="/auth/google?redirect=/dashboard" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#EF4444',
              borderBottom: '1px solid #eee'
            }}>Login with Google</a>
            <a href="/auth/apple?redirect=/dashboard" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#1F2937',
              borderBottom: '1px solid #eee'
            }}>Login with Apple</a>
            <a href="/auth/linkedin?redirect=/dashboard" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#2563EB',
              borderBottom: '1px solid #eee'
            }}>Login with LinkedIn</a>
            <a href="/auth/facebook?redirect=/dashboard" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#3B82F6',
              borderBottom: '1px solid #eee'
            }}>Login with Facebook</a>
            <a href="/auth/x?redirect=/dashboard" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#0EA5E9'
            }}>Login with X (Twitter)</a>
          </div>
        </div>
        <div style={{ position: 'relative', display: 'inline-block' }}
             onMouseEnter={(e) => {
               const dropdown = e.currentTarget.querySelector('.join-dropdown') as HTMLElement;
               if (dropdown) {
                 dropdown.style.display = 'block';
                 dropdown.style.opacity = '1';
                 dropdown.style.visibility = 'visible';
               }
             }}
             onMouseLeave={(e) => {
               const dropdown = e.currentTarget.querySelector('.join-dropdown') as HTMLElement;
               if (dropdown) {
                 dropdown.style.display = 'none';
                 dropdown.style.opacity = '0';
                 dropdown.style.visibility = 'hidden';
               }
             }}>
          <button style={{
            margin: '0 15px',
            background: 'none',
            border: 'none',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            cursor: 'pointer',
            fontSize: '1.1em'
          }}>
            Join ▼
          </button>
          <div style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '5px',
            padding: '10px',
            minWidth: '200px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            display: 'none',
            opacity: '0',
            visibility: 'hidden',
            transition: 'all 0.2s ease',
            zIndex: 1000
          }} className="join-dropdown">
            <a href="/join" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#DC2626',
              fontWeight: 'bold',
              borderBottom: '1px solid #eee'
            }}>Sign Up</a>
            <a href="/auth/google" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#EF4444',
              borderBottom: '1px solid #eee'
            }}>Continue with Google</a>
            <a href="/auth/apple" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#1F2937',
              borderBottom: '1px solid #eee'
            }}>Continue with Apple</a>
            <a href="/auth/linkedin" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#2563EB',
              borderBottom: '1px solid #eee'
            }}>Continue with LinkedIn</a>
            <a href="/auth/facebook" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#3B82F6',
              borderBottom: '1px solid #eee'
            }}>Continue with Facebook</a>
            <a href="/auth/x" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#0EA5E9',
              borderBottom: '1px solid #eee'
            }}>Continue with X (Twitter)</a>
            <a href="/signup/other" style={{
              display: 'block',
              padding: '8px 12px',
              textDecoration: 'none',
              color: '#4B5563'
            }}>Continue with Other</a>
          </div>
        </div>
        <a href="/forums" style={{
          margin: '0 15px',
          textDecoration: 'none',
          fontWeight: 'bold',
          color: '#fff',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
        }}>
          Continue as Guest
        </a>
        <button
          onClick={() => {
            // Clear localStorage demo auth
            localStorage.removeItem('currentUser');
            // Redirect to home page
            window.location.href = '/';
          }}
          style={{
            margin: '0 15px',
            background: 'none',
            border: 'none',
            textDecoration: 'none',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            cursor: 'pointer',
            fontSize: '1.1em'
          }}
        >
          Logout
        </button>
        <a href="/terms" style={{
          margin: '0 15px',
          textDecoration: 'none',
          fontWeight: 'bold',
          color: '#fff',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
        }}>Terms</a>
      </div>

      {/* Hero Section */}
      <div>
        <div style={{ paddingTop: '100px', paddingBottom: '50px' }}>
          <h1 className="hero-text" style={{
            fontSize: '3em',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            margin: '20px 0 10px 0',
            letterSpacing: '2px'
          }}>
            WHOSE HOUSE? COOGS HOUSE!
          </h1>
        </div>
        <h2 className="hero-text" style={{
          fontSize: '1.1em',
          margin: '20px auto',
          maxWidth: '600px'
        }}>
          CoogsNation Community — Connect, Share, and Grow with Fellow Fans of the Houston Cougars
        </h2>
      </div>


      {/* Community Features Section */}
      <div style={{
        margin: '50px 0',
        padding: '30px 20px',
        overflow: 'visible',
        position: 'relative',
        zIndex: 2
      }}>
        <h3 className="hero-text" style={{
          fontSize: '1.8em',
          marginBottom: '30px'
        }}>Coogsnation Community
Connect, Share Grow with Fellow Fans of the Houston Cougars</h3>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '30px',
          maxWidth: '800px',
          margin: '0 auto',
          paddingBottom: '120px'
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
              e.currentTarget.style.zIndex = '1000';
              const dropdown = e.currentTarget.querySelector('.forums-dropdown') as HTMLElement;
              if (dropdown) {
                dropdown.style.opacity = '1';
                dropdown.style.visibility = 'visible';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
              e.currentTarget.style.zIndex = 'auto';
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
            <h4 style={{ color: '#a00000', margin: '0 0 10px 0' }}>CoogsNation Community
Connect, Share, and Grow with Fellow Houston Cougars</h4>
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
                zIndex: '1000',
                textAlign: 'left',
                maxHeight: '400px',
                overflowY: 'auto'
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
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Houston Cougar Football discussions</div>
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
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>UH Basketball - Men's and Women's teams</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/18'} 
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
                <i className="fas fa-baseball-ball" style={{ marginRight: '8px' }}></i>
                Baseball
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Houston Cougar Baseball discussion</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/19'} 
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
                <i className="fas fa-running" style={{ marginRight: '8px' }}></i>
                Track & Field
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Houston Cougar Track & Field athletics</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/20'} 
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
                <i className="fas fa-golf-ball" style={{ marginRight: '8px' }}></i>
                Golf
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Houston Cougar Golf team discussions</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/45'} 
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
                <i className="fas fa-female" style={{ marginRight: '8px' }}></i>
                Women's Sports
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>All Houston Cougar women's athletics</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/21'} 
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
                Other Sports
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>All other Houston Cougar athletics</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/4'} 
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
                <i className="fas fa-user-plus" style={{ marginRight: '8px' }}></i>
                Recruiting
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Latest recruiting news and commitments</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/5'} 
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
                <i className="fas fa-home" style={{ marginRight: '8px' }}></i>
                Cougar Corner
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>General UH discussion and campus life</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/6'} 
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
                <i className="fas fa-globe" style={{ marginRight: '8px' }}></i>
                Politics
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Political discussions and current events</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/7'} 
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
                <i className="fas fa-briefcase" style={{ marginRight: '8px' }}></i>
                Business
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Career advice and business discussions</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/8'} 
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
                <i className="fas fa-laptop" style={{ marginRight: '8px' }}></i>
                Technology
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Tech discussions and programming</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/9'} 
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
                <i className="fas fa-film" style={{ marginRight: '8px' }}></i>
                Entertainment
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Movies, TV shows, music, and pop culture</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/10'} 
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
                <i className="fas fa-utensils" style={{ marginRight: '8px' }}></i>
                Food & Dining
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Restaurant recommendations and food discussions</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/11'} 
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
                <i className="fas fa-home" style={{ marginRight: '8px' }}></i>
                Real Estate
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Houston area real estate and housing</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/12'} 
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
                <i className="fas fa-shopping-cart" style={{ marginRight: '8px' }}></i>
                Classifieds
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Buy, sell, and trade with fellow Coogs</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/13'} 
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
                <i className="fas fa-star" style={{ marginRight: '8px' }}></i>
                Premium Lounge
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Exclusive content for premium members</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/14'} 
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
                <i className="fas fa-calendar" style={{ marginRight: '8px' }}></i>
                Game Day Central
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Live game discussions and watch parties</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/15'} 
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
                <i className="fas fa-graduation-cap" style={{ marginRight: '8px' }}></i>
                Alumni Network
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Connect with fellow UH graduates</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/25'} 
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
                <i className="fas fa-medal" style={{ marginRight: '8px' }}></i>
                UH Hall of Fame
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Celebrating famous UH alumni and athletes</div>
              </div>
              <div 
                onClick={() => window.location.href = '/forums/categories/46'} 
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
                <i className="fas fa-handshake" style={{ marginRight: '8px' }}></i>
                Professional Networking
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>Job opportunities and career connections</div>
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
              e.currentTarget.style.zIndex = '1000';
              const dropdown = e.currentTarget.querySelector('.sports-dropdown') as HTMLElement;
              if (dropdown) {
                dropdown.style.opacity = '1';
                dropdown.style.visibility = 'visible';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
              e.currentTarget.style.zIndex = 'auto';
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
            <h4 style={{ color: '#a00000', margin: '0 0 10px 0' }}>CoogsNation Community<br/>Connect, Share, and Grow with Fellow Houston Cougars</h4>
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
                zIndex: '1000',
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
              e.currentTarget.style.zIndex = '1000';
              const dropdown = e.currentTarget.querySelector('.community-dropdown') as HTMLElement;
              if (dropdown) {
                dropdown.style.opacity = '1';
                dropdown.style.visibility = 'visible';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
              e.currentTarget.style.zIndex = 'auto';
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
            <h4 style={{ color: '#a00000', margin: '0 0 10px 0' }}>CoogsNation Community<br/>Connect, Share, and Grow with Fellow Houston Cougars</h4>
            <p style={{ margin: 0, fontSize: '0.9em' }}>Coog Paws Chat, Water Cooler Talk, and community resources</p>
            
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
                zIndex: '1000',
                textAlign: 'left'
              }}
            >
              <div 
                onClick={() => window.location.href = '/coogpaws-chat'} 
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
                <i className="fas fa-heart" style={{ marginRight: '8px' }}></i>
                Coog Paws Chat
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
                  (e.target as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.target as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  (e.target as HTMLElement).style.color = 'black';
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
                  (e.target as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.target as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  (e.target as HTMLElement).style.color = 'black';
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
                  (e.target as HTMLElement).style.backgroundColor = '#fef2f2';
                  (e.target as HTMLElement).style.color = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  (e.target as HTMLElement).style.color = 'black';
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
      
      </div> {/* Close content wrapper */}
    </div>
  );
}