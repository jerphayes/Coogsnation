import bannerImage from "@assets/file_00000000ed946246b26194ea80eb5e3a_conversation_id=67fb526f-75cc-8001-93e0-7b286caca06c&message_id=f5151dca-9d4a-4d7c-acf1-5e125d01acfb_1754449989402.png";
import { useEffect, useRef } from "react";

export default function Landing() {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Play growl sound once when component mounts
    const playGrowl = async () => {
      if (audioRef.current) {
        try {
          // Set max duration to 3 seconds
          audioRef.current.addEventListener('loadedmetadata', () => {
            if (audioRef.current && audioRef.current.duration > 3) {
              audioRef.current.addEventListener('timeupdate', () => {
                if (audioRef.current && audioRef.current.currentTime >= 3) {
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
              width: '95%',
              maxHeight: '680px',
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
          <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
            <div style={{
              fontSize: '2em',
              marginBottom: '10px'
            }}>💬</div>
            <h4 style={{ color: '#a00000', margin: '0 0 10px 0' }}>Forums</h4>
            <p style={{ margin: 0, fontSize: '0.9em' }}>Discuss Coogs sports, share news, and connect with fellow fans</p>
          </div>
          
          <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
            <div style={{
              fontSize: '2em',
              marginBottom: '10px'
            }}>🏆</div>
            <h4 style={{ color: '#a00000', margin: '0 0 10px 0' }}>Sports News</h4>
            <p style={{ margin: 0, fontSize: '0.9em' }}>Stay updated on Cougar athletics and Big 12 action</p>
          </div>
          
          <div style={{ textAlign: 'center', flex: '1', minWidth: '200px' }}>
            <div style={{
              fontSize: '2em',
              marginBottom: '10px'
            }}>👥</div>
            <h4 style={{ color: '#a00000', margin: '0 0 10px 0' }}>Community</h4>
            <p style={{ margin: 0, fontSize: '0.9em' }}>Join groups, make friends, and show your Cougar pride</p>
          </div>
        </div>
      </div>
    </div>
  );
}