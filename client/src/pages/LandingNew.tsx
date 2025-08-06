import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <>
      <div dangerouslySetInnerHTML={{
        __html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>CoogsNation.com</title>
            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
            <style>
              body {
                font-family: 'Roboto', sans-serif;
                margin: 0;
                background-color: #fff;
                color: #222;
              }
              header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem 2rem;
                background-color: #fff;
                border-bottom: 2px solid #ccc;
              }
              header img.logo {
                height: 60px;
              }
              nav a {
                margin-left: 1.5rem;
                text-decoration: none;
                color: #222;
                font-weight: bold;
              }
              .hero {
                text-align: center;
                padding: 3rem 1rem;
              }
              .hero img {
                width: 200px;
              }
              .hero h1 {
                font-size: 2.5rem;
                margin: 1rem 0 0.5rem;
                color: #a00000;
              }
              .hero h2 {
                font-size: 2.2rem;
                margin: 0;
                color: #a00000;
              }
              .hero p {
                font-size: 1.2rem;
                margin-top: 1rem;
              }
              .hero button {
                margin-top: 1.5rem;
                padding: 0.75rem 2rem;
                font-size: 1rem;
                color: white;
                background-color: #a00000;
                border: none;
                border-radius: 5px;
                cursor: pointer;
              }
              .section {
                padding: 2rem;
                display: flex;
                flex-wrap: wrap;
                justify-content: space-around;
                background-color: #f9f9f9;
              }
              .card {
                margin: 1rem;
                flex: 1 1 300px;
                background-color: white;
                border: 1px solid #ccc;
                padding: 1rem;
                border-radius: 8px;
              }
              .card h3 {
                margin-top: 0;
                color: #a00000;
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
          </head>
          <body>
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

            <div style="text-align: center; padding: 3rem; background-color: #a00000; color: white;">
              <h2>Ready to Go Coogs?</h2>
              <p>Join thousands of Houston Cougar fans in the most active online community</p>
              <button onclick="window.location.href='/api/login'" style="background: white; color: #a00000; padding: 1rem 2rem; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">
                Join CoogsNation Today
              </button>
              <p style="margin-top: 1rem; font-size: 0.9rem;">Free to join • Instant access • Go Coogs! 🐾</p>
            </div>

            <footer style="background-color: #222; color: white; padding: 2rem; text-align: center;">
              <div style="display: flex; justify-content: space-around; flex-wrap: wrap; margin-bottom: 2rem;">
                <div style="min-width: 200px; margin: 1rem;">
                  <h4>CoogsNation</h4>
                  <p style="color: #ccc;">The premier online community for University of Houston fans, students, and alumni.</p>
                </div>
                <div style="min-width: 150px; margin: 1rem;">
                  <h4>Community</h4>
                  <ul style="list-style: none; padding: 0; color: #ccc;">
                    <li>Forums</li>
                    <li>Events</li>
                    <li>News</li>
                    <li>Store</li>
                  </ul>
                </div>
                <div style="min-width: 150px; margin: 1rem;">
                  <h4>Connect</h4>
                  <ul style="list-style: none; padding: 0; color: #ccc;">
                    <li>About UH</li>
                    <li>Student Resources</li>
                    <li>Alumni Network</li>
                    <li>Contact Us</li>
                  </ul>
                </div>
              </div>
              <div style="border-top: 1px solid #444; padding-top: 1rem; color: #ccc;">
                <p>&copy; 2025 CoogsNation. Go Coogs! 🐾</p>
              </div>
            </footer>
          </body>
          </html>
        `
      }} />
    </>
  );
}