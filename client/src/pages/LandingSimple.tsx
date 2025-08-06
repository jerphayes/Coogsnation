export default function Landing() {
  return (
    <div 
      dangerouslySetInnerHTML={{
        __html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CoogsNation.com</title>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background-color: #fff;
      color: #111;
      text-align: center;
    }

    .top-logo {
      margin-top: 20px;
    }

    .top-logo img {
      width: 250px;
    }

    .nav-bar {
      margin-top: 10px;
      margin-bottom: 20px;
      padding: 10px 0;
      border-bottom: 2px solid #ccc;
      font-size: 1.1em;
    }

    .nav-bar a {
      margin: 0 15px;
      text-decoration: none;
      font-weight: bold;
      color: #000;
    }

    .banner-container {
      margin: 30px 0;
      display: flex;
      justify-content: center;
    }

    .main-banner {
      max-width: 500px;
      width: 90%;
      height: auto;
    }

    .hero p {
      font-size: 1.1em;
      margin: 20px auto;
      max-width: 600px;
    }

    .hero button {
      margin-top: 15px;
      padding: 12px 25px;
      font-size: 1em;
      background-color: #a00000;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }
  </style>
</head>
<body>

  <!-- UH Logo Centered -->
  <div class="top-logo">
    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2e/University_of_Houston_logo.svg" alt="UH Logo">
  </div>

  <!-- Navigation Menu -->
  <div class="nav-bar">
    <a href="/home">Home</a>
    <a href="/forums">Forums</a>
    <a href="/members">Members</a>
    <a href="/api/login">Log In</a>
    <a href="/api/login">Sign Up</a>
  </div>

  <!-- Hero Section -->
  <div class="hero">
    <div class="banner-container">
      <img src="/attached_assets/file_00000000ed946246b26194ea80eb5e3a_conversation_id=67fb526f-75cc-8001-93e0-7b286caca06c&message_id=f5151dca-9d4a-4d7c-acf1-5e125d01acfb_1754449989402.png" alt="Whose House? Coogs House! Banner" class="main-banner">
    </div>
    <p>Welcome to CoogsNation.com — the online community for University of Houston fans.</p>
    <button onclick="window.location.href='/api/login'">Get Started</button>
  </div>

</body>
</html>
        `
      }}
    />
  );
}