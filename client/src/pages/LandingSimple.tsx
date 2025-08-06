export default function Landing() {
  return (
    <div style={{
      fontFamily: 'Roboto, Arial, sans-serif',
      margin: 0,
      padding: 0,
      backgroundColor: '#ffffff',
      color: '#222222',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        backgroundColor: '#ffffff',
        borderBottom: '3px solid #a00000',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/2/2e/University_of_Houston_logo.svg"
          alt="UH Logo"
          style={{ height: '60px' }}
        />
        <nav style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="/api/login" style={{
            textDecoration: 'none',
            color: '#222222',
            fontWeight: 'bold',
            fontSize: '16px',
            padding: '8px 12px',
            borderRadius: '4px',
            transition: 'all 0.3s ease'
          }}>Login</a>
          <a href="/forums" style={{
            textDecoration: 'none',
            color: '#222222',
            fontWeight: 'bold',
            fontSize: '16px',
            padding: '8px 12px',
            borderRadius: '4px'
          }}>Forums</a>
          <a href="/news" style={{
            textDecoration: 'none',
            color: '#222222',
            fontWeight: 'bold',
            fontSize: '16px',
            padding: '8px 12px',
            borderRadius: '4px'
          }}>News</a>
          <a href="/event-management" style={{
            textDecoration: 'none',
            color: '#222222',
            fontWeight: 'bold',
            fontSize: '16px',
            padding: '8px 12px',
            borderRadius: '4px'
          }}>Events</a>
          <a href="/store" style={{
            textDecoration: 'none',
            color: '#222222',
            fontWeight: 'bold',
            fontSize: '16px',
            padding: '8px 12px',
            borderRadius: '4px'
          }}>Store</a>
        </nav>
      </header>

      {/* Hero Section */}
      <div style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/2/2e/University_of_Houston_logo.svg"
          alt="CoogsNation Logo"
          style={{
            width: '200px',
            height: 'auto',
            margin: '0 auto 2rem auto',
            display: 'block'
          }}
        />
        <h1 style={{
          fontSize: '3rem',
          margin: '1rem 0 0.5rem',
          color: '#a00000',
          fontWeight: 'bold',
          textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
        }}>Welcome to</h1>
        <h2 style={{
          fontSize: '2.5rem',
          margin: '0 0 1rem 0',
          color: '#a00000',
          fontWeight: 'bold',
          textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
        }}>CoogsNation.com</h2>
        <p style={{
          fontSize: '1.3rem',
          margin: '1rem 0 2rem 0',
          color: '#333333',
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>The Premier Online Community for Houston Cougar Fans, Students, and Alumni</p>
        <button 
          onClick={() => window.location.href = '/api/login'}
          style={{
            marginTop: '1.5rem',
            padding: '1rem 2.5rem',
            fontSize: '1.1rem',
            color: 'white',
            backgroundColor: '#a00000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 8px rgba(160,0,0,0.3)'
          }}
        >Join the Pack 🐾</button>
      </div>

      {/* Features Section */}
      <div style={{
        padding: '4rem 2rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '2rem',
        backgroundColor: '#f8f9fa',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Feature Cards */}
        {[
          {
            emoji: '🏈',
            title: 'Dynamic Forums',
            description: 'Join discussions on football, basketball, academics, and campus life with fellow Coogs.',
            features: ['Sports Discussion', 'Academic Forums', 'Water Cooler Talk', 'Heartbeats Dating', 'UH Hall of Fame']
          },
          {
            emoji: '📰',
            title: 'Latest News',
            description: 'Stay updated with the latest Houston Cougars news, game results, and campus events.',
            features: ['Breaking News', 'Game Coverage', 'Recruiting Updates', 'Campus Events']
          },
          {
            emoji: '📅',
            title: 'Community Events',
            description: 'Discover and attend meetups, watch parties, and exclusive community gatherings.',
            features: ['Watch Parties', 'Alumni Meetups', 'Tailgate Events', 'Study Groups']
          },
          {
            emoji: '🛍️',
            title: 'Coogs Store',
            description: 'Show your Houston pride with exclusive merchandise and official gear.',
            features: ['Apparel & Gear', 'Hats & Accessories', 'Tech Accessories', 'Unique Gifts']
          },
          {
            emoji: '💬',
            title: 'Direct Messaging',
            description: 'Connect privately with fellow Coogs through our real-time messaging system.',
            features: ['Private Chats', 'Real-time Updates', 'Group Messages', 'Mobile Friendly']
          },
          {
            emoji: '👤',
            title: 'Enhanced Profiles',
            description: 'Build your reputation with achievement badges and community recognition.',
            features: ['Achievement Badges', 'Activity Tracking', 'Reputation System', 'Privacy Controls']
          }
        ].map((feature, index) => (
          <div key={index} style={{
            flex: '1 1 350px',
            maxWidth: '400px',
            backgroundColor: 'white',
            border: '2px solid #e9ecef',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              marginTop: 0,
              marginBottom: '1rem',
              color: '#a00000',
              fontSize: '1.4rem',
              fontWeight: 'bold'
            }}>{feature.emoji} {feature.title}</h3>
            <p style={{
              color: '#555555',
              fontSize: '1rem',
              lineHeight: '1.6',
              marginBottom: '1rem'
            }}>{feature.description}</p>
            <ul style={{
              margin: 0,
              paddingLeft: '1.2rem'
            }}>
              {feature.features.map((item, i) => (
                <li key={i} style={{
                  color: '#666666',
                  marginBottom: '0.5rem',
                  fontSize: '0.95rem'
                }}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Call to Action */}
      <div style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        background: 'linear-gradient(135deg, #a00000 0%, #800000 100%)',
        color: 'white',
        marginTop: '2rem'
      }}>
        <h2 style={{
          fontSize: '2.5rem',
          marginBottom: '1rem',
          fontWeight: 'bold'
        }}>Ready to Go Coogs?</h2>
        <p style={{
          fontSize: '1.2rem',
          marginBottom: '2rem',
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>Join thousands of Houston Cougar fans in the most active online community</p>
        <button 
          onClick={() => window.location.href = '/api/login'}
          style={{
            background: 'white',
            color: '#a00000',
            padding: '1.2rem 3rem',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '1.1rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
          }}
        >Join CoogsNation Today</button>
        <p style={{
          marginTop: '1.5rem',
          fontSize: '1rem',
          opacity: 0.9
        }}>Free to join • Instant access • Go Coogs! 🐾</p>
      </div>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#1a1a1a',
        color: 'white',
        padding: '3rem 2rem 2rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          marginBottom: '2rem',
          maxWidth: '1000px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <div style={{
            minWidth: '250px',
            margin: '1rem',
            textAlign: 'left'
          }}>
            <h4 style={{
              color: '#a00000',
              fontSize: '1.3rem',
              marginBottom: '1rem'
            }}>CoogsNation</h4>
            <p style={{
              color: '#cccccc',
              lineHeight: '1.6',
              fontSize: '1rem'
            }}>The premier online community for University of Houston fans, students, and alumni.</p>
          </div>
          <div style={{
            minWidth: '180px',
            margin: '1rem',
            textAlign: 'left'
          }}>
            <h4 style={{
              color: '#a00000',
              fontSize: '1.3rem',
              marginBottom: '1rem'
            }}>Community</h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              color: '#cccccc',
              lineHeight: '1.8'
            }}>
              <li style={{ marginBottom: '0.5rem' }}>Forums</li>
              <li style={{ marginBottom: '0.5rem' }}>Events</li>
              <li style={{ marginBottom: '0.5rem' }}>News</li>
              <li style={{ marginBottom: '0.5rem' }}>Store</li>
            </ul>
          </div>
          <div style={{
            minWidth: '180px',
            margin: '1rem',
            textAlign: 'left'
          }}>
            <h4 style={{
              color: '#a00000',
              fontSize: '1.3rem',
              marginBottom: '1rem'
            }}>Connect</h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              color: '#cccccc',
              lineHeight: '1.8'
            }}>
              <li style={{ marginBottom: '0.5rem' }}>About UH</li>
              <li style={{ marginBottom: '0.5rem' }}>Student Resources</li>
              <li style={{ marginBottom: '0.5rem' }}>Alumni Network</li>
              <li style={{ marginBottom: '0.5rem' }}>Contact Us</li>
            </ul>
          </div>
        </div>
        <div style={{
          borderTop: '2px solid #333333',
          paddingTop: '1.5rem',
          color: '#999999',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '1rem',
            margin: 0
          }}>&copy; 2025 CoogsNation. Go Coogs! 🐾</p>
        </div>
      </footer>
    </div>
  );
}