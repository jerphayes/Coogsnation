import bannerImage from "@assets/file_00000000ed946246b26194ea80eb5e3a_conversation_id=67fb526f-75cc-8001-93e0-7b286caca06c&message_id=f5151dca-9d4a-4d7c-acf1-5e125d01acfb_1754449989402.png";

export default function Landing() {
  return (
    <div style={{
      margin: 0,
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#fff',
      color: '#111',
      textAlign: 'center'
    }}>
      {/* UH Logo Centered */}
      <div style={{ marginTop: '20px' }}>
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/2/2e/University_of_Houston_logo.svg" 
          alt="UH Logo"
          style={{ width: '250px' }}
        />
      </div>

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
              maxWidth: '500px',
              width: '90%',
              height: 'auto'
            }}
          />
        </div>
        <p style={{
          fontSize: '1.1em',
          margin: '20px auto',
          maxWidth: '600px'
        }}>Welcome to CoogsNation.com — the online community for University of Houston fans.</p>
        <button 
          onClick={() => window.location.href = '/api/login'}
          style={{
            marginTop: '15px',
            padding: '12px 25px',
            fontSize: '1em',
            backgroundColor: '#a00000',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >Get Started</button>
      </div>
    </div>
  );
}