export default function Landing() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`
        body {
          font-family: 'Roboto', sans-serif;
          margin: 0;
          background-color: #fff;
          color: #222;
        }
        .landing-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background-color: #fff;
          border-bottom: 2px solid #ccc;
        }
        .landing-header img.logo {
          height: 60px;
        }
        .landing-nav a {
          margin-left: 1.5rem;
          text-decoration: none;
          color: #222;
          font-weight: bold;
        }
        .landing-hero {
          text-align: center;
          padding: 3rem 1rem;
        }
        .landing-hero img {
          width: 200px;
        }
        .landing-hero h1 {
          font-size: 2.5rem;
          margin: 1rem 0 0.5rem;
          color: #a00000;
        }
        .landing-hero h2 {
          font-size: 2.2rem;
          margin: 0;
          color: #a00000;
        }
        .landing-hero p {
          font-size: 1.2rem;
          margin-top: 1rem;
        }
        .landing-hero button {
          margin-top: 1.5rem;
          padding: 0.75rem 2rem;
          font-size: 1rem;
          color: white;
          background-color: #a00000;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        .landing-section {
          padding: 2rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-around;
          background-color: #f9f9f9;
        }
        .landing-card {
          margin: 1rem;
          flex: 1 1 300px;
          background-color: white;
          border: 1px solid #ccc;
          padding: 1rem;
          border-radius: 8px;
        }
        .landing-card h3 {
          margin-top: 0;
          color: #a00000;
        }
        .landing-footer {
          background-color: #222;
          color: white;
          padding: 2rem;
          text-align: center;
        }
        .footer-content {
          display: flex;
          justify-content: space-around;
          flex-wrap: wrap;
          margin-bottom: 2rem;
        }
        .footer-section {
          min-width: 200px;
          margin: 1rem;
        }
        .footer-section h4 {
          margin-bottom: 1rem;
        }
        .footer-section ul {
          list-style: none;
          padding: 0;
          color: #ccc;
        }
        .footer-section li {
          margin-bottom: 0.5rem;
        }
        .footer-bottom {
          border-top: 1px solid #444;
          padding-top: 1rem;
          color: #ccc;
        }
        .cta-section {
          text-align: center;
          padding: 3rem;
          background-color: #a00000;
          color: white;
        }
        .cta-section h2 {
          margin-bottom: 1rem;
        }
        .cta-section button {
          background: white;
          color: #a00000;
          padding: 1rem 2rem;
          border: none;
          border-radius: 5px;
          font-weight: bold;
          cursor: pointer;
          margin-top: 1rem;
        }
      `}</style>

      {/* Header */}
      <header className="landing-header">
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/2/2e/University_of_Houston_logo.svg" 
          alt="UH Logo" 
          className="logo" 
        />
        <nav className="landing-nav">
          <a href="/api/login">Login</a>
          <a href="/forums">Forums</a>
          <a href="/news">News</a>
          <a href="/event-management">Events</a>
          <a href="/store">Store</a>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="landing-hero">
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/2/2e/University_of_Houston_logo.svg" 
          alt="CoogsNation Logo" 
        />
        <h1>Welcome to</h1>
        <h2>CoogsNation.com</h2>
        <p>The Premier Online Community for Houston Cougar Fans, Students, and Alumni</p>
        <button onClick={() => window.location.href = '/api/login'}>
          Join the Pack 🐾
        </button>
      </div>

      {/* Features Section */}
      <div className="landing-section">
        <div className="landing-card">
          <h3>🏈 Dynamic Forums</h3>
          <p>Join discussions on football, basketball, academics, and campus life with fellow Coogs.</p>
          <ul>
            <li>Sports Discussion</li>
            <li>Academic Forums</li>
            <li>Water Cooler Talk</li>
            <li>Coog Paws Chat</li>
            <li>UH Hall of Fame</li>
          </ul>
        </div>

        <div className="landing-card">
          <h3>📰 Latest News</h3>
          <p>Stay updated with the latest Houston Cougars news, game results, and campus events.</p>
          <ul>
            <li>Breaking News</li>
            <li>Game Coverage</li>
            <li>Recruiting Updates</li>
            <li>Campus Events</li>
          </ul>
        </div>

        <div className="landing-card">
          <h3>📅 Community Events</h3>
          <p>Discover and attend meetups, watch parties, and exclusive community gatherings.</p>
          <ul>
            <li>Watch Parties</li>
            <li>Alumni Meetups</li>
            <li>Tailgate Events</li>
            <li>Study Groups</li>
          </ul>
        </div>

        <div className="landing-card">
          <h3>🛍️ Coogs Store</h3>
          <p>Show your Houston pride with exclusive merchandise and official gear.</p>
          <ul>
            <li>Apparel & Gear</li>
            <li>Hats & Accessories</li>
            <li>Tech Accessories</li>
            <li>Unique Gifts</li>
          </ul>
        </div>

        <div className="landing-card">
          <h3>💬 Direct Messaging</h3>
          <p>Connect privately with fellow Coogs through our real-time messaging system.</p>
          <ul>
            <li>Private Chats</li>
            <li>Real-time Updates</li>
            <li>Group Messages</li>
            <li>Mobile Friendly</li>
          </ul>
        </div>

        <div className="landing-card">
          <h3>👤 Enhanced Profiles</h3>
          <p>Build your reputation with achievement badges and community recognition.</p>
          <ul>
            <li>Achievement Badges</li>
            <li>Activity Tracking</li>
            <li>Reputation System</li>
            <li>Privacy Controls</li>
          </ul>
        </div>
      </div>

      {/* Call to Action */}
      <div className="cta-section">
        <h2>Ready to Go Coogs?</h2>
        <p>Join thousands of Houston Cougar fans in the most active online community</p>
        <button onClick={() => window.location.href = '/api/login'}>
          Join CoogsNation Today
        </button>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          Free to join • Instant access • Go Coogs! 🐾
        </p>
      </div>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>CoogsNation</h4>
            <p style={{ color: '#ccc' }}>
              The premier online community for University of Houston fans, students, and alumni.
            </p>
          </div>
          <div className="footer-section">
            <h4>Community</h4>
            <ul>
              <li>Forums</li>
              <li>Events</li>
              <li>News</li>
              <li>Store</li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Connect</h4>
            <ul>
              <li>About UH</li>
              <li>Student Resources</li>
              <li>Alumni Network</li>
              <li>Contact Us</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 CoogsNation. Go Coogs! 🐾</p>
        </div>
      </footer>
    </div>
  );
}