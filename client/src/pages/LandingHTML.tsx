export default function Landing() {
  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100vh', 
        overflow: 'auto',
        fontFamily: 'Roboto, sans-serif',
        margin: 0,
        backgroundColor: '#fff',
        color: '#222'
      }}
      dangerouslySetInnerHTML={{
        __html: `
          <style>
            * {
              box-sizing: border-box;
            }
            html, body {
              font-family: 'Roboto', sans-serif !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #fff !important;
              color: #222 !important;
              line-height: 1.6;
            }
            header {
              display: flex !important;
              justify-content: space-between !important;
              align-items: center !important;
              padding: 1rem 2rem !important;
              background-color: #fff !important;
              border-bottom: 3px solid #a00000 !important;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
            }
            header img.logo {
              height: 60px !important;
            }
            nav a {
              margin-left: 1.5rem !important;
              text-decoration: none !important;
              color: #222 !important;
              font-weight: bold !important;
              font-size: 16px !important;
              padding: 8px 12px !important;
              border-radius: 4px !important;
              transition: all 0.3s ease !important;
            }
            nav a:hover {
              background-color: #a00000 !important;
              color: #fff !important;
            }
            .hero {
              text-align: center !important;
              padding: 4rem 2rem !important;
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
              min-height: 400px !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: center !important;
            }
            .hero img {
              width: 200px !important;
              height: auto !important;
              margin: 0 auto 2rem auto !important;
              display: block !important;
            }
            .hero h1 {
              font-size: 3rem !important;
              margin: 1rem 0 0.5rem !important;
              color: #a00000 !important;
              font-weight: bold !important;
              text-shadow: 1px 1px 2px rgba(0,0,0,0.1) !important;
            }
            .hero h2 {
              font-size: 2.5rem !important;
              margin: 0 0 1rem 0 !important;
              color: #a00000 !important;
              font-weight: bold !important;
              text-shadow: 1px 1px 2px rgba(0,0,0,0.1) !important;
            }
            .hero p {
              font-size: 1.3rem !important;
              margin: 1rem 0 2rem 0 !important;
              color: #333 !important;
              max-width: 600px !important;
              margin-left: auto !important;
              margin-right: auto !important;
            }
            .hero button {
              margin-top: 1.5rem !important;
              padding: 1rem 2.5rem !important;
              font-size: 1.1rem !important;
              color: white !important;
              background-color: #a00000 !important;
              border: none !important;
              border-radius: 8px !important;
              cursor: pointer !important;
              font-weight: bold !important;
              transition: all 0.3s ease !important;
              box-shadow: 0 4px 8px rgba(160,0,0,0.3) !important;
            }
            .hero button:hover {
              background-color: #800000 !important;
              transform: translateY(-2px) !important;
              box-shadow: 0 6px 12px rgba(160,0,0,0.4) !important;
            }
            .section {
              padding: 4rem 2rem !important;
              display: flex !important;
              flex-wrap: wrap !important;
              justify-content: center !important;
              gap: 2rem !important;
              background-color: #f8f9fa !important;
              max-width: 1200px !important;
              margin: 0 auto !important;
            }
            .card {
              flex: 1 1 350px !important;
              max-width: 400px !important;
              background-color: white !important;
              border: 2px solid #e9ecef !important;
              padding: 2rem !important;
              border-radius: 12px !important;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
              transition: all 0.3s ease !important;
            }
            .card:hover {
              transform: translateY(-4px) !important;
              box-shadow: 0 8px 20px rgba(0,0,0,0.15) !important;
              border-color: #a00000 !important;
            }
            .card h3 {
              margin-top: 0 !important;
              margin-bottom: 1rem !important;
              color: #a00000 !important;
              font-size: 1.4rem !important;
              font-weight: bold !important;
            }
            .card p {
              color: #555 !important;
              font-size: 1rem !important;
              line-height: 1.6 !important;
              margin-bottom: 1rem !important;
            }
            .card ul {
              margin: 0 !important;
              padding-left: 1.2rem !important;
            }
            .card li {
              color: #666 !important;
              margin-bottom: 0.5rem !important;
              font-size: 0.95rem !important;
            }
            .forum-table {
              width: 100%;
              border-collapse: collapse;
            }
            .forum-table th, .forum-table td {
              border: 1px solid #ddd;
              padding: 0.5rem;
              text-align: left;
            }
            .avatars img {
              width: 50px;
              height: 50px;
              border-radius: 50%;
              margin-right: 0.5rem;
            }
          </style>
          
          <header>
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2e/University_of_Houston_logo.svg" alt="UH Logo" class="logo" />
            <nav>
              <a href="/api/login">Login</a>
              <a href="/forums">Forums</a>
              <a href="/news">News</a>
              <a href="/event-management">Events</a>
              <a href="/store">Store</a>
            </nav>
          </header>

          <div class="hero">
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2e/University_of_Houston_logo.svg" alt="CoogsNation Logo" />
            <h1>Welcome to</h1>
            <h2>CoogsNation.com</h2>
            <p>The Premier Online Community for Houston Cougar Fans, Students, and Alumni</p>
            <button onclick="window.location.href='/api/login'">Join the Pack 🐾</button>
          </div>

          <div class="section">
            <div class="card">
              <h3>🏈 Dynamic Forums</h3>
              <p>Join discussions on football, basketball, academics, and campus life with fellow Coogs.</p>
              <ul>
                <li>Sports Discussion</li>
                <li>Academic Forums</li>
                <li>Water Cooler Talk</li>
                <li>Heartbeats Dating</li>
                <li>UH Hall of Fame</li>
              </ul>
            </div>

            <div class="card">
              <h3>📰 Latest News</h3>
              <p>Stay updated with the latest Houston Cougars news, game results, and campus events.</p>
              <ul>
                <li>Breaking News</li>
                <li>Game Coverage</li>
                <li>Recruiting Updates</li>
                <li>Campus Events</li>
              </ul>
            </div>

            <div class="card">
              <h3>📅 Community Events</h3>
              <p>Discover and attend meetups, watch parties, and exclusive community gatherings.</p>
              <ul>
                <li>Watch Parties</li>
                <li>Alumni Meetups</li>
                <li>Tailgate Events</li>
                <li>Study Groups</li>
              </ul>
            </div>

            <div class="card">
              <h3>🛍️ Coogs Store</h3>
              <p>Show your Houston pride with exclusive merchandise and official gear.</p>
              <ul>
                <li>Apparel & Gear</li>
                <li>Hats & Accessories</li>
                <li>Tech Accessories</li>
                <li>Unique Gifts</li>
              </ul>
            </div>

            <div class="card">
              <h3>💬 Direct Messaging</h3>
              <p>Connect privately with fellow Coogs through our real-time messaging system.</p>
              <ul>
                <li>Private Chats</li>
                <li>Real-time Updates</li>
                <li>Group Messages</li>
                <li>Mobile Friendly</li>
              </ul>
            </div>

            <div class="card">
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

          <div style="text-align: center; padding: 4rem 2rem; background: linear-gradient(135deg, #a00000 0%, #800000 100%); color: white; margin-top: 2rem;">
            <h2 style="font-size: 2.5rem; margin-bottom: 1rem; font-weight: bold;">Ready to Go Coogs?</h2>
            <p style="font-size: 1.2rem; margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto;">Join thousands of Houston Cougar fans in the most active online community</p>
            <button onclick="window.location.href='/api/login'" style="background: white; color: #a00000; padding: 1.2rem 3rem; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1.1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'">
              Join CoogsNation Today
            </button>
            <p style="margin-top: 1.5rem; font-size: 1rem; opacity: 0.9;">Free to join • Instant access • Go Coogs! 🐾</p>
          </div>

          <footer style="background-color: #1a1a1a; color: white; padding: 3rem 2rem 2rem 2rem; text-align: center;">
            <div style="display: flex; justify-content: space-around; flex-wrap: wrap; margin-bottom: 2rem; max-width: 1000px; margin-left: auto; margin-right: auto;">
              <div style="min-width: 250px; margin: 1rem; text-align: left;">
                <h4 style="color: #a00000; font-size: 1.3rem; margin-bottom: 1rem;">CoogsNation</h4>
                <p style="color: #ccc; line-height: 1.6; font-size: 1rem;">The premier online community for University of Houston fans, students, and alumni.</p>
              </div>
              <div style="min-width: 180px; margin: 1rem; text-align: left;">
                <h4 style="color: #a00000; font-size: 1.3rem; margin-bottom: 1rem;">Community</h4>
                <ul style="list-style: none; padding: 0; color: #ccc; line-height: 1.8;">
                  <li style="margin-bottom: 0.5rem;">Forums</li>
                  <li style="margin-bottom: 0.5rem;">Events</li>
                  <li style="margin-bottom: 0.5rem;">News</li>
                  <li style="margin-bottom: 0.5rem;">Store</li>
                </ul>
              </div>
              <div style="min-width: 180px; margin: 1rem; text-align: left;">
                <h4 style="color: #a00000; font-size: 1.3rem; margin-bottom: 1rem;">Connect</h4>
                <ul style="list-style: none; padding: 0; color: #ccc; line-height: 1.8;">
                  <li style="margin-bottom: 0.5rem;">About UH</li>
                  <li style="margin-bottom: 0.5rem;">Student Resources</li>
                  <li style="margin-bottom: 0.5rem;">Alumni Network</li>
                  <li style="margin-bottom: 0.5rem;">Contact Us</li>
                </ul>
              </div>
            </div>
            <div style="border-top: 2px solid #333; padding-top: 1.5rem; color: #999; text-align: center;">
              <p style="font-size: 1rem; margin: 0;">&copy; 2025 CoogsNation. Go Coogs! 🐾</p>
            </div>
          </footer>
        `
      }}
    />
  );
}